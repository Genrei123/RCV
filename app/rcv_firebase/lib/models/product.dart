/// Company Model
class Company {
  final String? id;
  final String? name;

  Company({this.id, this.name});

  factory Company.fromJson(Map<String, dynamic>? json) {
    if (json == null) return Company();
    return Company(id: _parseString(json['_id']), name: _parseString(json['name']));
  }
}

String? _parseString(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  return value.toString();
}

int _parseInt(dynamic value, {int fallback = 0}) {
  if (value == null) return fallback;
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return int.tryParse(value.toString()) ?? fallback;
}

DateTime _parseDate(dynamic value, {DateTime? fallback}) {
  if (value == null) return fallback ?? DateTime.now();
  if (value is DateTime) return value;
  if (value is String) {
    return DateTime.tryParse(value) ?? (fallback ?? DateTime.now());
  }
  if (value is int) {
    // Heuristic: treat 10-digit as seconds, 13-digit as milliseconds.
    final milliseconds = value < 1000000000000 ? value * 1000 : value;
    return DateTime.fromMillisecondsSinceEpoch(milliseconds);
  }
  return fallback ?? DateTime.now();
}

/// Product Model
///
/// Represents a product from the database/blockchain
class Product {
  final String id;
  final String ltoNumber;
  final String cfprNumber;
  final String lotNumber;
  final String brandName;
  final String productName;
  final int productClassification;
  final int productSubClassification;
  final DateTime expirationDate;
  final DateTime dateOfRegistration;
  final String? companyId;
  final String? companyName;
  final Company? company;

  Product({
    required this.id,
    required this.ltoNumber,
    required this.cfprNumber,
    required this.lotNumber,
    required this.brandName,
    required this.productName,
    required this.productClassification,
    required this.productSubClassification,
    required this.expirationDate,
    required this.dateOfRegistration,
    this.companyId,
    this.companyName,
    this.company,
  });

  // From JSON
  factory Product.fromJson(Map<String, dynamic> json) {
    final dynamic companyJson = json['company'];
    return Product(
      id: _parseString(json['_id']) ?? '',
      ltoNumber: _parseString(json['LTONumber']) ?? '',
      cfprNumber: _parseString(json['CFPRNumber']) ?? '',
      lotNumber: _parseString(json['lotNumber']) ?? '',
      brandName: _parseString(json['brandName']) ?? '',
      productName: _parseString(json['productName']) ?? '',
      productClassification: _parseInt(json['productClassification']),
      productSubClassification: _parseInt(json['productSubClassification']),
      expirationDate: _parseDate(json['expirationDate']),
      dateOfRegistration: _parseDate(json['dateOfRegistration']),
        companyId:
          companyJson is Map ? _parseString(companyJson['_id']) : _parseString(companyJson),
        companyName:
          companyJson is Map ? _parseString(companyJson['name']) : null,
        company: companyJson is Map
          ? Company.fromJson(Map<String, dynamic>.from(companyJson))
          : null,
    );
  }

  // To JSON
  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'LTONumber': ltoNumber,
      'CFPRNumber': cfprNumber,
      'lotNumber': lotNumber,
      'brandName': brandName,
      'productName': productName,
      'productClassification': productClassification,
      'productSubClassification': productSubClassification,
      'expirationDate': expirationDate.toIso8601String(),
      'dateOfRegistration': dateOfRegistration.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'Product{name: $productName, brand: $brandName, lot: $lotNumber}';
  }
}

/// API Response Models
class ScanProductResponse {
  final bool success;
  final bool found;
  final List<Product> products;
  final String? message;
  final String? source;
  final Map<String, dynamic>? matchDetails;

  ScanProductResponse({
    required this.success,
    required this.found,
    required this.products,
    this.message,
    this.source,
    this.matchDetails,
  });

  factory ScanProductResponse.fromJson(Map<String, dynamic> json) {
    // Try to parse products from 'Product' first, then 'data' as fallback
    List<Product> productsList = [];
    
    if (json['Product'] != null && json['Product'] is List) {
      productsList = (json['Product'] as List)
          .where((item) => item is Map)
          .map((item) =>
              Product.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    } else if (json['data'] != null && json['data'] is List) {
      productsList = (json['data'] as List)
          .where((item) => item is Map)
          .map((item) =>
              Product.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    }
    
    return ScanProductResponse(
      success: json['success'] ?? true,
      found: json['found'] ?? false,
      products: productsList,
      message: json['message'],
      source: json['source'],
      matchDetails: json['matchDetails'],
    );
  }
}
