import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../themes/app_fonts.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../widgets/navigation_bar.dart';

class ReportDetailPage extends StatelessWidget {
  final Map<String, dynamic> reportData;

  const ReportDetailPage({super.key, required this.reportData});

  @override
  Widget build(BuildContext context) {
    final scannedData = reportData['scannedData'] ?? {};
    final productSearchResult = reportData['productSearchResult'] ?? {};
    final location = reportData['location'] ?? {};
    final status = reportData['status'] ?? 'UNKNOWN';
    final nonComplianceReason = reportData['nonComplianceReason'];
    final additionalNotes = reportData['additionalNotes'];
    final frontImageUrl = reportData['frontImageUrl'];
    final backImageUrl = reportData['backImageUrl'];
    final ocrBlobText = reportData['ocrBlobText'];
    final createdAt = reportData['createdAt'] != null
        ? DateTime.parse(reportData['createdAt'])
        : null;

    final productName = scannedData['productName'] ?? 'Unknown Product';
    final brandName =
        scannedData['brand'] ?? scannedData['brandName'] ?? 'Unknown Brand';

    return Scaffold(
      appBar: TitleLogoHeaderAppBar(
        title: 'Report Details',
        showBackButton: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section with Status
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _getStatusColor(status).withValues(alpha: 0.1),
                border: Border(
                  bottom: BorderSide(
                    color: _getStatusColor(status).withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _getStatusIcon(status),
                        color: _getStatusColor(status),
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              productName,
                              style: AppFonts.titleStyle.copyWith(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              brandName,
                              style: AppFonts.contentStyle.copyWith(
                                color: Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _StatusBadge(status: status),
                  if (createdAt != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat(
                            'MMM dd, yyyy • hh:mm a',
                          ).format(createdAt),
                          style: AppFonts.labelStyle.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Product Information Section
            _buildSection('Product Information', Icons.inventory_2, [
              if (scannedData['productName'] != null)
                _buildDetailRow('Product Name', scannedData['productName']),
              if (brandName != 'Unknown Brand')
                _buildDetailRow('Brand', brandName),
              if (scannedData['batch'] != null)
                _buildDetailRow('Batch Number', scannedData['batch']),
              if (scannedData['expDate'] != null)
                _buildDetailRow('Expiration Date', scannedData['expDate']),
            ]),

            // Compliance Status Section
            if (nonComplianceReason != null || status != 'COMPLIANT')
              _buildSection('Compliance Status', Icons.shield, [
                if (nonComplianceReason != null)
                  _buildDetailRow(
                    'Issue',
                    _formatComplianceReason(nonComplianceReason),
                    isHighlight: true,
                  ),
                if (additionalNotes != null &&
                    additionalNotes.toString().isNotEmpty)
                  _buildDetailRow('Additional Notes', additionalNotes),
              ]),

            // Product Match Score Section
            if (productSearchResult['matchScore'] != null ||
                productSearchResult['productId'] != null)
              _buildSection('Product Verification', Icons.verified, [
                if (productSearchResult['matchScore'] != null)
                  _buildDetailRow(
                    'Match Score',
                    '${(productSearchResult['matchScore'] * 100).toStringAsFixed(1)}%',
                    widget: _MatchScoreBar(
                      score: productSearchResult['matchScore'].toDouble(),
                    ),
                  ),
                if (productSearchResult['productId'] != null)
                  _buildDetailRow(
                    'Product ID',
                    productSearchResult['productId'],
                  ),
              ]),

            // Location Section
            if (location['address'] != null ||
                location['latitude'] != null ||
                location['longitude'] != null)
              _buildSection('Location', Icons.location_on, [
                if (location['address'] != null)
                  _buildDetailRow('Address', location['address']),
                if (location['latitude'] != null &&
                    location['longitude'] != null)
                  _buildDetailRow(
                    'Coordinates',
                    '${location['latitude'].toStringAsFixed(6)}, ${location['longitude'].toStringAsFixed(6)}',
                  ),
              ]),

            // Images Section
            if (frontImageUrl != null || backImageUrl != null)
              _buildSection('Product Images', Icons.photo_library, [
                Row(
                  children: [
                    if (frontImageUrl != null)
                      Expanded(
                        child: _buildImageCard('Front', frontImageUrl, context),
                      ),
                    if (frontImageUrl != null && backImageUrl != null)
                      const SizedBox(width: 12),
                    if (backImageUrl != null)
                      Expanded(
                        child: _buildImageCard('Back', backImageUrl, context),
                      ),
                  ],
                ),
              ]),

            // OCR Data Section
            if (ocrBlobText != null && ocrBlobText.toString().isNotEmpty)
              _buildSection('Scanned Text (OCR)', Icons.text_fields, [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Text(
                    ocrBlobText,
                    style: AppFonts.contentStyle.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 13,
                    ),
                  ),
                ),
              ]),

            // Report ID Section (at bottom)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              color: Colors.grey.shade50,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report ID',
                    style: AppFonts.labelStyle.copyWith(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    reportData['_id'] ?? 'N/A',
                    style: AppFonts.contentStyle.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavBar(
        selectedIndex: 3,
        role: NavBarRole.user,
      ),
    );
  }

  Widget _buildSection(String title, IconData icon, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Text(
                title,
                style: AppFonts.titleStyle.copyWith(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    dynamic value, {
    bool isHighlight = false,
    Widget? widget,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppFonts.labelStyle.copyWith(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          if (widget != null)
            widget
          else
            Text(
              value?.toString() ?? 'N/A',
              style: AppFonts.contentStyle.copyWith(
                fontSize: 15,
                color: isHighlight ? Colors.red.shade700 : Colors.black87,
                fontWeight: isHighlight ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImageCard(String label, String imageUrl, BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppFonts.labelStyle.copyWith(
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) =>
                    _FullScreenImage(imageUrl: imageUrl, title: label),
              ),
            );
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey.shade200,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.broken_image,
                          size: 40,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Image not available',
                          style: AppFonts.labelStyle.copyWith(
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  );
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Container(
                    color: Colors.grey.shade100,
                    child: Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _formatComplianceReason(String reason) {
    // Convert snake_case to all caps with spaces
    return reason.replaceAll('_', ' ').toUpperCase();
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return Colors.green.shade600;
      case 'NON_COMPLIANT':
      case 'FRAUDULENT':
        return Colors.red.shade600;
      default:
        return Colors.blue.shade600;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return Icons.check_circle;
      case 'NON_COMPLIANT':
      case 'FRAUDULENT':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _getColor(status);
    final label = _getLabel(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getIcon(status), size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppFonts.labelStyle.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Color _getColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return Colors.green.shade600;
      case 'NON_COMPLIANT':
      case 'FRAUDULENT':
        return Colors.red.shade600;
      default:
        return Colors.blue.shade600;
    }
  }

  String _getLabel(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return 'COMPLIANT';
      case 'NON_COMPLIANT':
        return 'NON-COMPLIANT';
      case 'FRAUDULENT':
        return 'FRAUDULENT';
      default:
        return 'IN REVIEW';
    }
  }

  IconData _getIcon(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return Icons.verified;
      case 'NON_COMPLIANT':
      case 'FRAUDULENT':
        return Icons.warning;
      default:
        return Icons.pending;
    }
  }
}

class _MatchScoreBar extends StatelessWidget {
  final double score;
  const _MatchScoreBar({required this.score});

  @override
  Widget build(BuildContext context) {
    final percentage = (score * 100).toStringAsFixed(1);
    final color = score >= 0.8
        ? Colors.green.shade600
        : score >= 0.6
        ? Colors.orange.shade600
        : Colors.red.shade600;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: score,
            minHeight: 8,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _FullScreenImage extends StatelessWidget {
  final String imageUrl;
  final String title;

  const _FullScreenImage({required this.imageUrl, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: Image.network(
            imageUrl,
            errorBuilder: (context, error, stackTrace) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.broken_image,
                      size: 60,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Image not available',
                      style: AppFonts.contentStyle.copyWith(
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
