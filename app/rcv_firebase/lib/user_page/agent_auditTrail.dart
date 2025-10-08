import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

// Mock scan data model
class ScanRecord {
  final String id;
  final String type; // 'QR' or 'OCR'
  final String content;
  final DateTime timestamp;
  final String location;

  ScanRecord({
    required this.id,
    required this.type,
    required this.content,
    required this.timestamp,
    required this.location,
  });
}

class AuditTrailPage extends StatefulWidget {
  const AuditTrailPage({super.key});

  @override
  State<AuditTrailPage> createState() => _AuditTrailPageState();
}

class _AuditTrailPageState extends State<AuditTrailPage> {
  // Format date to readable string
  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day}, ${date.year} - ${hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} $period';
  }

  String _formatShortDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day}, ${hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} $period';
  }

  // Mock data - will be replaced with backend data later
  final List<ScanRecord> _mockScans = [
    ScanRecord(
      id: 'SCAN001',
      type: 'QR',
      content: 'https://example.com/product/12345',
      timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      location: 'Manila, Philippines',
    ),
    ScanRecord(
      id: 'SCAN002',
      type: 'OCR',
      content: 'Product Name: Premium Dog Food\nBrand: PetCare\nExpiry: 2025-12-31\nBatch: A12345',
      timestamp: DateTime.now().subtract(const Duration(days: 1)),
      location: 'Quezon City, Philippines',
    ),
    ScanRecord(
      id: 'SCAN003',
      type: 'QR',
      content: 'Product ID: ABC-XYZ-789\nStatus: Verified',
      timestamp: DateTime.now().subtract(const Duration(days: 2)),
      location: 'Makati, Philippines',
    ),
    ScanRecord(
      id: 'SCAN004',
      type: 'OCR',
      content: 'Ingredients: Chicken, Rice, Vegetables\nNet Weight: 1.5kg\nManufactured by: ABC Corp',
      timestamp: DateTime.now().subtract(const Duration(days: 3)),
      location: 'Pasig, Philippines',
    ),
    ScanRecord(
      id: 'SCAN005',
      type: 'QR',
      content: 'https://verify.product.com/item/67890',
      timestamp: DateTime.now().subtract(const Duration(days: 5)),
      location: 'Taguig, Philippines',
    ),
  ];

  void _showScanDetails(ScanRecord scan) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: app_colors.AppColors.primary,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        scan.type == 'QR' ? Icons.qr_code : Icons.text_fields,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${scan.type} Scan Details',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'ID: ${scan.id}',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                // Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDetailRow('Scan Type', scan.type),
                        const Divider(height: 24),
                        _buildDetailRow(
                          'Date & Time',
                          _formatDate(scan.timestamp),
                        ),
                        const Divider(height: 24),
                        _buildDetailRow('Location', scan.location),
                        const Divider(height: 24),
                        const Text(
                          'Scanned Content:',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.black54,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: SelectableText(
                            scan.content,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Footer
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.black54,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Scan History',
        user: 'Agent user',
        showBackButton: false,
      ),
      body: _mockScans.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history,
                    size: 80,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No scan records yet',
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _mockScans.length,
              itemBuilder: (context, index) {
                final scan = _mockScans[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(12),
                    leading: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: scan.type == 'QR'
                            ? app_colors.AppColors.primary.withOpacity(0.1)
                            : Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        scan.type == 'QR' ? Icons.qr_code_2 : Icons.text_snippet,
                        color: scan.type == 'QR'
                            ? app_colors.AppColors.primary
                            : Colors.blue,
                        size: 28,
                      ),
                    ),
                    title: Text(
                      scan.id,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          '${scan.type} Scan',
                          style: TextStyle(
                            color: scan.type == 'QR'
                                ? app_colors.AppColors.primary
                                : Colors.blue,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              _formatShortDate(scan.timestamp),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(Icons.location_on, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                scan.location,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    trailing: ElevatedButton(
                      onPressed: () => _showScanDetails(scan),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: app_colors.AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('View'),
                    ),
                  ),
                );
              },
            ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.user,
      ),
    );
  }
}
