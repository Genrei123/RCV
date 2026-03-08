// =========================================================================
// LOCAL FUZZY SEARCH SERVICE - Offline OCR product matching
// =========================================================================
// Dart port of the server-side FuzzySearchService (fuzzySearchService.ts).
// Runs entirely on-device against the local SQLite product database.
//
// This eliminates the network round-trip that was making scanning slow.
//
// Algorithm summary:
//   1. Extract CFPR / LTO codes from OCR text using regex patterns
//   2. Normalize OCR character errors (I↔1, O↔0, S↔5, etc.)
//   3. Score every local product using Levenshtein similarity on codes,
//      product name word overlap, brand name, and company name
//   4. Return the best match above a score threshold
//
// Reporting, compliance records, and scan history still go to the server.
// =========================================================================

import 'dart:developer' as developer;
import 'dart:math' as math;
import '../models/local_product.dart';
import 'local_product_database.dart';

// =========================================================================
// SEARCH RESULT MODEL
// =========================================================================

class LocalSearchResult {
  final LocalProduct? product;
  final Map<String, dynamic> searchDetails;
  final List<String> warnings;

  const LocalSearchResult({
    this.product,
    required this.searchDetails,
    this.warnings = const [],
  });
}

/// Result of packaging compliance validation
class PackagingValidation {
  final bool valid;
  final List<String> missingFields;
  final String confidence; // 'high', 'medium', 'low'
  final List<String> warnings;

  const PackagingValidation({
    required this.valid,
    this.missingFields = const [],
    required this.confidence,
    this.warnings = const [],
  });
}

// =========================================================================
// LOCAL FUZZY SEARCH SERVICE
// =========================================================================

class LocalFuzzySearchService {
  // Cached products (refreshed on sync)
  static List<LocalProduct> _cachedProducts = [];
  static DateTime? _cacheLoadedAt;
  static const Duration _cacheMaxAge = Duration(minutes: 30);

  // Learned prefix patterns
  static List<String> _cfprPrefixes = ['CFPR', 'FR', 'IM', 'DFI'];
  static List<String> _ltoPrefixes = ['LTO', 'DR'];
  static RegExp? _cfprPattern;
  static RegExp? _ltoPattern;

  // Normalized code cache:  "CFPR:<normalized>" -> LocalProduct
  static final Map<String, LocalProduct> _codeCache = {};

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /// Load products from local DB and build lookup caches.
  /// Call on app start and after each sync.
  static Future<void> initialize() async {
    try {
      final db = LocalProductDatabase.instance;
      _cachedProducts = await db.getAllProducts();
      _cacheLoadedAt = DateTime.now();

      if (_cachedProducts.isEmpty) {
        developer.log(
          '⚠️ [LocalFuzzy] No products in local DB — sync needed',
        );
        return;
      }

      // Learn prefixes from actual data
      final cfprNumbers = _cachedProducts
          .where((p) => p.cfprNumber != null)
          .map((p) => p.cfprNumber!.toUpperCase().trim())
          .toList();
      final ltoNumbers = _cachedProducts
          .where((p) => p.ltoNumber != null)
          .map((p) => p.ltoNumber!.toUpperCase().trim())
          .toList();

      _cfprPrefixes = _extractPrefixes(cfprNumbers);
      _ltoPrefixes = _extractPrefixes(ltoNumbers);
      _cfprPattern = _generatePattern(_cfprPrefixes);
      _ltoPattern = _generatePattern(_ltoPrefixes);

      // Build code → product cache
      _codeCache.clear();
      for (final product in _cachedProducts) {
        if (product.cfprNumber != null) {
          final norm = _normalizeOCR(
            product.cfprNumber!.replaceAll(RegExp(r'[-\s]'), '').toUpperCase(),
          );
          _codeCache['CFPR:$norm'] = product;
        }
        if (product.ltoNumber != null) {
          final norm = _normalizeOCR(
            product.ltoNumber!.replaceAll(RegExp(r'[-\s]'), '').toUpperCase(),
          );
          _codeCache['LTO:$norm'] = product;
        }
      }

      developer.log(
        '✅ [LocalFuzzy] Initialized with ${_cachedProducts.length} products, '
        '${_codeCache.length} cached codes',
      );
    } catch (e, st) {
      developer.log('❌ [LocalFuzzy] Init failed', error: e, stackTrace: st);
    }
  }

