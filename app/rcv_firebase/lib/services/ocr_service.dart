// =========================================================================
// OCR SERVICE - OPTICAL CHARACTER RECOGNITION
// =========================================================================
// This service provides modular OCR functionality with:
// - Image loading and validation
// - Image preprocessing for better accuracy
// - Multi-language text extraction
// - Result saving and management
// =========================================================================

import 'dart:io';
import 'dart:developer' as developer;
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_tesseract_ocr/flutter_tesseract_ocr.dart';
import 'package:image/image.dart' as img;

// =========================================================================
// OCR RESULT MODEL
// =========================================================================
class OcrResult {
  final String text;
  final String language;
  final double confidence;
  final DateTime timestamp;
  final String? sourceFilePath;

  OcrResult({
    required this.text,
    required this.language,
    required this.confidence,
    required this.timestamp,
    this.sourceFilePath,
  });

  Map<String, dynamic> toJson() => {
    'text': text,
    'language': language,
    'confidence': confidence,
    'timestamp': timestamp.toIso8601String(),
    'sourceFilePath': sourceFilePath,
  };

  factory OcrResult.fromJson(Map<String, dynamic> json) => OcrResult(
    text: json['text'],
    language: json['language'],
    confidence: json['confidence'],
    timestamp: DateTime.parse(json['timestamp']),
    sourceFilePath: json['sourceFilePath'],
  );
}

// =========================================================================
// OCR SERVICE CLASS
// =========================================================================
class OcrService {
  static final OcrService _instance = OcrService._internal();
  factory OcrService() => _instance;
  OcrService._internal();

  final ImagePicker _imagePicker = ImagePicker();
  bool _tesseractReady = false;

  // Supported languages (expandable)
  // Assets present under assets/tessdata: eng, fil, tgl, thai (thai), vie (Vietnamese), ind (Indonesian)
  final List<String> supportedLanguages = [
    'eng',
    'fil',
    'tgl',
    'thaii',
    'vie',
    'ind',
  ];

