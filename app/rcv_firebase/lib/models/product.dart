/// Company Model
class Company {
  final String? id;
  final String? name;

  Company({this.id, this.name});

  factory Company.fromJson(Map<String, dynamic>? json) {
    if (json == null) return Company();
    return Company(id: json['_id'], name: json['name']);
  }
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
    return Product(
      id: json['_id'] ?? '',
      ltoNumber: json['LTONumber'] ?? '',
      cfprNumber: json['CFPRNumber'] ?? '',
      lotNumber: json['lotNumber'] ?? '',
      brandName: json['brandName'] ?? '',
      productName: json['productName'] ?? '',
      productClassification: json['productClassification'] ?? 0,
      productSubClassification: json['productSubClassification'] ?? 0,
      expirationDate: json['expirationDate'] != null
          ? DateTime.parse(json['expirationDate'])
          : DateTime.now(),
      dateOfRegistration: json['dateOfRegistration'] != null
          ? DateTime.parse(json['dateOfRegistration'])
          : DateTime.now(),
      companyId: json['company']?['_id'],
      companyName: json['company']?['name'],
      company: json['company'] != null
          ? Company.fromJson(json['company'])
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
    
    if (json['Product'] != null) {
      productsList = (json['Product'] as List)
          .map((item) => Product.fromJson(item))
          .toList();
    } else if (json['data'] != null && json['data'] is List) {
      productsList = (json['data'] as List)
          .map((item) => Product.fromJson(item))
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
