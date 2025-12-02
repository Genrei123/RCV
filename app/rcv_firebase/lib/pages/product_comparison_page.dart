import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart';

class ProductComparisonPage extends StatelessWidget {
  final Map<String, dynamic> scannedData;
  final Map<String, dynamic>? databaseProduct;
  final String? frontImageUrl;
  final String? backImageUrl;
  final String? ocrBlobText;

  const ProductComparisonPage({
    super.key,
    required this.scannedData,
    this.databaseProduct,
    this.frontImageUrl,
    this.backImageUrl,
    this.ocrBlobText,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Product Verification',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.primary.withValues(alpha: 0.8),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    databaseProduct != null
                        ? Icons.compare_arrows
                        : Icons.warning_amber_rounded,
                    size: 64,
                    color: Colors.white,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    databaseProduct != null
                        ? 'Product Found in Database'
                        : 'Product Not Found',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    databaseProduct != null
                        ? 'Compare scanned data with registered product'
                        : 'No matching product found in database',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            // Comparison Cards
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  if (databaseProduct != null) ...[
                    // Side-by-side comparison
                    _buildComparisonCard(
                      'Product Name',
                      scannedData['productName'],
                      databaseProduct!['productName'],
                    ),
                    _buildComparisonCard(
                      'Brand Name',
                      scannedData['brandName'],
                      databaseProduct!['brandName'],
                    ),
                    _buildComparisonCard(
                      'CFPR Number',
                      scannedData['CFPRNumber'],
                      databaseProduct!['CFPRNumber'],
                    ),
                    _buildComparisonCard(
                      'Expiration Date',
                      scannedData['expirationDate'],
                      databaseProduct!['expirationDate'],
                    ),

                    const SizedBox(height: 16),

                    // Database Only Info
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Registered Product Information',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            'Classification',
                            databaseProduct!['productClassification'] ?? 'N/A',
                          ),
                          _buildInfoRow(
                            'Sub-Classification',
                            databaseProduct!['productSubClassification'] ?? 'N/A',
                          ),
                          _buildInfoRow(
                            'Company',
                            databaseProduct!['company']?['name'] ?? 'N/A',
                          ),
                          if (databaseProduct!['dateOfRegistration'] != null)
                            _buildInfoRow(
                              'Registration Date',
                              databaseProduct!['dateOfRegistration'],
                            ),
                          if (databaseProduct!['confidence'] != null)
                            _buildInfoRow(
                              'Match Confidence',
                              '${(databaseProduct!['confidence'] * 100).toStringAsFixed(0)}%',
                            ),
                          if (databaseProduct!['source'] != null)
                            _buildInfoRow(
                              'Data Source',
                              databaseProduct!['source'] == 'grounded_search_pdf'
                                  ? 'Official PDF Registry'
                                  : 'Internal Database',
                            ),
                          _buildInfoRow(
                            'Status',
                            databaseProduct!['isActive'] == true
                                ? 'Active'
                                : 'Inactive',
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // Show only scanned data
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Scanned Product Data',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildScanDataRow(
                            'Product Name',
                            scannedData['productName'],
                          ),
                          _buildScanDataRow(
                            'Brand Name',
                            scannedData['brandName'],
                          ),
                          _buildScanDataRow(
                            'CFPR Number',
                            scannedData['CFPRNumber'],
                          ),
                          _buildScanDataRow(
                            'Expiration Date',
                            scannedData['expirationDate'],
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context, {
                              'action': 'COMPLIANT',
                              'frontImageUrl': frontImageUrl,
                              'backImageUrl': backImageUrl,
                              'ocrBlobText': ocrBlobText,
                            });
                          },
                          icon: const Icon(Icons.check_circle),
                          label: const Text('Mark Compliant'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context, {
                              'action': 'NON_COMPLIANT',
                              'frontImageUrl': frontImageUrl,
                              'backImageUrl': backImageUrl,
                              'ocrBlobText': ocrBlobText,
                            });
                          },
                          icon: const Icon(Icons.report_problem),
                          label: const Text('Report Issue'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComparisonCard(
      String label, String? scannedValue, String? dbValue) {
    final bool matches = scannedValue == dbValue;
    final bool hasScanned = scannedValue != null && scannedValue.isNotEmpty;
    final bool hasDB = dbValue != null && dbValue.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: matches
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: matches ? Colors.green : Colors.orange,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          // Label
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: matches
                  ? Colors.green.withValues(alpha: 0.2)
                  : Colors.orange.withValues(alpha: 0.2),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(10)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Icon(
                  matches ? Icons.check_circle : Icons.warning,
                  color: matches ? Colors.green : Colors.orange,
                  size: 20,
                ),
              ],
            ),
          ),
          // Values
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Scanned',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        hasScanned ? scannedValue : 'N/A',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: hasScanned ? Colors.black87 : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Database',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        hasDB ? dbValue : 'N/A',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: hasDB ? Colors.black87 : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanDataRow(String label, String? value) {
    final bool hasValue = value != null && value.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                hasValue ? Icons.check_circle : Icons.cancel,
                size: 18,
                color: hasValue ? Colors.green : Colors.red,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 26),
            child: Text(
              hasValue ? value : 'Not detected',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: hasValue ? Colors.black87 : Colors.red,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
