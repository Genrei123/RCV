import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import '../services/ocr_service.dart';
// import '../widgets/gradient_header_app_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../services/api_service.dart';
import '../services/audit_log_service.dart';
import '../services/firebase_storage_service.dart';
import '../models/product.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';
import '../utils/tab_history.dart';
import '../pages/product_comparison_page.dart';
import '../pages/compliance_report_page.dart';

class QRScannerPage extends StatefulWidget {
  const QRScannerPage({super.key});

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage> {
  MobileScannerController cameraController = MobileScannerController();
  String result = '';
  bool isFlashOn = false;
  bool isScanning = true;
  bool isOCRMode = false;
  final ImagePicker _picker = ImagePicker();
  final TextRecognizer _textRecognizer = TextRecognizer();
  final OcrService _ocrService = OcrService();
  bool _useTesseract = true; // Switch engine; default to Tesseract

  // For dual image OCR
  String? _frontImagePath;
  String? _backImagePath;
  String? _frontImageUrl;
  String? _backImageUrl;
  String? _ocrBlobText; // Store raw OCR text for compliance reports

  @override
  void initState() {
    super.initState();
    _requestCameraPermission();
  }

  Future<void> _requestCameraPermission() async {
    final status = await Permission.camera.request();
    if (status.isDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Camera permission is required for scanning'),
          ),
        );
      }
    }
  }

  Widget _buildQrView(BuildContext context) {
    // If in OCR mode, show OCR interface instead of QR scanner
    if (isOCRMode) {
      return Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF005440),
              const Color(0xFF00796B),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    Icon(
                      Icons.text_fields,
                      size: 64,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'OCR Mode',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.3),
                        ),
                      ),
                      child: const Text(
                        'Please take a photo of the FRONT and BACK\nof the product label',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.amber,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Main content - centered with flex
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      width: double.infinity,
                      constraints: const BoxConstraints(maxWidth: 500),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _takePictureForOCR(true),
                            icon: const Icon(Icons.camera_alt, size: 24),
                            label: Text(
                              _frontImagePath == null
                                  ? 'Take Front Photo'
                                  : 'Front Photo ✓',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _frontImagePath == null
                                  ? const Color(0xFF005440)
                                  : Colors.green,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32,
                                vertical: 16,
                              ),
                              minimumSize: const Size(double.infinity, 56),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () => _takePictureForOCR(false),
                            icon: const Icon(Icons.camera_alt, size: 24),
                            label: Text(
                              _backImagePath == null
                                  ? 'Take Back Photo'
                                  : 'Back Photo ✓',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _backImagePath == null
                                  ? const Color(0xFF005440)
                                  : Colors.green,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32,
                                vertical: 16,
                              ),
                              minimumSize: const Size(double.infinity, 56),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                          if (_frontImagePath != null && _backImagePath != null) ...[
                            const SizedBox(height: 24),
                            const Divider(),
                            const SizedBox(height: 8),
                            const Text(
                              'Both photos captured!',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.green,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Text(
                              'Processing will start automatically',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Default QR scanner view
    return Stack(
      children: [
        SizedBox(
          width: double.infinity,
          height: double.infinity,
          child: MobileScanner(
            controller: cameraController,
            onDetect: (BarcodeCapture capture) {
              _onDetect(capture);
            },
          ),
        ),
        SizedBox(
          width: double.infinity,
          height: double.infinity,
          child: CustomPaint(painter: ScannerOverlayPainter()),
        ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Position QR code within the frame to scan',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
        String scannedData = barcode.rawValue!;
        if (result != scannedData) {
          setState(() {
            result = scannedData;
          });

          // Log scan to audit trail
          AuditLogService.logScanProduct(
            scanData: {'scannedData': scannedData, 'scanType': 'QR'},
          );

          // Show QR Code result in modal
          _showQRCodeModal(scannedData);
        }
        break;
      }
    }
  }

  void _showQRCodeModal(String qrData) {
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
                    color: const Color(0xFF005440),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.qr_code_2,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'QR Code Scanned',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
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
                        const Text(
                          'Scanned Content:',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildFormattedContent(qrData),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Clipboard.setData(
                                    ClipboardData(text: qrData),
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Copied to clipboard'),
                                      duration: Duration(seconds: 2),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.copy, size: 18),
                                label: const Text('Copy'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                  side: const BorderSide(
                                    color: Color(0xFF005440),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => Navigator.of(context).pop(),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF005440),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text('Close'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showErrorModal({
    required String title,
    required String message,
    String? error,
  }) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Colors.red.shade400, Colors.red.shade700],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: Colors.white,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        size: 64,
                        color: Colors.orange,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Something went wrong',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        message,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                          height: 1.5,
                        ),
                      ),
                      if (error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.code,
                                    size: 16,
                                    color: Colors.grey.shade600,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Technical Details',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                error,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      // Action Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.refresh, size: 20),
                          label: const Text('Try Again'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF005440),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 2,
                          ),
                        ),
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

  void _showExtractionFailedModal(String ocrText) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Colors.orange.shade400, Colors.orange.shade700],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: Colors.white,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Extraction Incomplete',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.info_outline,
                        size: 64,
                        color: Colors.orange,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Could not extract product information',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'We were able to scan the text, but could not automatically extract the product details.\n\n'
                        'This could be because:\n'
                        '• The label format is non-standard\n'
                        '• Required information is missing or unclear\n'
                        '• Text quality needs improvement\n\n'
                        'You can still view the raw OCR text below.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Action Buttons
                      Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                _showOCRModal(ocrText);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF005440),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 2,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.article_outlined, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'View Raw OCR Text',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                // Reset to allow user to try again
                                setState(() {
                                  _frontImagePath = null;
                                  _backImagePath = null;
                                });
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.grey.shade700,
                                side: BorderSide(
                                  color: Colors.grey.shade400,
                                  width: 1.5,
                                ),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.refresh, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'Try Again',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
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
      },
    );
  }

  void _showExtractedInfoModal(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.75,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF00A47D), Color(0xFF005440)],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Extracted Information',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
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
                        const Text(
                          'Please review the extracted information:',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.black54,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Product Name
                        _buildExtractedField(
                          'Product Name',
                          extractedInfo['productName'] ?? 'Not found',
                          Icons.inventory_2,
                          Colors.blue,
                        ),
                        const SizedBox(height: 12),

                        // LTO Number
                        _buildExtractedField(
                          'LTO Number',
                          extractedInfo['LTONumber'] ?? 'Not found',
                          Icons.badge,
                          Colors.orange,
                        ),
                        const SizedBox(height: 12),

                        // CFPR Number
                        _buildExtractedField(
                          'CFPR Number',
                          extractedInfo['CFPRNumber'] ?? 'Not found',
                          Icons.assignment,
                          Colors.teal,
                        ),
                        const SizedBox(height: 12),

                        // Expiration Date
                        _buildExtractedField(
                          'Expiration Date',
                          extractedInfo['expirationDate'] ?? 'Not found',
                          Icons.event_busy,
                          Colors.red,
                        ),
                        const SizedBox(height: 12),

                        // Manufacturer
                        _buildExtractedField(
                          'Manufacturer',
                          extractedInfo['manufacturer'] ?? 'Not found',
                          Icons.factory,
                          Colors.purple,
                        ),

                        const SizedBox(height: 24),

                        // Info Message
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.blue.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_rounded,
                                size: 20,
                                color: Colors.blue.shade700,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Review the extracted info, then search for the product in our database.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blue.shade900,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Action Buttons
                        Column(
                          children: [
                            // Search Product Button (Primary Action)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () => _searchProductInDatabase(
                                  extractedInfo,
                                  ocrText,
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF005440),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 2,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.search, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Search Product',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            // View OCR Text Button (Secondary Action)
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  _showOCRModal(ocrText);
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                  side: const BorderSide(
                                    color: Color(0xFF005440),
                                    width: 1.5,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.article_outlined, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'View Raw OCR Text',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Helper method to format scanned content
  Widget _buildFormattedContent(String qrData) {
    try {
      // Try to parse as JSON
      final Map<String, dynamic> data = jsonDecode(qrData);

      // If successful, display formatted data
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF005440), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (data.containsKey('company_name'))
              _buildInfoRow('Company Name:', data['company_name'] ?? 'N/A'),
            if (data.containsKey('product_name'))
              _buildInfoRow('Product Name:', data['product_name'] ?? 'N/A'),
            if (data.containsKey('brand_name'))
              _buildInfoRow('Brand Name:', data['brand_name'] ?? 'N/A'),
            if (data.containsKey('reg_number'))
              _buildInfoRow('Registration No:', data['reg_number'] ?? 'N/A'),
            if (data.containsKey('LTONumber'))
              _buildInfoRow('LTO Number:', data['LTONumber'] ?? 'N/A'),
            if (data.containsKey('CFPRNumber'))
              _buildInfoRow('CFPR Number:', data['CFPRNumber'] ?? 'N/A'),
            if (data.containsKey('expirationDate'))
              _buildInfoRow(
                'Expiration Date:',
                data['expirationDate'] ?? 'N/A',
              ),
            if (data.containsKey('manufacturer'))
              _buildInfoRow('Manufacturer:', data['manufacturer'] ?? 'N/A'),

            // Show any other fields
            ...data.entries
                .where(
                  (entry) => ![
                    'company_name',
                    'product_name',
                    'brand_name',
                    'reg_number',
                    'LTONumber',
                    'CFPRNumber',
                    'expirationDate',
                    'manufacturer',
                    'product_image',
                  ].contains(entry.key),
                )
                .map(
                  (entry) => _buildInfoRow(
                    '${entry.key}:',
                    entry.value?.toString() ?? 'N/A',
                  ),
                ),
          ],
        ),
      );
    } catch (e) {
      // If not JSON or parsing fails, show raw text
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: SelectableText(
          qrData,
          style: const TextStyle(
            fontSize: 15,
            color: Colors.black87,
            height: 1.5,
          ),
        ),
      );
    }
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExtractedField(
    String label,
    String value,
    IconData icon,
    MaterialColor color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color[50],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color[700], size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _searchProductInDatabase(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) async {
    try {
      // Close the extracted info modal
      Navigator.of(context).pop();

      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final apiService = ApiService();
      final searchResponse = await apiService.searchProductForCompliance(
        productName: extractedInfo['productName'],
        LTONumber: extractedInfo['LTONumber'],
        CFPRNumber: extractedInfo['CFPRNumber'],
        brandName: extractedInfo['brandName'],
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (searchResponse['success'] == true) {
        // Navigate to product comparison page
        final result = await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => ProductComparisonPage(
              scannedData: extractedInfo,
              databaseProduct: searchResponse['found'] == true 
                  ? searchResponse['product'] 
                  : null,
            ),
          ),
        );

        // Handle compliance report action
        if (result == 'COMPLIANT') {
          // Navigate to compliance report page with COMPLIANT status
          await _navigateToComplianceReport(extractedInfo, searchResponse, 'COMPLIANT');
        } else if (result == 'NON_COMPLIANT') {
          // Navigate to compliance report page with NON_COMPLIANT status
          await _navigateToComplianceReport(extractedInfo, searchResponse, 'NON_COMPLIANT');
        }
      } else {
        // Search failed
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(searchResponse['message'] ?? 'Failed to search product'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      // Close loading dialog if open
      if (mounted) Navigator.pop(context);

      print('Error searching product: $e');

      // Show user-friendly error modal with retry option
      if (mounted) {
        showDialog(
          context: context,
          builder: (BuildContext context) {
            return Dialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: Container(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Error Icon
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.search_off,
                        size: 40,
                        color: Colors.orange.shade700,
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Title
                    const Text(
                      'Search Failed',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Message
                    const Text(
                      'We couldn\'t search for the product at this time.\n\n'
                      'This might be due to a connection issue. '
                      'Please check your internet and try again.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.black54,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: const BorderSide(color: Color(0xFF005440)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF005440),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.of(context).pop();
                              // Retry the search
                              _searchProductInDatabase(extractedInfo, ocrText);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF005440),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Retry',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      }
    }
  }

  Future<void> _navigateToComplianceReport(
    Map<String, dynamic> extractedInfo,
    Map<String, dynamic> searchResponse,
    String initialStatus,
  ) async {
    // Debug logging to check state variables
    developer.log('🔍 Navigating to compliance report...');
    developer.log('Front Image URL: ${_frontImageUrl ?? "NULL"}');
    developer.log('Back Image URL: ${_backImageUrl ?? "NULL"}');
    developer.log('OCR Blob Text length: ${_ocrBlobText?.length ?? 0}');
    
    final success = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => ComplianceReportPage(
          scannedData: extractedInfo,
          productSearchResult: searchResponse['found'] == true 
              ? searchResponse['product'] 
              : null,
          frontImageUrl: _frontImageUrl,
          backImageUrl: _backImageUrl,
          initialStatus: initialStatus,
          ocrBlobText: _ocrBlobText, // Pass OCR blob text
        ),
      ),
    );

    // If successfully submitted compliance report, show success and reset
    if (success == true && mounted) {
      // Reset image URLs and OCR text
      setState(() {
        _frontImageUrl = null;
        _backImageUrl = null;
        _frontImagePath = null;
        _backImagePath = null;
        _ocrBlobText = null;
      });
    }
  }

  void _showOCRModal(String ocrText) {
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
                    color: const Color(0xFF005440),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.text_fields,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Text Extracted (OCR)',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
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
                        const Text(
                          'Extracted Text:',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[300]!),
                          ),
                          child: SelectableText(
                            ocrText.isEmpty
                                ? 'No text found in image'
                                : ocrText,
                            style: const TextStyle(
                              fontSize: 15,
                              color: Colors.black87,
                              height: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: ocrText.isEmpty
                                    ? null
                                    : () {
                                        Clipboard.setData(
                                          ClipboardData(text: ocrText),
                                        );
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          const SnackBar(
                                            content: Text(
                                              'Copied to clipboard',
                                            ),
                                            duration: Duration(seconds: 2),
                                          ),
                                        );
                                      },
                                icon: const Icon(Icons.copy, size: 18),
                                label: const Text('Copy'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                  side: const BorderSide(
                                    color: Color(0xFF005440),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => Navigator.of(context).pop(),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF005440),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text('Close'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showProductResultModal(List<Product> products, String ocrText) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        final product = products.first; // Display first product

        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.85,
              maxWidth: 500,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Success Header with gradient
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF00A47D), Color(0xFF005440)],
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.verified,
                              color: Colors.white,
                              size: 32,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Product Verified',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Authentic product found',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 28,
                            ),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Product Name Card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Colors.green[50]!, Colors.green[100]!],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.green[300]!,
                              width: 2,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.inventory_2,
                                    color: Colors.green[700],
                                    size: 24,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Product Name',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.green[700],
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                product.productName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Product Details Section
                        Text(
                          'Product Details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Details Grid
                        _buildDetailCard(
                          icon: Icons.business,
                          label: 'Brand Name',
                          value: product.brandName,
                          color: Colors.blue,
                        ),
                        const SizedBox(height: 12),

                        _buildDetailCard(
                          icon: Icons.factory,
                          label: 'Company',
                          value: product.companyName ?? 'N/A',
                          color: Colors.purple,
                        ),
                        const SizedBox(height: 12),

                        _buildDetailCard(
                          icon: Icons.badge,
                          label: 'LTO Number',
                          value: product.ltoNumber,
                          color: Colors.orange,
                        ),
                        const SizedBox(height: 12),

                        _buildDetailCard(
                          icon: Icons.assignment,
                          label: 'CFPR Number',
                          value: product.cfprNumber,
                          color: Colors.teal,
                        ),
                        const SizedBox(height: 12),

                        _buildDetailCard(
                          icon: Icons.qr_code,
                          label: 'Lot Number',
                          value: product.lotNumber,
                          color: Colors.indigo,
                        ),

                        const SizedBox(height: 24),

                        // Dates Section
                        Text(
                          'Important Dates',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Expanded(
                              child: _buildDateCard(
                                icon: Icons.event_available,
                                label: 'Registered',
                                date: product.dateOfRegistration,
                                color: Colors.green,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildDateCard(
                                icon: Icons.event_busy,
                                label: 'Expires',
                                date: product.expirationDate,
                                color: Colors.red,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // OCR Text Section (Collapsible)
                        Theme(
                          data: Theme.of(
                            context,
                          ).copyWith(dividerColor: Colors.transparent),
                          child: ExpansionTile(
                            tilePadding: EdgeInsets.zero,
                            title: Row(
                              children: [
                                Icon(
                                  Icons.text_snippet,
                                  color: Colors.grey[700],
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Scanned Text (OCR)',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[800],
                                  ),
                                ),
                              ],
                            ),
                            children: [
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: SelectableText(
                                  ocrText,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[800],
                                    height: 1.5,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Action Buttons
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  final productInfo =
                                      '''
Product: ${product.productName}
Brand: ${product.brandName}
LTO: ${product.ltoNumber}
CFPR: ${product.cfprNumber}
Lot: ${product.lotNumber}
Expiration: ${_formatDate(product.expirationDate)}
Registered: ${_formatDate(product.dateOfRegistration)}
''';
                                  Clipboard.setData(
                                    ClipboardData(text: productInfo),
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Product details copied'),
                                      duration: Duration(seconds: 2),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.copy, size: 18),
                                label: const Text('Copy Details'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                  side: const BorderSide(
                                    color: Color(0xFF005440),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => Navigator.of(context).pop(),
                                icon: const Icon(Icons.check, size: 18),
                                label: const Text('Done'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF005440),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 2,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailCard({
    required IconData icon,
    required String label,
    required String value,
    required MaterialColor color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color[50],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color[700], size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateCard({
    required IconData icon,
    required String label,
    required DateTime date,
    required MaterialColor color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color[200]!),
      ),
      child: Column(
        children: [
          Icon(icon, color: color[700], size: 28),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color[800],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _formatDate(date),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color[900],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _toggleFlash() async {
    await cameraController.toggleTorch();
    setState(() {
      isFlashOn = !isFlashOn;
    });
  }

  Future<void> _takePictureForOCR(bool isFront) async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      // Navigate to crop page to allow precise label cropping
      String? croppedPath;
      try {
        croppedPath =
            await Navigator.pushNamed(
                  context,
                  '/crop-label',
                  arguments: {'imagePath': image.path},
                )
                as String?;
      } catch (_) {}

      // If user canceled cropping, do nothing
      if (croppedPath == null || croppedPath.isEmpty) {
        return;
      }

      setState(() {
        if (isFront) {
          _frontImagePath = croppedPath;
        } else {
          _backImagePath = croppedPath;
        }
      });

      // If both images are selected, perform OCR on both
      if (_frontImagePath != null && _backImagePath != null) {
        await _performDualOCR(_frontImagePath!, _backImagePath!);
      }
    }
  }

  Future<void> _performDualOCR(
    String frontImagePath,
    String backImagePath,
  ) async {
    try {
      // Show loading indicator
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      String frontText = '';
      String backText = '';

      if (_useTesseract) {
        // Tesseract path using OcrService with smart auto-detection
        final File frontFile = File(frontImagePath);
        final File backFile = File(backImagePath);

        // Use smart OCR with automatic language detection
        developer.log('🔍 Processing front image with auto-detection...');
        final ocrFront = await _ocrService.smartOcr(
          frontFile,
          dpi: 300,
          saveResult: false,
        );
        
        developer.log('🔍 Processing back image with auto-detection...');
        final ocrBack = await _ocrService.smartOcr(
          backFile,
          dpi: 300,
          saveResult: false,
        );

        frontText = ocrFront.text;
        backText = ocrBack.text;

        developer.log('📊 Front OCR: ${ocrFront.language} - ${frontText.length} chars');
        developer.log('📊 Back OCR: ${ocrBack.language} - ${backText.length} chars');

        // If any side is too short, automatically fall back to ML Kit for that side only
        if (frontText.trim().length < 10) {
          // ignore: avoid_print
          print('Front OCR too short via Tesseract; falling back to ML Kit');
          final frontInputImage = InputImage.fromFilePath(frontImagePath);
          final RecognizedText frontRecognizedText = await _textRecognizer
              .processImage(frontInputImage);
          frontText = frontRecognizedText.text;
          // ignore: avoid_print
          print('Front ML Kit length: ${frontText.length}');
        }
        if (backText.trim().length < 10) {
          // ignore: avoid_print
          print('Back OCR too short via Tesseract; falling back to ML Kit');
          final backInputImage = InputImage.fromFilePath(backImagePath);
          final RecognizedText backRecognizedText = await _textRecognizer
              .processImage(backInputImage);
          backText = backRecognizedText.text;
          // ignore: avoid_print
          print('Back ML Kit length: ${backText.length}');
        }
      } else {
        // ML Kit engine for both
        final frontInputImage = InputImage.fromFilePath(frontImagePath);
        final RecognizedText frontRecognizedText = await _textRecognizer
            .processImage(frontInputImage);
        frontText = frontRecognizedText.text;

        final backInputImage = InputImage.fromFilePath(backImagePath);
        final RecognizedText backRecognizedText = await _textRecognizer
            .processImage(backInputImage);
        backText = backRecognizedText.text;
      }

      // Combine both texts with clear labels
      String combinedText =
          '--- FRONT OF LABEL ---\n\n$frontText\n\n--- BACK OF LABEL ---\n\n$backText';

      developer.log('Combined OCR Text length: ${combinedText.length}');

      // Check if we got meaningful text
      if (combinedText.trim().isEmpty || combinedText.trim().length < 20) {
        // Close loading dialog
        if (mounted) Navigator.pop(context);

        // Show error for insufficient text
        _showErrorModal(
          title: 'Insufficient Text Detected',
          message: 'Could not extract enough text from the images.\n\n'
              'Tips for better results:\n'
              '• Ensure good lighting\n'
              '• Hold the camera steady\n'
              '• Make sure the text is in focus\n'
              '• Try using flash if needed\n'
              '• Make sure labels are clearly visible',
        );

        // Reset image paths
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
        });
        return;
      }

      // Upload images to Firebase Storage before sending to API
      developer.log('📤 Uploading scan images to Firebase Storage...');
      String? frontImageUrl;
      String? backImageUrl;
      
      try {
        // Generate unique scan ID
        final scanId = 'scan_${DateTime.now().millisecondsSinceEpoch}';
        
        // Upload both images to Firebase Storage
        final uploadResults = await FirebaseStorageService.uploadScanImages(
          scanId: scanId,
          frontImage: File(frontImagePath),
          backImage: File(backImagePath),
        );
        
        frontImageUrl = uploadResults['frontUrl'];
        backImageUrl = uploadResults['backUrl'];
        
        developer.log('📥 Upload results: frontUrl=${frontImageUrl != null ? "✓" : "✗"}, backUrl=${backImageUrl != null ? "✓" : "✗"}');
        
        if (frontImageUrl != null && backImageUrl != null) {
          developer.log('✅ Images uploaded successfully');
          developer.log('Front: $frontImageUrl');
          developer.log('Back: $backImageUrl');
          
          // Store URLs in state for compliance reporting
          setState(() {
            _frontImageUrl = frontImageUrl;
            _backImageUrl = backImageUrl;
          });
          
          developer.log('✅ State updated - _frontImageUrl and _backImageUrl now set');
        } else {
          developer.log('⚠️ Image upload incomplete!');
          developer.log('   frontImageUrl: ${frontImageUrl ?? "NULL"}');
          developer.log('   backImageUrl: ${backImageUrl ?? "NULL"}');
          developer.log('   State variables will remain NULL!');
        }
      } catch (uploadError) {
        developer.log('❌ Error uploading images: $uploadError');
        // Continue without image URLs - images are optional
      }

      // Send to backend API for OCR processing with image URLs
      final apiService = ApiService();
      Map<String, dynamic> response;
      
      try {
        response = await apiService.scanProduct(
          combinedText,
          frontImageUrl: frontImageUrl,
          backImageUrl: backImageUrl,
        );
      } on ApiException catch (apiError) {
        // Close loading dialog
        if (mounted) Navigator.pop(context);

        developer.log('❌ API Exception: ${apiError.message}');
        developer.log('Status Code: ${apiError.statusCode}');
        developer.log('Details: ${apiError.details}');

        // Show user-friendly error modal (technical details only in logs)
        _showErrorModal(
          title: 'Unable to Process Image',
          message: 'We couldn\'t process the text from your images.\n\n'
              'This might be because:\n'
              '• The text wasn\'t clear enough\n'
              '• The image quality was too low\n'
              '• Connection issues occurred\n\n'
              'Please try scanning again with better lighting and focus.',
        );

        // Reset image paths
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
        });
        return;
      } catch (apiError) {
        // Close loading dialog
        if (mounted) Navigator.pop(context);

        developer.log('❌ General Error: $apiError');

        // Show generic error modal for other exceptions
        _showErrorModal(
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while processing the images.\n\n'
              'This could be due to:\n'
              '• Network connection issues\n'
              '• Server temporarily unavailable\n'
              '• Invalid response format\n\n'
              'Please check your internet connection and try again.',
          error: apiError.toString(),
        );

        // Reset image paths
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
        });
        return;
      }

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Check if extraction was successful
      if (response['success'] == true && response['extractedInfo'] != null) {
        final extractedInfo = response['extractedInfo'];

        // Store OCR blob text for compliance reports
        setState(() {
          _ocrBlobText = combinedText;
        });

        // Log OCR scan to audit trail with image URLs
        AuditLogService.logScanProduct(
          scanData: {
            'scannedText': combinedText.substring(
              0,
              combinedText.length > 500 ? 500 : combinedText.length,
            ),
            'scanType': 'OCR',
            'extractionSuccess': true,
            'extractedInfo': extractedInfo,
            if (frontImageUrl != null) 'frontImageUrl': frontImageUrl,
            if (backImageUrl != null) 'backImageUrl': backImageUrl,
          },
        );

        // Show extracted information to user with "Search Product" button
        _showExtractedInfoModal(extractedInfo, combinedText);
      } else {
        // Log failed OCR scan with image URLs
        AuditLogService.logScanProduct(
          scanData: {
            'scannedText': combinedText.substring(
              0,
              combinedText.length > 500 ? 500 : combinedText.length,
            ),
            'scanType': 'OCR',
            'extractionSuccess': false,
            if (frontImageUrl != null) 'frontImageUrl': frontImageUrl,
            if (backImageUrl != null) 'backImageUrl': backImageUrl,
          },
        );

        // Extraction failed - show info modal with option to view OCR text
        _showExtractionFailedModal(combinedText);
      }

      setState(() {
        result = combinedText;
      });

      // Reset image paths for next scan
      setState(() {
        _frontImagePath = null;
        _backImagePath = null;
      });
    } catch (e) {
      // Close loading dialog if open
      if (mounted) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }

      developer.log('❌ Error in dual OCR: $e');

      // Show error modal
      if (mounted) {
        _showErrorModal(
          title: 'OCR Error',
          message: 'Something went wrong while processing the images.\n\n'
              'This could be due to:\n'
              '• Poor image quality\n'
              '• Insufficient lighting\n'
              '• Text too small or blurry\n'
              '• Network connection issues\n\n'
              'Please try again with clearer images.',
          error: e.toString(),
        );
      }

      // Reset image paths
      setState(() {
        _frontImagePath = null;
        _backImagePath = null;
      });
    }
  }

  @override
  void dispose() {
    cameraController.dispose();
    _textRecognizer.close();
    super.dispose();
  }

  @override
  @override
  Widget build(BuildContext context) {
    // Check if scanning feature is disabled
    if (RemoteConfigService.isFeatureDisabled('disable_scanning_page')) {
      return const FeatureDisabledScreen(
        featureName: 'QR Code Scanning',
        icon: Icons.qr_code_scanner,
        selectedNavIndex: 2,
        navBarRole: NavBarRole.user,
      );
    }

    return WillPopScope(
      onWillPop: () async {
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
          return false;
        }
        return true;
      },
      child: Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'Scanning Page',
          showBackButton: false,
        ),
        body: Column(
          children: [
            Expanded(
              flex: 5,
              child: Container(
                width: double.infinity,
                margin: isOCRMode ? EdgeInsets.zero : const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: isOCRMode ? BorderRadius.zero : BorderRadius.circular(20),
                  boxShadow: isOCRMode ? [] : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: isOCRMode ? BorderRadius.zero : BorderRadius.circular(20),
                  child: _buildQrView(context),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: Icon(
                      isFlashOn ? Icons.flash_on : Icons.flash_off,
                      color: const Color(0xFF005440),
                    ),
                    onPressed: _toggleFlash,
                    tooltip: 'Toggle Flash',
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        isOCRMode = !isOCRMode;
                      });
                    },
                    icon: Icon(
                      Icons.text_fields,
                      color: isOCRMode ? Colors.white : const Color(0xFF005440),
                    ),
                    label: Text(isOCRMode ? 'Exit OCR' : 'OCR Mode'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isOCRMode
                          ? const Color(0xFF005440)
                          : Colors.white,
                      foregroundColor: isOCRMode
                          ? Colors.white
                          : const Color(0xFF005440),
                      side: BorderSide(color: const Color(0xFF005440)),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Result display removed - now using modals instead
          ],
        ),
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: 2,
          role: NavBarRole.user, // Simplified to always use user role
        ),
      ),
    );
  }
}

// Custom painter for scanner overlay
class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    final scanAreaSize = size.width * 0.7;
    final left = (size.width - scanAreaSize) / 2;
    final top = (size.height - scanAreaSize) / 2;
    final scanRect = Rect.fromLTWH(left, top, scanAreaSize, scanAreaSize);

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(20)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    final cornerPaint = Paint()
      ..color = const Color(0xFF005440)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final cornerLength = 20.0;
    final cornerRadius = 20.0;

    // Top-left corner
    canvas.drawPath(
      Path()
        ..moveTo(left, top + cornerLength)
        ..arcToPoint(
          Offset(left + cornerRadius, top),
          radius: const Radius.circular(20),
        )
        ..lineTo(left + cornerLength, top),
      cornerPaint,
    );

    // Top-right corner
    canvas.drawPath(
      Path()
        ..moveTo(left + scanAreaSize - cornerLength, top)
        ..arcToPoint(
          Offset(left + scanAreaSize, top + cornerRadius),
          radius: const Radius.circular(20),
        )
        ..lineTo(left + scanAreaSize, top + cornerLength),
      cornerPaint,
    );

    // Bottom-left corner
    canvas.drawPath(
      Path()
        ..moveTo(left, top + scanAreaSize - cornerLength)
        ..arcToPoint(
          Offset(left + cornerRadius, top + scanAreaSize),
          radius: const Radius.circular(20),
        )
        ..lineTo(left + cornerLength, top + scanAreaSize),
      cornerPaint,
    );

    // Bottom-right corner
    canvas.drawPath(
      Path()
        ..moveTo(left + scanAreaSize - cornerLength, top + scanAreaSize)
        ..arcToPoint(
          Offset(left + scanAreaSize, top + scanAreaSize - cornerRadius),
          radius: const Radius.circular(20),
        )
        ..lineTo(left + scanAreaSize, top + scanAreaSize - cornerLength),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
