import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import 'package:rcv_firebase/services/api_service.dart';
import 'package:location/location.dart';
import 'dart:developer' as developer;

class ComplianceReportPage extends StatefulWidget {
  final Map<String, dynamic> scannedData;
  final Map<String, dynamic>? productSearchResult;
  final String? frontImageUrl;
  final String? backImageUrl;
  final String initialStatus; // 'COMPLIANT' or 'NON_COMPLIANT'
  final String? ocrBlobText; // Raw OCR text blob

  const ComplianceReportPage({
    super.key,
    required this.scannedData,
    this.productSearchResult,
    this.frontImageUrl,
    this.backImageUrl,
    required this.initialStatus,
    this.ocrBlobText,
  });

  @override
  State<ComplianceReportPage> createState() => _ComplianceReportPageState();
}

class _ComplianceReportPageState extends State<ComplianceReportPage> {
  String selectedStatus = 'COMPLIANT';
  String? selectedReason;
  final TextEditingController notesController = TextEditingController();
  bool isSubmitting = false;

  final List<Map<String, String>> nonComplianceReasons = [
    {'value': 'NO_LTO_NUMBER', 'label': 'No LTO Number'},
    {'value': 'NO_CFPR_NUMBER', 'label': 'No CFPR Number'},
    {'value': 'EXPIRED_PRODUCT', 'label': 'Expired Product'},
    {'value': 'COUNTERFEIT', 'label': 'Counterfeit/Fake'},
    {'value': 'MISLABELED', 'label': 'Mislabeled'},
    {'value': 'OTHERS', 'label': 'Others'},
  ];

  @override
  void initState() {
    super.initState();
    selectedStatus = widget.initialStatus;
    
    // Debug logging to check received parameters
    developer.log('🔍 ComplianceReportPage initialized');
    developer.log('Front Image URL received: ${widget.frontImageUrl ?? "NULL"}');
    developer.log('Back Image URL received: ${widget.backImageUrl ?? "NULL"}');
    developer.log('OCR Blob Text received: ${widget.ocrBlobText != null ? "${widget.ocrBlobText!.length} chars" : "NULL"}');
    
    // Don't prepopulate notes - let agent write their own observations
    // OCR text is automatically saved in backend
  }

  @override
  void dispose() {
    notesController.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    if (selectedStatus != 'COMPLIANT' && selectedReason == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a reason for non-compliance'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Ensure images are always present
    if (widget.frontImageUrl == null || widget.backImageUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error: Scan images are missing. Please scan again.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      isSubmitting = true;
    });

    try {
      // Get current location
      Location location = Location();
      LocationData? locationData;

      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
      }

      PermissionStatus permissionGranted = await location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await location.requestPermission();
      }

      if (serviceEnabled && permissionGranted == PermissionStatus.granted) {
        locationData = await location.getLocation();
      }

      // Prepare location data
      Map<String, dynamic>? locationJson;
      if (locationData != null) {
        locationJson = {
          'latitude': locationData.latitude,
          'longitude': locationData.longitude,
          'address': 'Retrieved from device', // Can be enhanced with reverse geocoding
        };
      }

