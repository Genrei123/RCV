// =========================================================================
// LOCAL PRODUCT MODEL - For offline fuzzy search
// =========================================================================
// Lightweight product model stored in local SQLite database.
// Contains only the fields needed for OCR fuzzy matching.
// Full product details are still fetched from server when needed.
// =========================================================================

class LocalProduct {
  final String id;
  final String productName;
  final String? brandName;
  final String? cfprNumber;
  final String? ltoNumber;
  final String? lotNumber;
  final String? productClassification;
  final String? productSubClassification;
  final String? expirationDate;
  final String? dateOfRegistration;
  final String? companyId;
  final String? companyName;
  final String? productImageFront;
  final String? productImageBack;
  final bool isArchived;
  final String? syncedAt; // When this record was last synced

  LocalProduct({
    required this.id,
    required this.productName,
    this.brandName,
    this.cfprNumber,
    this.ltoNumber,
    this.lotNumber,
    this.productClassification,
    this.productSubClassification,
    this.expirationDate,
    this.dateOfRegistration,
    this.companyId,
    this.companyName,
    this.productImageFront,
    this.productImageBack,
    this.isArchived = false,
    this.syncedAt,
  });

  /// Create from API sync response JSON
  factory LocalProduct.fromSyncJson(Map<String, dynamic> json) {
    return LocalProduct(
      id: json['id'] ?? '',
      productName: json['productName'] ?? '',
      brandName: json['brandName'],
      cfprNumber: json['CFPRNumber'],
      ltoNumber: json['LTONumber'],
      lotNumber: json['lotNumber'],
      productClassification: json['productClassification'],
      productSubClassification: json['productSubClassification'],
      expirationDate: json['expirationDate'],
      dateOfRegistration: json['dateOfRegistration'],
      companyId: json['companyId'],
      companyName: json['companyName'],
      productImageFront: json['productImageFront'],
      productImageBack: json['productImageBack'],
      isArchived: json['isArchived'] ?? false,
    );
  }

  /// Create from SQLite row
  factory LocalProduct.fromDbRow(Map<String, dynamic> row) {
    return LocalProduct(
      id: row['id'] as String,
      productName: row['product_name'] as String,
      brandName: row['brand_name'] as String?,
      cfprNumber: row['cfpr_number'] as String?,
      ltoNumber: row['lto_number'] as String?,
      lotNumber: row['lot_number'] as String?,
      productClassification: row['product_classification'] as String?,
      productSubClassification: row['product_sub_classification'] as String?,
      expirationDate: row['expiration_date'] as String?,
      dateOfRegistration: row['date_of_registration'] as String?,
      companyId: row['company_id'] as String?,
      companyName: row['company_name'] as String?,
      productImageFront: row['product_image_front'] as String?,
      productImageBack: row['product_image_back'] as String?,
      isArchived: (row['is_archived'] as int?) == 1,
      syncedAt: row['synced_at'] as String?,
    );
  }

  /// Convert to SQLite row
  Map<String, dynamic> toDbRow() {
    return {
      'id': id,
      'product_name': productName,
      'brand_name': brandName,
      'cfpr_number': cfprNumber,
      'lto_number': ltoNumber,
      'lot_number': lotNumber,
      'product_classification': productClassification,
      'product_sub_classification': productSubClassification,
      'expiration_date': expirationDate,
      'date_of_registration': dateOfRegistration,
      'company_id': companyId,
      'company_name': companyName,
      'product_image_front': productImageFront,
      'product_image_back': productImageBack,
      'is_archived': isArchived ? 1 : 0,
      'synced_at': syncedAt ?? DateTime.now().toIso8601String(),
    };
  }

  /// Convert to JSON (for display / passing to scan result)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productName': productName,
      'brandName': brandName,
      'CFPRNumber': cfprNumber,
      'LTONumber': ltoNumber,
      'lotNumber': lotNumber,
      'productClassification': productClassification,
      'productSubClassification': productSubClassification,
      'expirationDate': expirationDate,
      'dateOfRegistration': dateOfRegistration,
      'companyId': companyId,
      'companyName': companyName,
      'productImageFront': productImageFront,
      'productImageBack': productImageBack,
      'isArchived': isArchived,
    };
  }

  @override
  String toString() =>
      'LocalProduct(id=$id, name=$productName, cfpr=$cfprNumber, lto=$ltoNumber)';
}

/// Metadata about the last sync operation
class SyncMetadata {
  final DateTime lastSyncTime;
  final int productCount;
  final bool wasIncremental;

  SyncMetadata({
    required this.lastSyncTime,
    required this.productCount,
    required this.wasIncremental,
  });

  factory SyncMetadata.fromJson(Map<String, dynamic> json) {
    return SyncMetadata(
      lastSyncTime: DateTime.parse(json['lastSyncTime']),
      productCount: json['productCount'] ?? 0,
      wasIncremental: json['wasIncremental'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lastSyncTime': lastSyncTime.toIso8601String(),
      'productCount': productCount,
      'wasIncremental': wasIncremental,
    };
  }
}
