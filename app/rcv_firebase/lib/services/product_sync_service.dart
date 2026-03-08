// =========================================================================
// PRODUCT SYNC SERVICE - Keeps local SQLite DB in sync with server
// =========================================================================
// Fetches the product catalog from the server and stores it locally.
// This enables the mobile app to perform OCR fuzzy search without
// any network round-trips.
//
// Sync strategy:
//   - Full sync on first launch or when local DB is empty
//   - Periodic refresh (default: every 30 minutes while app is active)
//   - Manual "pull to refresh" support
//   - Reporting, compliance, scan history remain server-side (unaffected)
//
// Usage:
//   await ProductSyncService.instance.syncIfNeeded();
//   // ...then use LocalFuzzySearchService.searchProductsFuzzy(ocrText)
// =========================================================================

import 'dart:async';
import 'dart:developer' as developer;
import '../config/api_constants.dart';
import '../models/local_product.dart';
import 'api_client.dart';
import 'local_product_database.dart';
import 'local_fuzzy_search_service.dart';

class ProductSyncService {
  static final ProductSyncService instance = ProductSyncService._internal();
  ProductSyncService._internal();

  static final ApiClient _apiClient = ApiClient.instance;

  /// How often to auto-refresh (default 30 minutes)
  static const Duration syncInterval = Duration(minutes: 30);

  /// Periodic timer (started via startAutoSync)
  Timer? _autoSyncTimer;

  bool _isSyncing = false;

  /// Whether a sync is currently in progress
  bool get isSyncing => _isSyncing;

  // =========================================================================
  // SYNC LOGIC
  // =========================================================================

  /// Perform a full sync: fetch all products from server → store locally.
  /// Returns the number of products synced, or -1 on failure.
  Future<int> sync() async {
    if (_isSyncing) {
      developer.log('⏳ [Sync] Already syncing, skipping');
      return -1;
    }

    _isSyncing = true;
    try {
      developer.log('🔄 [Sync] Starting product sync...');

      final db = LocalProductDatabase.instance;
      final lastSync = await db.getLastSyncTime();

      // Build endpoint URL (with optional ?since= for future incremental sync)
      String endpoint = '/mobile/products/sync';
      if (lastSync != null) {
        endpoint += '?since=${lastSync.toIso8601String()}';
      }

      final response = await _apiClient.get(endpoint);

      if (response.statusCode != 200) {
        developer.log('❌ [Sync] Server returned ${response.statusCode}');
        return -1;
      }

      final data = response.data;
      if (data == null || data['success'] != true) {
        developer.log('❌ [Sync] Invalid response: $data');
        return -1;
      }

      final List<dynamic> productsJson = data['data'] ?? [];
      final products = productsJson
          .map((j) => LocalProduct.fromSyncJson(j as Map<String, dynamic>))
          .toList();

      developer.log(
        '📦 [Sync] Received ${products.length} products from server',
      );

      if (products.isEmpty) {
        developer.log('ℹ️ [Sync] No products to sync');
        await db.saveLastSyncTime(DateTime.now());
        return 0;
      }

      // Full replace: clear + insert (simple and reliable)
      // For incremental sync in the future, switch to upsert-only.
      await db.clearAll();
      final count = await db.upsertProducts(products);

      // Save sync metadata
      final syncTime = data['syncTimestamp'] != null
          ? DateTime.parse(data['syncTimestamp'])
          : DateTime.now();
      await db.saveLastSyncTime(syncTime);
      await db.saveSyncCount(count);

      // Refresh the in-memory fuzzy search cache
      await LocalFuzzySearchService.initialize();

      developer.log('✅ [Sync] Synced $count products successfully');
      return count;
    } catch (e, st) {
      developer.log('❌ [Sync] Failed', error: e, stackTrace: st);
      return -1;
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync only if we haven't synced recently (respects syncInterval)
  Future<int> syncIfNeeded() async {
    final db = LocalProductDatabase.instance;
    final lastSync = await db.getLastSyncTime();

    if (lastSync == null) {
      developer.log('🔄 [Sync] First-time sync');
      return await sync();
    }

    final age = DateTime.now().difference(lastSync);
    if (age > syncInterval) {
      developer.log(
        '🔄 [Sync] Cache stale (${age.inMinutes}m old), refreshing',
      );
      return await sync();
    }

    // Cache is fresh — just make sure in-memory cache is loaded
    if (!LocalFuzzySearchService.isReady) {
      await LocalFuzzySearchService.initialize();
    }

    developer.log(
      '✅ [Sync] Cache fresh (${age.inMinutes}m old, '
      '${LocalFuzzySearchService.productCount} products)',
    );
    return 0;
  }

  // =========================================================================
  // AUTO-SYNC (periodic background refresh)
  // =========================================================================

  /// Start periodic auto-sync. Call once from main.dart after login.
  void startAutoSync() {
    stopAutoSync();
    _autoSyncTimer = Timer.periodic(syncInterval, (_) async {
      developer.log('⏰ [Sync] Auto-sync triggered');
      await sync();
    });
    developer.log(
      '⏰ [Sync] Auto-sync started (every ${syncInterval.inMinutes}m)',
    );
  }

  /// Stop periodic auto-sync. Call on logout.
  void stopAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = null;
  }

  // =========================================================================
  // STATUS / DIAGNOSTICS
  // =========================================================================

  /// Get a human-readable sync status string for UI display
  Future<String> getSyncStatusText() async {
    final db = LocalProductDatabase.instance;
    final lastSync = await db.getLastSyncTime();
    final count = await db.getProductCount();

    if (lastSync == null) {
      return 'Never synced — tap to sync now';
    }

    final age = DateTime.now().difference(lastSync);
    String ageText;
    if (age.inMinutes < 1) {
      ageText = 'just now';
    } else if (age.inMinutes < 60) {
      ageText = '${age.inMinutes}m ago';
    } else if (age.inHours < 24) {
      ageText = '${age.inHours}h ago';
    } else {
      ageText = '${age.inDays}d ago';
    }

    return '$count products • synced $ageText';
  }

  /// Force a full re-sync (clears DB first). Use for troubleshooting.
  Future<int> forceFullSync() async {
    final db = LocalProductDatabase.instance;
    await db.clearAll();
    return await sync();
  }
}