  // =========================================================================
  // TESSERACT SETUP
  // =========================================================================
  /// Copies traineddata from assets/tessdata to app documents/tessdata once.
  /// Accepts multiple languages and ensures each .traineddata file exists.
  Future<void> prepareTesseractForLanguages(List<String> languages) async {
    if (_tesseractReady) return;
    try {
      developer.log(
        '🔧 Preparing Tesseract traineddata (langs: ${languages.join("+")})',
      );
      final Directory docs = await getApplicationDocumentsDirectory();
      final Directory tessDir = Directory('${docs.path}/tessdata');
      if (!await tessDir.exists()) {
        await tessDir.create(recursive: true);
      }

      for (final lang in languages) {
        final String fileName = '$lang.traineddata';
        final File target = File('${tessDir.path}/$fileName');

        if (!await target.exists()) {
          final String assetPath = 'assets/tessdata/$fileName';
          final ByteData bytes = await rootBundle.load(assetPath);
          await target.writeAsBytes(
            bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
          );
          developer.log('✅ Copied $fileName to ${target.path}');
        } else {
          developer.log('ℹ️ Traineddata already exists at ${target.path}');
        }
      }

      _tesseractReady = true;
    } catch (e, st) {
      developer.log(
        '❌ Failed to prepare Tesseract data',
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 1: LOAD IMAGE
  // =========================================================================
  /// Loads an image from camera or gallery
  /// Returns the File object or null if cancelled/error
  Future<File?> loadImage({required ImageSource source}) async {
    try {
      developer.log(
        '📷 Loading image from ${source == ImageSource.camera ? "camera" : "gallery"}',
      );

      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source,
        imageQuality: 100, // High quality for better OCR
      );

      if (pickedFile == null) {
        developer.log('⚠️ No image selected');
        return null;
      }

      final File imageFile = File(pickedFile.path);

      // Validate file exists and is readable
      if (!await imageFile.exists()) {
        throw Exception('Image file does not exist');
      }

      final int fileSize = await imageFile.length();
      developer.log(
        '✅ Image loaded successfully: ${pickedFile.path} (${fileSize ~/ 1024} KB)',
      );

      return imageFile;
    } catch (e, stackTrace) {
      developer.log('❌ Error loading image', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  // =========================================================================
  // STEP 2: PREPROCESS IMAGE
  // =========================================================================
  /// Preprocesses the image for better OCR accuracy
  /// In this implementation, we validate and prepare the image
  /// For advanced preprocessing (contrast, denoising), consider using the 'image' package
  Future<File> preprocessImage(File imageFile) async {
    try {
      developer.log('🔧 Preprocessing image: ${imageFile.path}');

      // Validate image format
      final String extension = imageFile.path.split('.').last.toLowerCase();
      final List<String> supportedFormats = ['jpg', 'jpeg', 'png'];
      if (!supportedFormats.contains(extension)) {
        throw Exception(
          'Unsupported image format: $extension. Supported: ${supportedFormats.join(", ")}',
        );
      }

      // Check file size (max 10MB)
      final int fileSize = await imageFile.length();
      const int maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        throw Exception(
          'Image too large: ${fileSize ~/ 1024 ~/ 1024}MB. Max size: 10MB',
        );
      }

      // Decode image bytes
      final bytes = await imageFile.readAsBytes();
      final img.Image? src = img.decodeImage(bytes);
      if (src == null) {
        throw Exception('Failed to decode image');
      }

      img.Image work = img.copyRotate(src, angle: 0); // copy

      // If image is small, upscale to help Tesseract (aim ~1500px on longer side)
      final int longer = work.width > work.height ? work.width : work.height;
      if (longer < 1500) {
        final double scale = 1500 / longer;
        final int newW = (work.width * scale).round();
        final int newH = (work.height * scale).round();
        work = img.copyResize(
          work,
          width: newW,
          height: newH,
          interpolation: img.Interpolation.cubic,
        );
      }

      // Grayscale then lightly sharpen and boost contrast
      work = img.grayscale(work);
      // Optional: apply blur/sharpen if needed; keeping minimal ops for stability
      work = img.adjustColor(
        work,
        contrast: 1.2,
        saturation: 1.0,
        brightness: 0,
      );

      // Encode to PNG (lossless) for OCR
      final List<int> outPng = img.encodePng(work, level: 6);

      final Directory tmp = await getTemporaryDirectory();
      final String outPath =
          '${tmp.path}/${DateTime.now().millisecondsSinceEpoch}_preprocessed.png';
      final File outFile = File(outPath);
      await outFile.writeAsBytes(outPng, flush: true);

      developer.log('✅ Image preprocessing complete: $outPath');
      return outFile;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error preprocessing image',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 3: DETECT LANGUAGE
  // =========================================================================
  /// Detects the primary language in the image using quick OCR scan
  /// Returns 'eng' for English, 'tgl' for Tagalog/Filipino, or 'thaii' for Thai
  Future<String> detectLanguage(File imageFile) async {
    try {
      developer.log('🌐 Detecting language...');

      // Ensure English tessdata is ready for initial detection
      await prepareTesseractForLanguages(['eng']);

      final Directory docs = await getApplicationDocumentsDirectory();
      final String tessdataDir = '${docs.path}/tessdata';

      // Quick scan with English to get sample text
      final Map<String, String> args = {
        'tessdata': tessdataDir,
        'user_defined_dpi': '150', // Lower DPI for faster detection
        'psm': '6',
        'oem': '1',
      };

      String sampleText = '';
      try {
        sampleText = await FlutterTesseractOcr.extractText(
          imageFile.path,
          language: 'eng',
          args: args,
        );
      } catch (e) {
        developer.log('⚠️ Quick scan failed: $e');
        return 'eng'; // Default to English on error
      }

      if (sampleText.isEmpty || sampleText.trim().length < 5) {
        developer.log('⚠️ Insufficient text for language detection, defaulting to English');
        return 'eng';
      }

      // Analyze character patterns
      final String cleanText = sampleText.toLowerCase();
      
      // Count Thai characters (Unicode range: 0E00-0E7F)
      final int thaiChars = RegExp(r'[\u0E00-\u0E7F]').allMatches(cleanText).length;
      
      // Count Tagalog-specific patterns and common Filipino words
      final List<String> tagalogWords = [
        'ang', 'ng', 'mga', 'sa', 'ay', 'na', 'at', 'kung', 'para', 'hindi',
        'ako', 'siya', 'tayo', 'kayo', 'sila', 'ito', 'iyan', 'mo', 'ko',
        'mga', 'lamang', 'naman', 'po', 'opo', 'lang', 'din', 'rin',
        'talaga', 'kasi', 'pala', 'daw', 'raw', 'kami', 'natin'
      ];
      
      int tagalogScore = 0;
      for (final word in tagalogWords) {
        // Use word boundaries to avoid partial matches
        final pattern = RegExp(r'\b' + word + r'\b', caseSensitive: false);
        tagalogScore += pattern.allMatches(cleanText).length * 2;
      }

      // Count Filipino letter patterns (repeated vowels, specific consonant clusters)
      final int ngPattern = RegExp(r'ng').allMatches(cleanText).length;
      tagalogScore += ngPattern;

      // Calculate percentages
      final int totalChars = cleanText.replaceAll(RegExp(r'\s+'), '').length;
      final double thaiPercentage = totalChars > 0 ? (thaiChars / totalChars) * 100 : 0;

      developer.log('📊 Language detection stats:');
      developer.log('   Thai characters: $thaiChars ($thaiPercentage%)');
      developer.log('   Tagalog score: $tagalogScore');
      developer.log('   Sample text: ${sampleText.substring(0, sampleText.length > 100 ? 100 : sampleText.length)}...');

      // Decision logic
      String detectedLang;
      if (thaiPercentage > 20) {
        detectedLang = 'thaii';
        developer.log('✅ Detected: Thai (${thaiPercentage.toStringAsFixed(1)}% Thai characters)');
      } else if (tagalogScore > 3) {
        detectedLang = 'tgl';
        developer.log('✅ Detected: Tagalog (score: $tagalogScore)');
      } else {
        detectedLang = 'eng';
        developer.log('✅ Detected: English (default)');
      }

      return detectedLang;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error detecting language, defaulting to English',
        error: e,
        stackTrace: stackTrace,
      );
      return 'eng'; // Default to English on error
    }
  }

  // =========================================================================
  // STEP 4: EXTRACT TEXT
  // =========================================================================
  // =========================================================================
  // STEP 4: EXTRACT TEXT
  // =========================================================================
  /// Extracts text from the preprocessed image using Tesseract OCR
  /// If auto-detect is enabled, it will first detect the language and use the appropriate tessdata.
  /// Pass a combined language string like 'eng+fil+tgl' or use [languages].
  Future<OcrResult> extractText(
    File imageFile, {
    String? language, // kept for backward compatibility
    List<String>? languages,
    int dpi = 300,
    bool autoDetect = true, // NEW: Enable automatic language detection
  }) async {
    try {
      List<String> langs;

      // Auto-detect language if enabled and no specific languages provided
      if (autoDetect && languages == null && language == null) {
        developer.log('🔍 Auto-detecting language...');
        final String detected = await detectLanguage(imageFile);
        langs = [detected];
        developer.log('📝 Using detected language: $detected');
      } else {
        // Resolve final language set from parameters
        langs = (languages ??
                ((language ?? 'eng')
                    .split('+')
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList()))
            // Keep only supported languages to avoid missing assets
            .where((l) => supportedLanguages.contains(l))
            .toList();
      }

      final String langsParam = langs.join('+');

      developer.log(
        '🔍 Extracting text via Tesseract (languages: $langsParam)',
      );

      // Ensure traineddata is ready
      await prepareTesseractForLanguages(langs);

      // Resolve tessdata directory
      final Directory docs = await getApplicationDocumentsDirectory();
      final String tessdataDir = '${docs.path}/tessdata';

      // Base args; we'll try multiple PSMs for robustness
      final Map<String, String> baseArgs = {
        'tessdata': tessdataDir,
        'user_defined_dpi': dpi.toString(),
        'preserve_interword_spaces': '1',
        'oem': '1',
      };

      final List<String> psmOrder = ['6', '4', '3', '11', '12', '13'];
      String extractedText = '';
      for (final psm in psmOrder) {
        final args = Map<String, String>.from(baseArgs)..addAll({'psm': psm});
        developer.log('🧪 Tesseract attempt with PSM=$psm');
        try {
          extractedText = await FlutterTesseractOcr.extractText(
            imageFile.path,
            language: langsParam,
            args: args,
          );
        } catch (e) {
          developer.log('PSM $psm failed: $e');
          extractedText = '';
        }

        // Accept if non-trivial text found
        if (extractedText.trim().length >= 10) {
          developer.log(
            '✅ PSM=$psm yielded ${extractedText.trim().length} chars',
          );
          break;
        } else {
          developer.log('ℹ️ PSM=$psm yielded too little text; trying next');
          extractedText = '';
        }
      }

      // Tesseract does not provide confidence; estimate simply by length
      final double confidence = extractedText.isEmpty ? 0.0 : 0.8;

      // Create result object
      final OcrResult result = OcrResult(
        text: extractedText,
        language: langsParam,
        confidence: confidence,
        timestamp: DateTime.now(),
        sourceFilePath: imageFile.path,
      );

      return result;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error extracting text',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // CONVENIENCE METHOD: SMART OCR WITH AUTO-DETECTION
  // =========================================================================
  /// Performs complete OCR workflow with automatic language detection:
  /// 1. Preprocesses the image
  /// 2. Detects the language (English, Tagalog, or Thai)
  /// 3. Extracts text using the appropriate tessdata
  /// 4. Optionally saves the result
  Future<OcrResult> smartOcr(
    File imageFile, {
    int dpi = 300,
    bool saveResult = false,
  }) async {
    try {
      developer.log('🚀 Starting smart OCR with auto-detection...');

      // Step 1: Preprocess
      developer.log('📸 Step 1/3: Preprocessing image...');
      final File preprocessed = await preprocessImage(imageFile);

      // Step 2 & 3: Detect language and extract text (auto-detect enabled)
      developer.log('🌐 Step 2/3: Detecting language and extracting text...');
      final OcrResult result = await extractText(
        preprocessed,
        dpi: dpi,
        autoDetect: true, // Enable auto-detection
      );

      // Step 4: Save if requested
      if (saveResult) {
        developer.log('💾 Step 3/3: Saving result...');
        await this.saveResult(result);
      }

      developer.log('✅ Smart OCR complete! Detected language: ${result.language}');
      return result;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error in smart OCR',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 5: SAVE RESULT
  // =========================================================================
  /// Saves the OCR result to local storage
  /// Stores both in SharedPreferences (for history) and as a file
  Future<void> saveResult(OcrResult result) async {
    try {
      developer.log('💾 Saving OCR result');

      // Save to SharedPreferences for history
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final List<String> history = prefs.getStringList('ocr_history') ?? [];

      // Add new result (limit to last 50 results)
      history.insert(0, result.text);
      if (history.length > 50) {
        history.removeRange(50, history.length);
      }

      await prefs.setStringList('ocr_history', history);

      // Save to file for detailed record
      final Directory appDir = await getApplicationDocumentsDirectory();
      final String fileName =
          'ocr_${result.timestamp.millisecondsSinceEpoch}.txt';
      final File resultFile = File('${appDir.path}/$fileName');

      final StringBuffer content = StringBuffer();
      content.writeln('OCR Result');
      content.writeln('==========');
      content.writeln('Timestamp: ${result.timestamp}');
      content.writeln('Language: ${result.language}');
      content.writeln(
        'Confidence: ${(result.confidence * 100).toStringAsFixed(1)}%',
      );
      content.writeln('Source: ${result.sourceFilePath ?? "N/A"}');
      content.writeln('\nExtracted Text:');
      content.writeln('---------------');
      content.writeln(result.text);

      await resultFile.writeAsString(content.toString());

      developer.log('✅ Result saved: $fileName');
    } catch (e, stackTrace) {
      developer.log('❌ Error saving result', error: e, stackTrace: stackTrace);
      // Don't rethrow - saving is optional
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  // Tesseract path uses no disposable resources; keep method for API parity

  /// Retrieves OCR history from SharedPreferences
  Future<List<String>> getHistory() async {
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      return prefs.getStringList('ocr_history') ?? [];
    } catch (e) {
      developer.log('Error retrieving history: $e');
      return [];
    }
  }

  /// Clears OCR history
  Future<void> clearHistory() async {
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('ocr_history');
      developer.log('✅ History cleared');
    } catch (e) {
      developer.log('Error clearing history: $e');
    }
  }

  // =========================================================================
  // DISPOSE
  // =========================================================================
  /// Cleans up resources
  Future<void> dispose() async {
    // No disposable resources for Tesseract path
  }
}