  /// Ensure cache is loaded and not stale
  static Future<void> _ensureInitialized() async {
    if (_cachedProducts.isEmpty || _cacheLoadedAt == null) {
      await initialize();
      return;
    }
    if (DateTime.now().difference(_cacheLoadedAt!) > _cacheMaxAge) {
      await initialize();
    }
  }

  /// Number of products available for local search
  static int get productCount => _cachedProducts.length;

  /// Whether we have any products to search
  static bool get isReady => _cachedProducts.isNotEmpty;

  // =========================================================================
  // PATTERN LEARNING  (mirrors TS extractPrefixes / generatePattern)
  // =========================================================================

  static List<String> _extractPrefixes(List<String> codes) {
    final prefixes = <String>{};
    final re = RegExp(r'^([A-Z]+)');
    for (final code in codes) {
      final m = re.firstMatch(code);
      if (m != null) {
        prefixes.add(m.group(1)!);
      }
    }
    final list = prefixes.toList()..sort();
    return list.isEmpty ? ['CFPR', 'FR'] : list;
  }

  static RegExp? _generatePattern(List<String> prefixes) {
    if (prefixes.isEmpty) return null;
    final group = prefixes.join('|');
    return RegExp('(?:$group)[-\\s]?[A-Z0-9]{2,}', caseSensitive: false);
  }

  // =========================================================================
  // OCR NORMALIZATION  (mirrors TS normalizeOCRCharacters)
  // =========================================================================

  static String _normalizeOCR(String text) {
    var n = text.toUpperCase();
    n = n
        .replaceAll(RegExp(r'[I|l!]'), '1')
        .replaceAll(RegExp(r'[O]'), '0')
        .replaceAll(RegExp(r'[S$]'), '5')
        .replaceAll(RegExp(r'[Z]'), '2')
        .replaceAll(RegExp(r'[B]'), '8')
        .replaceAll(RegExp(r'[G]'), '6')
        .replaceAll(RegExp(r'[T]'), '7')
        .replaceAll(RegExp(r'[A@]'), 'A')
        .replaceAll(RegExp(r'[E€3]'), 'E')
        .replaceAll(RegExp(r'[^A-Z0-9]'), '');
    return n;
  }

  // =========================================================================
  // LEVENSHTEIN DISTANCE & SIMILARITY  (mirrors TS)
  // =========================================================================

