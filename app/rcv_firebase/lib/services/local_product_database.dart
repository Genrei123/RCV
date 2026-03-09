// =========================================================================
// LOCAL PRODUCT DATABASE - SQLite storage for offline fuzzy search
// =========================================================================
// Manages a local SQLite database of products synced from the server.
// This eliminates the round-trip latency for OCR fuzzy search.
//
// Usage:
//   await LocalProductDatabase.instance.initialize();
//   final products = await LocalProductDatabase.instance.getAllProducts();
// =========================================================================

import 'dart:developer' as developer;
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/local_product.dart';

class LocalProductDatabase {
  static final LocalProductDatabase instance = LocalProductDatabase._internal();
  LocalProductDatabase._internal();

  static Database? _database;

  static const String _dbName = 'rcv_products.db';
  static const int _dbVersion = 1;
  static const String _tableName = 'products';
  static const String _prefLastSync = 'product_sync_last_timestamp';
  static const String _prefSyncCount = 'product_sync_count';

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /// Get or create the database instance
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final path = join(documentsDir.path, _dbName);

    developer.log('📦 [LocalDB] Opening database at: $path');

    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    developer.log('📦 [LocalDB] Creating products table (v$version)');

    await db.execute('''
      CREATE TABLE $_tableName (
        id TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        brand_name TEXT,
        cfpr_number TEXT,
        lto_number TEXT,
        lot_number TEXT,
        product_classification TEXT,
        product_sub_classification TEXT,
        expiration_date TEXT,
        date_of_registration TEXT,
        company_id TEXT,
        company_name TEXT,
        product_image_front TEXT,
        product_image_back TEXT,
        is_archived INTEGER DEFAULT 0,
        synced_at TEXT
      )
    ''');

    // Indexes for fast fuzzy search lookups
    await db.execute(
      'CREATE INDEX idx_cfpr ON $_tableName (cfpr_number)',
    );
    await db.execute(
      'CREATE INDEX idx_lto ON $_tableName (lto_number)',
    );
    await db.execute(
      'CREATE INDEX idx_product_name ON $_tableName (product_name)',
    );
    await db.execute(
      'CREATE INDEX idx_brand_name ON $_tableName (brand_name)',
    );

    developer.log('✅ [LocalDB] Table and indexes created');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    developer.log(
      '📦 [LocalDB] Upgrading database from v$oldVersion to v$newVersion',
    );
    // For future schema migrations
    if (oldVersion < newVersion) {
      await db.execute('DROP TABLE IF EXISTS $_tableName');
      await _onCreate(db, newVersion);
    }
  }

  /// Call this on app startup
  Future<void> initialize() async {
    await database; // Triggers creation if needed
    developer.log('✅ [LocalDB] Database initialized');
  }

  // =========================================================================
  // CRUD OPERATIONS
  // =========================================================================

  /// Insert or replace a batch of products (used during sync)
  Future<int> upsertProducts(List<LocalProduct> products) async {
    final db = await database;
    final batch = db.batch();
    final now = DateTime.now().toIso8601String();

    for (final product in products) {
      final row = product.toDbRow();
      row['synced_at'] = now;
      batch.insert(
        _tableName,
        row,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
    developer.log('✅ [LocalDB] Upserted ${products.length} products');
    return products.length;
  }

  /// Get all non-archived products (for fuzzy search)
  Future<List<LocalProduct>> getAllProducts() async {
    final db = await database;
    final rows = await db.query(
      _tableName,
      where: 'is_archived = ?',
      whereArgs: [0],
    );
    return rows.map((row) => LocalProduct.fromDbRow(row)).toList();
  }

  /// Get a single product by ID
  Future<LocalProduct?> getProductById(String id) async {
    final db = await database;
    final rows = await db.query(
      _tableName,
      where: 'id = ?',
      whereArgs: [id],
    );
    if (rows.isEmpty) return null;
    return LocalProduct.fromDbRow(rows.first);
  }

  /// Get total product count
  Future<int> getProductCount() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM $_tableName WHERE is_archived = 0',
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Search products by CFPR number (case-insensitive, exact match)
  Future<List<LocalProduct>> searchByCfpr(String cfprNumber) async {
    final db = await database;
    final normalized = cfprNumber.trim().toUpperCase();
    final rows = await db.query(
      _tableName,
      where: 'UPPER(cfpr_number) = ? AND is_archived = 0',
      whereArgs: [normalized],
    );
    return rows.map((row) => LocalProduct.fromDbRow(row)).toList();
  }

  /// Search products by LTO number (case-insensitive, exact match)
  Future<List<LocalProduct>> searchByLto(String ltoNumber) async {
    final db = await database;
    final normalized = ltoNumber.trim().toUpperCase();
    final rows = await db.query(
      _tableName,
      where: 'UPPER(lto_number) = ? AND is_archived = 0',
      whereArgs: [normalized],
    );
    return rows.map((row) => LocalProduct.fromDbRow(row)).toList();
  }

  /// Search products by both CFPR and LTO (AND condition, both must match exactly)
  Future<List<LocalProduct>> searchByCfprAndLto(
    String cfprNumber,
    String ltoNumber,
  ) async {
    final db = await database;
    final normalizedCfpr = cfprNumber.trim().toUpperCase();
    final normalizedLto = ltoNumber.trim().toUpperCase();
    final rows = await db.query(
      _tableName,
      where:
          'UPPER(cfpr_number) = ? AND UPPER(lto_number) = ? AND is_archived = 0',
      whereArgs: [normalizedCfpr, normalizedLto],
    );
    return rows.map((row) => LocalProduct.fromDbRow(row)).toList();
  }

  /// Clear all products (for full re-sync)
  Future<void> clearAll() async {
    final db = await database;
    await db.delete(_tableName);
    developer.log('🗑️ [LocalDB] All products cleared');
  }

  /// Delete the entire database (for troubleshooting)
  Future<void> deleteDatabase() async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final path = join(documentsDir.path, _dbName);
    await databaseFactory.deleteDatabase(path);
    _database = null;
    developer.log('🗑️ [LocalDB] Database deleted');
  }

  // =========================================================================
  // SYNC METADATA (SharedPreferences)
  // =========================================================================

  /// Save the timestamp of the last successful sync
  Future<void> saveLastSyncTime(DateTime time) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefLastSync, time.toIso8601String());
  }

  /// Get the timestamp of the last successful sync (null if never synced)
  Future<DateTime?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_prefLastSync);
    if (str == null) return null;
    return DateTime.tryParse(str);
  }

  /// Save the product count after sync
  Future<void> saveSyncCount(int count) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_prefSyncCount, count);
  }

  /// Get the product count from last sync
  Future<int> getSyncCount() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_prefSyncCount) ?? 0;
  }

  /// Check if we have any synced data
  Future<bool> hasSyncedData() async {
    final count = await getProductCount();
    return count > 0;
  }

  /// Get sync metadata
  Future<SyncMetadata?> getSyncMetadata() async {
    final lastSync = await getLastSyncTime();
    if (lastSync == null) return null;
    final count = await getSyncCount();
    return SyncMetadata(
      lastSyncTime: lastSync,
      productCount: count,
      wasIncremental: false,
    );
  }
}