      // Submit compliance report
      final apiService = ApiService();
      await apiService.submitComplianceReport(
        status: selectedStatus,
        scannedData: widget.scannedData,
        productSearchResult: widget.productSearchResult,
        nonComplianceReason: selectedReason,
        additionalNotes: notesController.text.trim().isNotEmpty
            ? notesController.text.trim()
            : null,
        frontImageUrl: widget.frontImageUrl,
        backImageUrl: widget.backImageUrl,
        location: locationJson,
        ocrBlobText: widget.ocrBlobText, // Pass OCR blob text to backend
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              selectedStatus == 'COMPLIANT'
                  ? 'Product marked as compliant'
                  : 'Non-compliance report submitted',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit report: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          isSubmitting = false;
        });
      }
    }
  }

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
          'Compliance Report',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Selection
                  Container(
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
                          'Compliance Status',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        RadioListTile<String>(
                          value: 'COMPLIANT',
                          // ignore: deprecated_member_use
                          groupValue: selectedStatus,
                          // ignore: deprecated_member_use
                          onChanged: (value) {
                            setState(() {
                              selectedStatus = value!;
                              selectedReason = null;
                            });
                          },
                          title: const Row(
                            children: [
                              Icon(Icons.check_circle, color: Colors.green),
                              SizedBox(width: 8),
                              Text('Compliant'),
                            ],
                          ),
                          activeColor: Colors.green,
                        ),
                        RadioListTile<String>(
                          value: 'NON_COMPLIANT',
                          // ignore: deprecated_member_use
                          groupValue: selectedStatus,
                          // ignore: deprecated_member_use
                          onChanged: (value) {
                            setState(() {
                              selectedStatus = value!;
                            });
                          },
                          title: const Row(
                            children: [
                              Icon(Icons.report_problem, color: Colors.orange),
                              SizedBox(width: 8),
                              Text('Non-Compliant'),
                            ],
                          ),
                          activeColor: Colors.orange,
                        ),
                        RadioListTile<String>(
                          value: 'FRAUDULENT',
                          // ignore: deprecated_member_use
                          groupValue: selectedStatus,
                          // ignore: deprecated_member_use
                          onChanged: (value) {
                            setState(() {
                              selectedStatus = value!;
                            });
                          },
                          title: const Row(
                            children: [
                              Icon(Icons.dangerous, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Fraudulent'),
                            ],
                          ),
                          activeColor: Colors.red,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Non-Compliance Reason (only show if not compliant)
                  if (selectedStatus != 'COMPLIANT') ...[
                    Container(
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
                          Row(
                            children: [
                              const Text(
                                'Reason',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Text(
                                '*',
                                style: TextStyle(color: Colors.red),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: selectedReason,
                            decoration: InputDecoration(
                              hintText: 'Select a reason',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 16,
                              ),
                            ),
                            items: nonComplianceReasons.map((reason) {
                              return DropdownMenuItem(
                                value: reason['value'],
                                child: Text(reason['label']!),
                              );
                            }).toList(),
                            onChanged: (value) {
                              setState(() {
                                selectedReason = value;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Additional Notes
                  Container(
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
                          'Agent Notes',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Optional - Add your observations or comments (OCR text is saved automatically)',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: notesController,
                          maxLines: 5,
                          maxLength: 500,
                          decoration: InputDecoration(
                            hintText: 'Enter your observations or notes...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Product Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.info_outline, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text(
                              'Scanned Product Summary',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildSummaryRow(
                          'Product',
                          widget.scannedData['productName'] ?? 'N/A',
                        ),
                        _buildSummaryRow(
                          'Brand',
                          widget.scannedData['brandName'] ?? 'N/A',
                        ),
                        _buildSummaryRow(
                          'LTO',
                          widget.scannedData['LTONumber'] ?? 'N/A',
                        ),
                        _buildSummaryRow(
                          'CFPR',
                          widget.scannedData['CFPRNumber'] ?? 'N/A',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Captured Product Images
                  if (widget.frontImageUrl != null || widget.backImageUrl != null)
                    Container(
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
                          const Row(
                            children: [
                              Icon(Icons.camera_alt, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Captured Product',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              if (widget.frontImageUrl != null)
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Front',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          widget.frontImageUrl!,
                                          height: 150,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Container(
                                              height: 150,
                                              color: Colors.grey[300],
                                              child: const Center(
                                                child: Icon(Icons.error),
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              if (widget.frontImageUrl != null && widget.backImageUrl != null)
                                const SizedBox(width: 12),
                              if (widget.backImageUrl != null)
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Back',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          widget.backImageUrl!,
                                          height: 150,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Container(
                                              height: 150,
                                              color: Colors.grey[300],
                                              child: const Center(
                                                child: Icon(Icons.error),
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 100), // Space for button
                ],
              ),
            ),
          ),

          // Submit Button (Fixed at bottom)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: isSubmitting ? null : _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  disabledBackgroundColor: Colors.grey,
                ),
                child: isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Submit Report',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
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
}