  static int _levenshtein(String s1, String s2) {
    final m = s1.length;
    final n = s2.length;
    final dp = List.generate(m + 1, (_) => List.filled(n + 1, 0));
    for (var i = 0; i <= m; i++) dp[i][0] = i;
    for (var j = 0; j <= n; j++) dp[0][j] = j;
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (s1[i - 1] == s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 +
              [dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]]
                  .reduce(math.min);
        }
      }
    }
    return dp[m][n];
  }

  static double _similarity(String a, String b) {
    if (a.isEmpty || b.isEmpty) return 0;
    final na = _normalizeOCR(a);
    final nb = _normalizeOCR(b);
    if (na == nb) return 1.0;
    final dist = _levenshtein(na, nb);
    final maxLen = math.max(na.length, nb.length);
    if (maxLen == 0) return 1.0;
    return 1.0 - (dist / maxLen);
  }

  static bool _isSimilarCode(String ocrCode, String dbCode,
      [double threshold = 0.65]) {
    return _similarity(ocrCode, dbCode) >= threshold;
  }

  // =========================================================================
  // TEXT EXTRACTION  (mirrors TS)
  // =========================================================================

  static String _cleanText(String text) {
    return text
        .replaceAll(RegExp(r'[^a-zA-Z0-9\s-]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Extract CFPR number from OCR text
  static String? _extractCFPR(String text) {
    final upper = text.toUpperCase();

    // Fallback patterns (most reliable)
    final fallbackPatterns = [
      RegExp(r'\b([A-Z]{2,4})-(\d{2})-(\d{4,})\b'),
      RegExp(r'\b([A-Z]{2,4})-(\d{3,})\b'),
      RegExp(r'\b([A-Z]{2,4})[\s-]?(\d{3,})\b'),
    ];

    for (final pattern in fallbackPatterns) {
      final match = pattern.firstMatch(upper);
      if (match != null) {
        final cleaned =
            match.group(0)!.replaceAll(RegExp(r'\s+'), '-').toUpperCase();
        developer.log('[LocalFuzzy] CFPR extracted via fallback: $cleaned');
        return cleaned;
      }
    }

    // Learned patterns
    if (_cfprPattern != null) {
      final normalized = _normalizeOCR(text);
      var match = _cfprPattern!.firstMatch(normalized);
      if (match != null) {
        return match.group(0)!.replaceAll(RegExp(r'\s+'), '-').toUpperCase();
      }
      match = _cfprPattern!.firstMatch(text);
      if (match != null) {
        return match.group(0)!.replaceAll(RegExp(r'\s+'), '-').toUpperCase();
      }
    }

    return null;
  }

  /// Extract LTO number from OCR text
  static String? _extractLTO(String text) {
    if (_ltoPattern == null) return null;

    final normalized = _normalizeOCR(text);
    var match = _ltoPattern!.firstMatch(normalized);
    if (match != null) {
      return match.group(0)!.replaceAll(RegExp(r'\s+'), '-').toUpperCase();
    }
    match = _ltoPattern!.firstMatch(text);
    if (match != null) {
      return match.group(0)!.replaceAll(RegExp(r'\s+'), '-').toUpperCase();
    }
    return null;
  }

  /// Extract potential code fragments from OCR text
  static List<String> _extractPotentialCodes(String text) {
    final codeRe = RegExp(r'[a-zA-Z]{0,4}[-\s]?[0-9]{3,}[-\s]?[a-zA-Z0-9]*',
        caseSensitive: false);
    final hyphenated =
        RegExp(r'[a-zA-Z0-9]+-[a-zA-Z0-9-]+', caseSensitive: false);
    final matches = codeRe.allMatches(text).map((m) => m.group(0)!).toList();
    final hMatches =
        hyphenated.allMatches(text).map((m) => m.group(0)!).toList();
    final words = text.split(RegExp(r'\s+'))
        .where((w) => w.length > 4 && RegExp(r'[0-9]').hasMatch(w))
        .toList();
    final all = {...matches, ...hMatches, ...words}
        .map((c) => c.trim())
        .where((c) => c.length > 3)
        .toList();
    return all;
  }

  /// Extract keyword fragments for name matching
  static List<String> _extractKeywords(String text) {
    final cleaned = _cleanText(text);
    const filler = {
      'with', 'from', 'that', 'this', 'have', 'been', 'more', 'your',
      'date', 'best', 'before', 'after', 'made', 'label', 'front', 'back',
      'product', 'ingredients', 'contains',
    };
    final words = cleaned
        .split(RegExp(r'\s+'))
        .where((w) => w.length >= 4)
        .where((w) => !filler.contains(w.toLowerCase()))
        .map((w) => w.toLowerCase())
        .toSet()
        .toList();
    return words;
  }

  // =========================================================================
  // PACKAGING VALIDATION  (mirrors TS validateMatchAgainstOCR)
  // =========================================================================

  static PackagingValidation validateMatch(
      LocalProduct product, String ocrText) {
    final missingFields = <String>[];
    final warnings = <String>[];
    final upperText = ocrText.toUpperCase();
    bool cfprFound = false;
    bool ltoFound = false;
    bool productHasCFPR = false;
    bool productHasLTO = false;

    final potentialCodes = _extractPotentialCodes(ocrText);
    final extractedCFPR = _extractCFPR(ocrText);
    final extractedLTO = _extractLTO(ocrText);

    // --- CFPR validation ---
    if (product.cfprNumber != null && product.cfprNumber!.isNotEmpty) {
      productHasCFPR = true;

      if (extractedCFPR != null) {
        if (_similarity(extractedCFPR, product.cfprNumber!) >= 0.70) {
          cfprFound = true;
        }
      }
      if (!cfprFound) {
        for (final code in potentialCodes) {
          if (_similarity(code, product.cfprNumber!) >= 0.70) {
            cfprFound = true;
            break;
          }
        }
      }
      if (!cfprFound) {
        final normDB = _normalizeOCR(product.cfprNumber!);
        final normOCR = _normalizeOCR(upperText);
        if (normOCR.contains(normDB)) cfprFound = true;
      }
      if (!cfprFound) missingFields.add('CFPRNumber');
    } else {
      warnings.add(
          'Product is missing CFPR registration number – may be unregistered');
    }

    // --- LTO validation ---
    if (product.ltoNumber != null && product.ltoNumber!.isNotEmpty) {
      productHasLTO = true;

      if (extractedLTO != null) {
        if (_similarity(extractedLTO, product.ltoNumber!) >= 0.70) {
          ltoFound = true;
        }
      }
      if (!ltoFound) {
        for (final code in potentialCodes) {
          if (_similarity(code, product.ltoNumber!) >= 0.70) {
            ltoFound = true;
            break;
          }
        }
      }
      if (!ltoFound) {
        final normDB = _normalizeOCR(product.ltoNumber!);
        final normOCR = _normalizeOCR(upperText);
        if (normOCR.contains(normDB)) ltoFound = true;
      }
      if (!ltoFound) missingFields.add('LTONumber');
    } else {
      warnings.add('Product is missing LTO number');
    }

    // Determine confidence
    String confidence;
    if (cfprFound && ltoFound) {
      confidence = 'high';
    } else if (cfprFound || ltoFound) {
      confidence = 'medium';
    } else if (!productHasCFPR && !productHasLTO) {
      confidence = 'low';
      warnings.add('Product identified by name only – no codes to verify');
    } else {
      confidence = 'low';
      warnings.add('Product identified but registration codes not found in OCR');
    }

    return PackagingValidation(
      valid: true, // We always accept the identification; compliance is separate
      missingFields: missingFields,
      confidence: confidence,
      warnings: warnings,
    );
  }

  // =========================================================================
  // MAIN SEARCH  (mirrors TS searchProductsFuzzy)
  // =========================================================================

  /// Perform the full fuzzy search locally.
  /// Returns the best matching product (or null) with details.
  static Future<LocalSearchResult> searchProductsFuzzy(String ocrText) async {
    await _ensureInitialized();

    if (_cachedProducts.isEmpty) {
      return const LocalSearchResult(
        searchDetails: {
          'matchType': 'none',
          'reason': 'Local product database is empty – sync required',
        },
      );
    }

    final potentialCodes = _extractPotentialCodes(ocrText);
    final keywords = _extractKeywords(ocrText);
    final extractedCFPR = _extractCFPR(ocrText);
    final extractedLTO = _extractLTO(ocrText);

    developer.log(
      '[LocalFuzzy] CFPR: ${extractedCFPR ?? "none"}, '
      'LTO: ${extractedLTO ?? "none"}, '
      'keywords: ${keywords.take(5).join(", ")}',
    );

    // ------------------------------------------------------------------
    // FAST PATH: exact / fuzzy CFPR cache lookup
    // ------------------------------------------------------------------
    if (extractedCFPR != null) {
      final normalized = _normalizeOCR(extractedCFPR);

      // Exact cache hit
      final cached = _codeCache['CFPR:$normalized'];
      if (cached != null) {
        developer.log('[LocalFuzzy] ✅ CFPR cache hit: ${cached.productName}');
        final v = validateMatch(cached, ocrText);
        return LocalSearchResult(
          product: cached,
          searchDetails: {
            'matchType': 'cfpr-cache',
            'matchedOn': extractedCFPR,
            'confidence': 'high',
          },
          warnings: v.warnings,
        );
      }

      // Fuzzy cache scan
      for (final entry in _codeCache.entries) {
        if (entry.key.startsWith('CFPR:')) {
          final dbCFPR = entry.key.substring(5);
          if (_isSimilarCode(normalized, dbCFPR, 0.70)) {
            developer.log(
              '[LocalFuzzy] ✅ CFPR fuzzy hit: ${entry.value.productName}',
            );
            final v = validateMatch(entry.value, ocrText);
            return LocalSearchResult(
              product: entry.value,
              searchDetails: {
                'matchType': 'cfpr-fuzzy-cache',
                'matchedOn': extractedCFPR,
                'confidence': 'high',
              },
              warnings: v.warnings,
            );
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // COMPREHENSIVE SCORING  (same weights as TS)
    // ------------------------------------------------------------------
    LocalProduct? bestMatch;
    int bestScore = 0;
    Map<String, dynamic> matchDetails = {};

    final ocrUpper = ocrText.toUpperCase();

    for (final product in _cachedProducts) {
      int score = 0;
      final reasons = <String>[];

      // === CFPR ===
      if (product.cfprNumber != null && extractedCFPR != null) {
        final sim = _similarity(extractedCFPR, product.cfprNumber!);
        if (sim >= 0.95) {
          score += 1000;
          reasons.add('CFPR exact (${(sim * 100).toStringAsFixed(0)}%)');
        } else if (sim >= 0.70) {
          score += (500 * sim).round();
          reasons.add('CFPR similar (${(sim * 100).toStringAsFixed(0)}%)');
        } else if (sim >= 0.50) {
          score += (200 * sim).round();
          reasons.add('CFPR partial (${(sim * 100).toStringAsFixed(0)}%)');
        }
      }

      // === LTO ===
      if (product.ltoNumber != null && extractedLTO != null) {
        final sim = _similarity(extractedLTO, product.ltoNumber!);
        if (sim >= 0.95) {
          score += 200;
          reasons.add('LTO exact (${(sim * 100).toStringAsFixed(0)}%)');
        } else if (sim >= 0.70) {
          score += (100 * sim).round();
          reasons.add('LTO similar (${(sim * 100).toStringAsFixed(0)}%)');
        }
      }

      // === PRODUCT NAME ===
      final nameUpper = product.productName.toUpperCase();
      final nameWords =
          nameUpper.split(RegExp(r'\s+')).where((w) => w.length >= 3).toList();
      int nameHits = 0;
      for (final w in nameWords) {
        if (ocrUpper.contains(w)) nameHits++;
      }
      if (nameWords.isNotEmpty) {
        final ratio = nameHits / nameWords.length;
        if (ratio >= 0.8) {
          score += 150;
          reasons.add('Name strong (${nameHits}/${nameWords.length} words)');
        } else if (ratio >= 0.5) {
          score += 80;
          reasons.add('Name partial (${nameHits}/${nameWords.length} words)');
        } else if (nameHits >= 2) {
          score += 40;
          reasons.add('Name $nameHits words');
        }
      }
      if (ocrUpper.contains(nameUpper)) {
        score += 100;
        reasons.add('Name substring');
      }

      // === BRAND ===
      if (product.brandName != null) {
        final brandUpper = product.brandName!.toUpperCase();
        if (ocrUpper.contains(brandUpper)) {
          score += 50;
          reasons.add('Brand "${product.brandName}" found');
        }
      }

      // === COMPANY ===
      if (product.companyName != null) {
        final companyUpper = product.companyName!.toUpperCase();
        final companyWords = companyUpper
            .split(RegExp(r'\s+'))
            .where((w) => w.length >= 4)
            .toList();
        for (final w in companyWords) {
          if (ocrUpper.contains(w)) {
            score += 20;
            reasons.add('Company word "$w"');
            break;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
        matchDetails = {
          'score': score,
          'reasons': reasons,
          'cfprMatch': extractedCFPR != null && product.cfprNumber != null
              ? _similarity(extractedCFPR, product.cfprNumber!)
              : 0.0,
          'ltoMatch': extractedLTO != null && product.ltoNumber != null
              ? _similarity(extractedLTO, product.ltoNumber!)
              : 0.0,
        };
      }
    }

    // ------------------------------------------------------------------
    // RETURN BEST MATCH (threshold: 50 points minimum)
    // ------------------------------------------------------------------
    if (bestMatch != null && bestScore >= 50) {
      developer.log(
        '[LocalFuzzy] ✅ Best: ${bestMatch.productName} '
        '(score=$bestScore, ${(matchDetails["reasons"] as List).join(", ")})',
      );

      final validation = validateMatch(bestMatch, ocrText);

      String confidence;
      if (bestScore >= 500) {
        confidence = 'high';
      } else if (bestScore >= 150) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      return LocalSearchResult(
        product: bestMatch,
        searchDetails: {
          'matchType': 'comprehensive-fuzzy',
          'matchedOn':
              (matchDetails['reasons'] as List<String>?)?.join(', ') ?? '',
          'confidence': confidence,
          'score': bestScore,
          ...matchDetails,
        },
        warnings: validation.warnings,
      );
    }

    developer.log('[LocalFuzzy] ❌ No match (bestScore=$bestScore)');
    return LocalSearchResult(
      searchDetails: {
        'matchType': 'none',
        'extractedCFPR': extractedCFPR,
        'extractedLTO': extractedLTO,
        'searchedCodes': potentialCodes,
        'searchedKeywords': keywords.take(10).toList(),
        'bestScore': bestScore,
        'reason':
            bestScore > 0 ? 'Best match score too low' : 'No matching evidence',
      },
    );
  }

  // =========================================================================
  // COMPLIANCE CHECK  (same logic as Scan.ts verifyFieldInOCR)
  // =========================================================================

  /// Verify if a field value is present in OCR text (fuzzy)
  static bool verifyFieldInOCR(String? fieldValue, String ocrText) {
    if (fieldValue == null || fieldValue.isEmpty) return false;

    final normValue = _normalizeOCR(fieldValue);
    final normOCR = _normalizeOCR(ocrText);

    // Substring check
    if (normOCR.contains(normValue)) return true;

    // Fuzzy against potential codes
    final codePattern = RegExp(r'[A-Z0-9]{2,4}[-\s]?\d{2,}[-\s]?\d*',
        caseSensitive: false);
    for (final m in codePattern.allMatches(ocrText)) {
      if (_similarity(m.group(0)!, fieldValue) >= 0.70) return true;
    }

    // Sliding window chunks
    final words = ocrText.replaceAll(RegExp(r'\s+'), ' ').split(' ');
    final chunks = <String>[
      ...words.where((w) => w.length >= 5),
      for (int i = 0; i < words.length - 1; i++) words[i] + words[i + 1],
    ];
    for (final chunk in chunks) {
      if (_similarity(chunk, fieldValue) >= 0.70) return true;
    }

    return false;
  }

  /// Build the full compliance result map (mirrors Scan.ts scanProduct response)
  static Map<String, dynamic> buildComplianceResult(
    LocalProduct product,
    String ocrText, {
    String? frontImageUrl,
    String? backImageUrl,
    String? packageType,
  }) {
    final cfprOnPackaging = verifyFieldInOCR(product.cfprNumber, ocrText);
    final ltoOnPackaging = verifyFieldInOCR(product.ltoNumber, ocrText);

    final violations = <String>[];
    final complianceWarnings = <String>[];

    if (product.cfprNumber == null || product.cfprNumber!.isEmpty) {
      violations.add('CRITICAL: Product has NO CFPR in database (unregistered)');
    } else if (!cfprOnPackaging) {
      violations
          .add('CRITICAL: CFPR number NOT printed on packaging (illegal)');
    }

    if (product.ltoNumber == null || product.ltoNumber!.isEmpty) {
      complianceWarnings.add('Product has NO LTO in database');
    } else if (!ltoOnPackaging) {
      violations.add('WARNING: LTO number NOT printed on packaging');
    }

    final isCompliant = violations.isEmpty;

    return {
      'success': true,
      'found': true,
      'productIdentified': true,
      'isCompliant': isCompliant,
      'message': isCompliant
          ? 'Product identified – Packaging is compliant'
          : 'Product identified – Packaging has violations',
      'productInfo': {
        'productName': product.productName,
        'brandName': product.brandName,
        'manufacturer': product.companyName ?? 'Unknown',
        'CFPRNumber': product.cfprNumber,
        'LTONumber': product.ltoNumber,
        'certificateId': product.cfprNumber,
        'registrationNumber': product.cfprNumber,
        'dateOfRegistration': product.dateOfRegistration,
        'productCategory': product.productClassification,
        'productType': product.productSubClassification,
        'lotNumber': product.lotNumber,
        'companyId': product.companyId,
        'productId': product.id,
      },
      'packagingCompliance': {
        'cfpr': {
          'required': product.cfprNumber,
          'foundOnPackaging': cfprOnPackaging,
          'status': (product.cfprNumber == null || product.cfprNumber!.isEmpty)
              ? 'NOT_REGISTERED'
              : (cfprOnPackaging ? 'COMPLIANT' : 'VIOLATION'),
        },
        'lto': {
          'required': product.ltoNumber,
          'foundOnPackaging': ltoOnPackaging,
          'status': (product.ltoNumber == null || product.ltoNumber!.isEmpty)
              ? 'NOT_REGISTERED'
              : (ltoOnPackaging ? 'COMPLIANT' : 'VIOLATION'),
        },
      },
      if (violations.isNotEmpty) 'violations': violations,
      if (complianceWarnings.isNotEmpty) 'warnings': complianceWarnings,
      'rawOCRText': ocrText,
      'packageType': packageType,
      'frontImageUrl': frontImageUrl,
      'backImageUrl': backImageUrl,
      'source': 'local_fuzzy_search',
    };
  }
}
