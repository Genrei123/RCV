// lib/components/qr_details.dart (UPDATED - _HexagonCheckPainter removed)
import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
// import 'dart:math'; // No longer needed if _HexagonCheckPainter is removed

// =========================================================================
// SCANNED ITEM DATA MODEL
// =========================================================================

class ScannedItem {
  final String companyName;
  final String productName;
  final String brandName;
  final String regNumber;
  final String productImage;

  ScannedItem({
    required this.companyName,
    required this.productName,
    required this.brandName,
    required this.regNumber,
    required this.productImage,
  });

  factory ScannedItem.fromJson(Map<String, dynamic> json) {
    return ScannedItem(
      companyName: json['company_name'] ?? '',
      productName: json['product_name'] ?? '',
      brandName: json['brand_name'] ?? '',
      regNumber: json['reg_number'] ?? '',
      productImage: json['product_image'] ?? '',
    );
  }
}

// =========================================================================
// SCANNED ITEM DETAILS WIDGET (Header Removed)
// =========================================================================
class ScannedItemDetails extends StatelessWidget {
  final ScannedItem item;

  const ScannedItemDetails({
    super.key,
    required this.item,
  });

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 14, color: AppColors.muted)),
          Text(value,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ✅ Product Image
          Container(
            padding: const EdgeInsets.all(16.0),
            child: Center(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.primary, width: 2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset(
                    item.productImage,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 200,
                        width: MediaQuery.of(context).size.width * 0.7,
                        color: AppColors.muted.withOpacity(0.5),
                        child: const Center(
                          child: Text('Image Not Found',
                              style: TextStyle(color: AppColors.text)),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),

          // ✅ Details Card
          Container(
            padding: const EdgeInsets.all(20.0),
            margin: const EdgeInsets.symmetric(horizontal: 16.0),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border.all(color: AppColors.primary, width: 1.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Company Name:', item.companyName),
                _buildDetailRow('Product Name:', item.productName),
                _buildDetailRow('Brand Name:', item.brandName),
                const SizedBox(height: 10),
                const Text(
                  'Registration Details:',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text),
                ),
                const SizedBox(height: 5),
                _buildDetailRow('Reg. Number:', item.regNumber),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

// _HexagonCheckPainter and its dependencies (like dart:math) are now removed from this file.