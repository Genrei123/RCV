import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/ocr_service.dart';
import '../services/firebase_storage_service.dart';
// import '../widgets/gradient_header_app_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../services/api_service.dart';
import '../services/audit_log_service.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';
import '../utils/tab_history.dart';
import '../pages/compliance_report_page.dart';
import '../services/draft_service.dart';

class QRScannerPage extends StatefulWidget {
  const QRScannerPage({super.key});

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}


class _QRScannerPageState extends State<QRScannerPage> with WidgetsBindingObserver {
  MobileScannerController cameraController = MobileScannerController();
  String result = '';
  bool isFlashOn = false;
  bool isScanning = true;
  bool isOCRMode = false;
  final ImagePicker _picker = ImagePicker();
  final TextRecognizer _textRecognizer = TextRecognizer();
  final OcrService _ocrService = OcrService();
  final bool _useTesseract = true; // Switch engine; default to Tesseract
  final ApiService _apiService = ApiService();

  // For dual image OCR
  String? _frontImagePath;
  String? _backImagePath;
  String? _frontImageUrl; // Firebase URL
  String? _backImageUrl; // Firebase URL
  String? _ocrBlobText; // Store raw OCR text for compliance reports
  bool _isProcessingOCR = false; // Guard against duplicate processing
  DateTime? _lastErrorTime; // Debounce errors to prevent spam
  Map<String, dynamic>? _extractedInfo; // Store extracted info for re-display

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _requestCameraPermission();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Handle app lifecycle changes to fix black screen after timeout
    if (!isOCRMode) {
      if (state == AppLifecycleState.resumed) {
        // Restart camera when app resumes
        developer.log('📱 App resumed - restarting camera');
        cameraController.start();
      } else if (state == AppLifecycleState.paused) {
        // Stop camera when app is paused to save resources
        developer.log('📱 App paused - stopping camera');
        cameraController.stop();
      }
    }
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
            colors: [const Color(0xFF005440), const Color(0xFF00796B)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header section
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 20,
                ),
                child: Column(
                  children: [
                    Icon(Icons.text_fields, size: 64, color: Colors.white),
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
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.3),
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
                            color: Colors.black.withValues(alpha: 0.1),
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
                          if (_frontImagePath != null &&
                              _backImagePath != null) ...[
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
                          // View Scanned Details button - appears after OCR processing
                          if (_extractedInfo != null && _ocrBlobText != null) ...[
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _showExtractedInfoModal(_extractedInfo!, _ocrBlobText!),
                              icon: const Icon(Icons.visibility, size: 20),
                              label: const Text(
                                'View Scanned Details',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade600,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 24,
                                  vertical: 12,
                                ),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
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
              color: Colors.black.withValues(alpha: 0.7),
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
        // Always process the scan - don't skip duplicate scans
        // Reset result to empty after showing modal to allow re-scanning
        setState(() {
          result = scannedData;
        });

        // Log scan to audit trail
        AuditLogService.logScanProduct(
          scanData: {'scannedData': scannedData, 'scanType': 'QR'},
        );

        // Show QR Code result in modal
        _showQRCodeModal(scannedData);
        break;
      }
    }
  }

  /// Check if QR data is a certificate and extract the certificate ID
  String? _extractCertificateId(String qrData) {
    try {
      final Map<String, dynamic> data = jsonDecode(qrData);
      // Check if this is a certificate QR code
      if (data.containsKey('certificateId') &&
          data.containsKey('type') &&
          (data['type'] == 'company-certificate' ||
              data['type'] == 'product-certificate')) {
        return data['certificateId'] as String?;
      }
    } catch (e) {
      // Not JSON or doesn't have certificate fields
    }
    return null;
  }

  /// Open the original PDF certificate in browser
  Future<void> _openCertificatePDF(String certificateId) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: Color(0xFF005440)),
        ),
      );

      // Fetch PDF URL from API
      final response = await ApiService.getCertificatePDFUrl(certificateId);

      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading

      if (response['success'] == true && response['certificate'] != null) {
        final pdfUrl = response['certificate']['pdfUrl'] as String?;
        if (pdfUrl != null && pdfUrl.isNotEmpty) {
          // Open PDF in browser
          final uri = Uri.parse(pdfUrl);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          } else {
            _showErrorSnackBar('Could not open PDF');
          }
        } else {
          _showErrorSnackBar('PDF URL not available');
        }
      } else {
        _showErrorSnackBar(response['message'] ?? 'Failed to get PDF');
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Close loading if still showing
        _showErrorSnackBar('Error: $e');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    
    // Debounce errors - don't show if we showed one less than 2 seconds ago
    final now = DateTime.now();
    if (_lastErrorTime != null && now.difference(_lastErrorTime!).inSeconds < 2) {
      developer.log('⏳ Error debounced: $message');
      return;
    }
    _lastErrorTime = now;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showQRCodeModal(String qrData) {
    final certificateId = _extractCertificateId(qrData);
    final isCertificate = certificateId != null;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isCertificate
                        ? const Color(0xFF005440)
                        : const Color(0xFF005440),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isCertificate ? Icons.verified : Icons.qr_code_2,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          isCertificate
                              ? 'Certificate Scanned'
                              : 'QR Code Scanned',
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
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Certificate badge if it's a certificate
                        if (isCertificate) ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(
                                0xFF005440,
                              ).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFF005440),
                                width: 2,
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.workspace_premium,
                                  color: Color(0xFF005440),
                                  size: 40,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'RCV Certificate',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF005440),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        certificateId,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[600],
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

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

                        // View Original PDF button for certificates
                        if (isCertificate) ...[
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.of(context).pop();
                                _openCertificatePDF(certificateId);
                              },
                              icon: const Icon(Icons.picture_as_pdf, size: 20),
                              label: const Text('View Original PDF'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00796B),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Compare the printed certificate with the original electronic version',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                              fontStyle: FontStyle.italic,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                        ],

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
    ).then((_) {
      // Reset result when modal is closed to allow re-scanning the same QR code
      if (mounted) {
        setState(() {
          result = '';
        });
      }
    });
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
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
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
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
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

  void _showNoResultModal(String ocrText) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            padding: const EdgeInsets.all(24),
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.search_off,
                    size: 48,
                    color: Colors.orange.shade700,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'No Results Found',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'We couldn\'t find a matching product in our database based on the scanned text.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.black54,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF005440),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Scan Again',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _showOCRModal(ocrText);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF005440),
                      side: const BorderSide(color: Color(0xFF005440)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('View Scanned Text'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _summarizeProduct(String ocrText) async {
    try {
      // Show loading indicator with descriptive text
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                CircularProgressIndicator(color: Color(0xFF005440)),
                SizedBox(height: 16),
                Text(
                  'Generating AI Summary...',
                  style: TextStyle(color: Color(0xFF005440), fontSize: 16, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Text(
                  'This may take a moment',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      );

      final result = await _apiService.summarizeProduct(ocrText);
      
      // Close loading indicator
      if (mounted) Navigator.of(context).pop();

      if (mounted && result['success'] == true) {
        final aiSummary = result['aiSummary'];
        _showSummaryModal(aiSummary);
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Close loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate summary: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showSummaryModal(Map<String, dynamic> aiSummary) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue.shade700, Colors.blue.shade900],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: Colors.white),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'AI Product Summary',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
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
                        _buildExtractedField(
                          'Product Name',
                          aiSummary['productName'] ?? 'N/A',
                          Icons.inventory_2,
                          Colors.blue,
                        ),
                        const SizedBox(height: 12),
                        _buildExtractedField(
                          'LTO Number',
                          aiSummary['LTONum'] ?? 'N/A',
                          Icons.badge,
                          Colors.orange,
                        ),
                        const SizedBox(height: 12),
                        _buildExtractedField(
                          'CFPR Number',
                          aiSummary['CFPRNum'] ?? 'N/A',
                          Icons.assignment,
                          Colors.teal,
                        ),
                        const SizedBox(height: 12),
                        _buildExtractedField(
                          'Manufacturer',
                          aiSummary['ManufacturedBy'] ?? 'N/A',
                          Icons.factory,
                          Colors.purple,
                        ),
                        const SizedBox(height: 12),
                         _buildExtractedField(
                          'Expiry Date',
                          aiSummary['ExpiryDate'] ?? 'N/A',
                          Icons.event_busy,
                          Colors.red,
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

  void _showExtractedInfoModal(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) {
    final isCompliant = extractedInfo['isCompliant'] ?? true;
    final violations = extractedInfo['violations'] as List<dynamic>? ?? [];
    final warnings = extractedInfo['warnings'] as List<dynamic>? ?? [];
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.85,
              maxWidth: MediaQuery.of(context).size.width * 0.95,
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
                      colors: isCompliant 
                        ? [Color(0xFF00A47D), Color(0xFF005440)]
                        : [Colors.orange.shade600, Colors.red.shade600],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isCompliant ? Icons.check_circle_outline : Icons.warning_amber_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          isCompliant ? 'Product Compliant' : 'Compliance Violations',
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
                // Content - Scrollable
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Violations Section
                        if (violations.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.shade300, width: 2),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'VIOLATIONS FOUND',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.red.shade900,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ...violations.map((v) => Padding(
  padding: const EdgeInsets.only(top: 4),
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('• ', style: TextStyle(fontSize: 16)),
      Expanded(
        child: Text(
          v.toString(),
          style: TextStyle(
            fontSize: 13,
            color: Colors.red.shade900,
          ),
        ),
      ),
    ],
  ),
)),
                          const SizedBox(height: 16),
                        ],
                        
                        // Warnings Section
                        if (warnings.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange.shade300),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'WARNINGS',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange.shade900,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
...warnings.map((w) => Padding(
  padding: const EdgeInsets.only(top: 4),
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('• ', style: TextStyle(fontSize: 16)),
      Expanded(
        child: Text(
          w.toString(),
          style: TextStyle(
            fontSize: 13,
            color: Colors.orange.shade900,
          ),
        ),
      ),
    ],
  ),
)),
                        ],
                        
                        Text(
                          isCompliant 
                            ? 'Packaging information verified:'
                            : 'Information found on packaging:',
                          style: const TextStyle(
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

                        // Brand Name
                        _buildExtractedField(
                          'Brand Name',
                          extractedInfo['brandName'] ?? 'Not found',
                          Icons.branding_watermark,
                          Colors.indigo,
                        ),
                        const SizedBox(height: 12),

                        // Company
                        _buildExtractedField(
                          'Company',
                          extractedInfo['company'] ?? 'Not found',
                          Icons.business,
                          Colors.deepPurple,
                        ),
                        const SizedBox(height: 12),

                        // LTO Number
                        _buildComplianceField(
                          'LTO Number',
                          extractedInfo['LTONumber'] ?? 'Not found',
                          Icons.badge,
                          extractedInfo['LTONumber']?.toString().contains('NOT FOUND') == true ? Colors.red : Colors.orange,
                          extractedInfo['LTONumber']?.toString().contains('NOT FOUND') == true,
                        ),
                        const SizedBox(height: 12),

                        // CFPR Number
                        _buildComplianceField(
                          'CFPR Number',
                          extractedInfo['CFPRNumber'] ?? 'Not found',
                          Icons.assignment,
                          extractedInfo['CFPRNumber']?.toString().contains('NOT FOUND') == true ? Colors.red : Colors.teal,
                          extractedInfo['CFPRNumber']?.toString().contains('NOT FOUND') == true,
                        ),
                        const SizedBox(height: 12),

                        // Expiration Date
                        _buildComplianceField(
                          'Expiration Date',
                          extractedInfo['expirationDate'] ?? 'Not found',
                          Icons.event_busy,
                          extractedInfo['expirationDate']?.toString().contains('NOT FOUND') == true ? Colors.red : Colors.green,
                          extractedInfo['expirationDate']?.toString().contains('NOT FOUND') == true,
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
                                  'Review the compliance information above. Use "More Details (AI)" for guidance on what to look for on the product packaging.',
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
                            // Conduct Report Button (Primary Action)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () =>
                                    _conductReport(extractedInfo, ocrText),
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
                                    Icon(Icons.assignment, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Conduct Report',
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
                            // Set as Draft Button
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () =>
                                    _saveAsDraft(extractedInfo, ocrText),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange.shade600,
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
                                    Icon(Icons.save_outlined, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Set as Draft',
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
                            // More Details Button (AI Summary)
                             SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () => _summarizeProduct(ocrText),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue.shade600,
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
                                  children: [
                                    Icon(Icons.auto_awesome, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'More Details (AI)',
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
                                  children: [
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

      // Check if this is a v2.0 RCV Certificate with blockchain data
      if (data.containsKey('type') &&
          data['type'] == 'RCV_CERTIFICATE' &&
          data.containsKey('version')) {
        return _buildCertificateV2Content(data);
      }

      // Legacy format - display formatted data
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

  // Build content for v2.0 blockchain certificate format
  Widget _buildCertificateV2Content(Map<String, dynamic> data) {
    final entity = data['entity'] as Map<String, dynamic>?;
    final approvers = data['approvers'] as List<dynamic>?;
    final entityType = data['entityType'] as String?;
    final transactionHash = data['transactionHash'] as String?;
    final blockNumber = data['blockNumber'];
    final verifiedAt = data['verifiedAt'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Blockchain Verification Badge
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color(0xFF005440), const Color(0xFF00796B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified, color: Colors.white, size: 24),
                  SizedBox(width: 8),
                  Text(
                    'Blockchain Verified',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Version ${data['version'] ?? '2.0'}',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 12,
                ),
              ),
              if (blockNumber != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Block #$blockNumber',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 11,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Transaction Hash (if available)
        if (transactionHash != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.tag, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      'Transaction Hash',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  transactionHash,
                  style: const TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: Colors.black87,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Entity Details Section
        if (entity != null) ...[
          _buildSectionHeader(
            entityType == 'product' ? 'Product Details' : 'Company Details',
            entityType == 'product' ? Icons.inventory_2 : Icons.business,
          ),
          const SizedBox(height: 8),
          Container(
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
                if (entityType == 'product') ...[
                  if (entity['productName'] != null)
                    _buildInfoRow('Product Name:', entity['productName']),
                  if (entity['brandName'] != null)
                    _buildInfoRow('Brand Name:', entity['brandName']),
                  if (entity['companyName'] != null)
                    _buildInfoRow('Company:', entity['companyName']),
                  if (entity['registrationNumber'] != null)
                    _buildInfoRow(
                      'Registration No:',
                      entity['registrationNumber'],
                    ),
                  if (entity['LTONumber'] != null)
                    _buildInfoRow('LTO Number:', entity['LTONumber']),
                  if (entity['CFPRNumber'] != null)
                    _buildInfoRow('CFPR Number:', entity['CFPRNumber']),
                  if (entity['manufacturer'] != null)
                    _buildInfoRow('Manufacturer:', entity['manufacturer']),
                  if (entity['expirationDate'] != null)
                    _buildInfoRowWithIcon(
                      'Expiration:',
                      _formatDate(entity['expirationDate']),
                      _isExpired(entity['expirationDate'])
                          ? Icons.warning_amber
                          : Icons.event_available,
                      _isExpired(entity['expirationDate'])
                          ? Colors.red
                          : Colors.green,
                    ),
                ] else ...[
                  // Company details
                  if (entity['companyName'] != null)
                    _buildInfoRow('Company Name:', entity['companyName']),
                  if (entity['companyAddress'] != null)
                    _buildInfoRow('Address:', entity['companyAddress']),
                  if (entity['companyLTONumber'] != null)
                    _buildInfoRow('LTO Number:', entity['companyLTONumber']),
                  if (entity['companyLTOExpiryDate'] != null)
                    _buildInfoRowWithIcon(
                      'LTO Expiry:',
                      _formatDate(entity['companyLTOExpiryDate']),
                      _isExpired(entity['companyLTOExpiryDate'])
                          ? Icons.warning_amber
                          : Icons.event_available,
                      _isExpired(entity['companyLTOExpiryDate'])
                          ? Colors.red
                          : Colors.green,
                    ),
                  if (entity['companyContactNumber'] != null)
                    _buildInfoRow('Contact:', entity['companyContactNumber']),
                  if (entity['companyContactEmail'] != null)
                    _buildInfoRow('Email:', entity['companyContactEmail']),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Approvers Section
        if (approvers != null && approvers.isNotEmpty) ...[
          _buildSectionHeader('Certificate Approvers', Icons.verified_user),
          const SizedBox(height: 8),
          ...approvers.asMap().entries.map((entry) {
            final index = entry.key;
            final approver = entry.value as Map<String, dynamic>;
            return _buildApproverCard(approver, index + 1);
          }),
        ],

        // Verification Timestamp
        if (verifiedAt != null) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.blue[700]),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Verified at: ${_formatDateTime(verifiedAt)}',
                    style: TextStyle(fontSize: 12, color: Colors.blue[700]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF005440)),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFF005440),
          ),
        ),
      ],
    );
  }

  Widget _buildApproverCard(Map<String, dynamic> approver, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFF005440),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    '$index',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  approver['name'] ?? 'Unknown Approver',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),
              Icon(Icons.check_circle, size: 18, color: Colors.green[600]),
            ],
          ),
          const SizedBox(height: 8),
          if (approver['walletAddress'] != null) ...[
            Row(
              children: [
                Icon(
                  Icons.account_balance_wallet,
                  size: 12,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    approver['walletAddress'],
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: Colors.grey[600],
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          if (approver['approvedAt'] != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.schedule, size: 12, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  'Approved: ${_formatDateTime(approver['approvedAt'])}',
                  style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRowWithIcon(
    String label,
    String value,
    IconData icon,
    Color iconColor,
  ) {
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
          Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: iconColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'N/A';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  String _formatDateTime(String? dateString) {
    if (dateString == null) return 'N/A';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateString;
    }
  }

  bool _isExpired(String? dateString) {
    if (dateString == null) return false;
    try {
      final date = DateTime.parse(dateString);
      return date.isBefore(DateTime.now());
    } catch (e) {
      return false;
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
            color: Colors.black.withValues(alpha: 0.03),
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

  // Compliance field with violation indicator
  Widget _buildComplianceField(
    String label,
    String value,
    IconData icon,
    MaterialColor color,
    bool isViolation,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isViolation ? Colors.red.shade300 : Colors.grey[300]!,
          width: isViolation ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isViolation 
              ? Colors.red.withValues(alpha: 0.1)
              : Colors.black.withValues(alpha: 0.03),
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
              color: isViolation ? Colors.red.shade50 : color[50],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isViolation ? Icons.error_outline : icon, 
              color: isViolation ? Colors.red.shade700 : color[700], 
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[600],
                      ),
                    ),
                    if (isViolation) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.red.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'MISSING',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade900,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: isViolation ? Colors.red.shade900 : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Save scan as draft (without Firebase upload)
  Future<void> _saveAsDraft(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) async {
    try {
      // Close the extracted info modal
      Navigator.of(context).pop();

      // Save draft with local image paths
      final draftData = {
        'scannedData': extractedInfo,
        'productSearchResult': {'found': false, 'product': null},
        'initialStatus': 'NON_COMPLIANT',
        'localFrontPath': _frontImagePath,
        'localBackPath': _backImagePath,
        'ocrBlobText': _ocrBlobText ?? ocrText,
        'savedAt': DateTime.now().toIso8601String(),
      };

      await DraftService.saveDraft(draftData);

      developer.log('📝 Scan saved as draft');

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Saved to My Drafts'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }

      // Reset the scan state for next scan
      setState(() {
        _frontImagePath = null;
        _backImagePath = null;
        _frontImageUrl = null;
        _backImageUrl = null;
        _ocrBlobText = null;
        _extractedInfo = null;
      });
    } catch (e) {
      developer.log('Error saving draft: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving draft: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // New function to go directly to compliance report (skipping product search/comparison)
  Future<void> _conductReport(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) async {
    try {
      // Validate Images are available before proceeding (local paths)
      if (_frontImagePath == null || _backImagePath == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Error: Images not captured. Please scan again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Close the extracted info modal
      Navigator.of(context).pop();

      // Show loading dialog while uploading images
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => Center(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  CircularProgressIndicator(color: Color(0xFF005440)),
                  SizedBox(height: 16),
                  Text(
                    'Uploading images...',
                    style: TextStyle(color: Color(0xFF005440), fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
        );
      }

      // Upload images to Firebase before conducting report
      String? uploadedFrontUrl;
      String? uploadedBackUrl;
      
      try {
        final scanId = DateTime.now().millisecondsSinceEpoch.toString();
        final uploadResult = await FirebaseStorageService.uploadScanImages(
          scanId: scanId,
          frontImage: File(_frontImagePath!),
          backImage: File(_backImagePath!),
        );
        
        uploadedFrontUrl = uploadResult['frontUrl'];
        uploadedBackUrl = uploadResult['backUrl'];
        
        developer.log('📤 Images uploaded - Front: $uploadedFrontUrl, Back: $uploadedBackUrl');
      } catch (uploadError) {
        developer.log('⚠️ Image upload failed: $uploadError');
        // Continue with local paths if upload fails
      }

      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      // Navigate to compliance report page with Firebase URLs (or local paths as fallback)
      await _navigateToComplianceReport(
        extractedInfo,
        {'found': false, 'product': null},
        'NON_COMPLIANT',
        frontImageUrl: uploadedFrontUrl,
        backImageUrl: uploadedBackUrl,
        localFrontPath: _frontImagePath,
        localBackPath: _backImagePath,
        ocrBlobText: _ocrBlobText,
      );

      // Reset state for next scan after successful navigation
      setState(() {
        _frontImagePath = null;
        _backImagePath = null;
        _frontImageUrl = null;
        _backImageUrl = null;
        _ocrBlobText = null;
        _extractedInfo = null;
      });
    } catch (e) {
      developer.log('Error conducting report: $e');

      // Close any open dialogs
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening report: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  // Navigate to compliance report page
  Future<void> _navigateToComplianceReport(
    Map<String, dynamic> extractedInfo,
    Map<String, dynamic> searchResponse,
    String status, {
    String? frontImageUrl,
    String? backImageUrl,
    String? localFrontPath,
    String? localBackPath,
    String? ocrBlobText,
  }) async {
    try {
      final success = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (context) => ComplianceReportPage(
            scannedData: extractedInfo,
            productSearchResult: searchResponse,
            initialStatus: status,
            frontImageUrl: frontImageUrl,
            backImageUrl: backImageUrl,
             // Pass local paths for deferred upload
            localFrontPath: localFrontPath,
            localBackPath: localBackPath,
            ocrBlobText: ocrBlobText,
          ),
        ),
      );

      // If report was submitted successfully, reset scan state
      if (success == true && mounted) {
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
          _frontImageUrl = null;
          _backImageUrl = null;
          _ocrBlobText = null;
        });

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Compliance report submitted successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      developer.log('Error navigating to compliance report: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  // Show OCR results modal
  void _showOCRModal(String frontText, [String? backText]) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
              maxWidth: 500,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF005440),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.text_snippet, color: Colors.white),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'OCR Results',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
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
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: backText != null
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Front Image Text:',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: SelectableText(
                                  frontText.isEmpty
                                      ? 'No text detected'
                                      : frontText,
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Back Image Text:',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: SelectableText(
                                  backText.isEmpty
                                      ? 'No text detected'
                                      : backText,
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ),
                            ],
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Scanned Text:',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: SelectableText(
                                  frontText.isEmpty
                                      ? 'No text detected'
                                      : frontText,
                                  style: const TextStyle(fontSize: 14),
                                ),
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

  // ignore: unused_element
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
            color: Colors.black.withValues(alpha: 0.03),
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

  // ignore: unused_element
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
            _formatDateFromDateTime(date),
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

  String _formatDateFromDateTime(DateTime date) {
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
    if (image == null) return;

    // Just save the path locally - we'll upload both images together after OCR
    setState(() {
      if (isFront) {
        _frontImagePath = image.path;
      } else {
        _backImagePath = image.path;
      }
    });

    // Navigate to crop page for visual adjustment (optional)
    if (!mounted) return;
    try {
      await Navigator.pushNamed(
        context,
        '/crop-label',
        arguments: {'imagePath': image.path},
      );
    } catch (_) {}

    // If both images are captured, proceed directly to OCR (upload deferred)
    if (_frontImagePath != null && _backImagePath != null) {
      await _performDualOCR(_frontImagePath!, _backImagePath!);
    }
  }

  Future<void> _performDualOCR(
    String frontImagePath,
    String backImagePath,
  ) async {
    // Guard against duplicate/rapid calls
    if (_isProcessingOCR) {
      developer.log('⚠️ OCR already in progress, ignoring duplicate call');
      return;
    }
    
    _isProcessingOCR = true;
    
    try {
      // Clear previous scan data to prevent stale state/infinite loading loop
      setState(() {
        _ocrBlobText = null;
        // Do NOT clear image paths here as we need them for processing
      });

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

        developer.log(
          '📊 Front OCR: ${ocrFront.language} - ${frontText.length} chars',
        );
        developer.log(
          '📊 Back OCR: ${ocrBack.language} - ${backText.length} chars',
        );

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
          message:
              'Could not extract enough text from the images.\n\n'
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

      // Upload images to Firebase immediately after successful OCR
      developer.log('📤 Uploading images to Firebase...');
      try {
        final scanId = DateTime.now().millisecondsSinceEpoch.toString();
        final uploadResult = await FirebaseStorageService.uploadScanImages(
          scanId: scanId,
          frontImage: File(frontImagePath),
          backImage: File(backImagePath),
        );
        
        // Store the uploaded URLs
        setState(() {
          _frontImageUrl = uploadResult['frontUrl'];
          _backImageUrl = uploadResult['backUrl'];
        });
        
        developer.log('✅ Images uploaded successfully');
        developer.log('   Front URL: $_frontImageUrl');
        developer.log('   Back URL: $_backImageUrl');
      } catch (uploadError) {
        developer.log('⚠️ Image upload failed: $uploadError');
        // Continue with OCR even if upload fails - we still have local paths
      }

      // Send to backend API for OCR processing
      final apiService = ApiService();
      Map<String, dynamic> response;

      try {
        response = await apiService.scanProduct(combinedText);
      } on ApiException catch (apiError) {
        // Close loading dialog
        if (mounted) Navigator.pop(context);

        developer.log('❌ API Exception: ${apiError.message}');
        developer.log('Status Code: ${apiError.statusCode}');
        developer.log('Details: ${apiError.details}');

        // Show user-friendly error modal (technical details only in logs)
        _showErrorModal(
          title: 'Unable to Process Image',
          message:
              'We couldn\'t process the text from your images.\n\n'
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
          message:
              'An unexpected error occurred while processing the images.\n\n'
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

      // Check if extraction was successful - NEW structure with packagingCompliance
      if (response['success'] == true && response['productIdentified'] == true) {
        // NEW: Build extractedInfo from new compliance structure
        final productInfo = response['productInfo'] ?? {};
        final packagingCompliance = response['packagingCompliance'] ?? {};
        final violations = response['violations'] as List<dynamic>?;
        final warnings = response['warnings'] as List<dynamic>?;
        
        // Build extractedInfo for display (showing what's ON packaging)
        final extractedInfo = {
          'productName': productInfo['productName'] ?? 'Not found',
          'brandName': productInfo['brandName'] ?? 'Not found',
          'manufacturer': productInfo['manufacturer'] ?? productInfo['company'] ?? productInfo['companyName'] ?? 'Not found',
          'company': productInfo['company'] ?? productInfo['companyName'] ?? productInfo['manufacturer'] ?? 'Not found',
          // Show what's actually on packaging (compliance check)
          'LTONumber': packagingCompliance['lto']?['foundOnPackaging'] == true
              ? (packagingCompliance['lto']?['required'] ?? 'NOT FOUND ON PACKAGING')
              : 'NOT FOUND ON PACKAGING',
          'CFPRNumber': packagingCompliance['cfpr']?['foundOnPackaging'] == true
              ? (packagingCompliance['cfpr']?['required'] ?? 'NOT FOUND ON PACKAGING')
              : 'NOT FOUND ON PACKAGING',
          'expirationDate': packagingCompliance['expirationDate']?['foundOnPackaging'] ?? 'NOT FOUND ON PACKAGING',
          // Add compliance info
          'isCompliant': response['isCompliant'] ?? false,
          'violations': violations ?? [],
          'warnings': warnings ?? [],
        };

        // Store OCR blob text and extracted info for re-display
        setState(() {
          _ocrBlobText = combinedText;
          _extractedInfo = extractedInfo;
        });

        // Log OCR scan to audit trail (images will be uploaded on report submission)
        AuditLogService.logScanProduct(
          scanData: {
            'scannedText': combinedText.substring(
              0,
              combinedText.length > 500 ? 500 : combinedText.length,
            ),
            'scanType': 'OCR',
            'extractionSuccess': true,
            'extractedInfo': extractedInfo,
            'isCompliant': extractedInfo['isCompliant'],
          },
        );

        // Show extracted information to user with compliance violations
        _showExtractedInfoModal(extractedInfo, combinedText);
      } else if (response['success'] == true && response['extractedInfo'] != null) {
        // OLD format compatibility (keep for backward compatibility)
        final extractedInfo = response['extractedInfo'];

        // Store OCR blob text and extracted info for re-display
        setState(() {
          _ocrBlobText = combinedText;
          _extractedInfo = extractedInfo;
        });

        if (response['found'] == true) {
             // Log OCR scan to audit trail (images will be uploaded on report submission)
            AuditLogService.logScanProduct(
              scanData: {
                'scannedText': combinedText.substring(
                  0,
                  combinedText.length > 500 ? 500 : combinedText.length,
                ),
                'scanType': 'OCR',
                'extractionSuccess': true,
                'extractedInfo': extractedInfo,
              },
            );

            // Show extracted information to user with "Search Product" button
            _showExtractedInfoModal(extractedInfo, combinedText);
        } else {
             // Product not found in DB
             _showNoResultModal(combinedText);
        }

      } else {
        // Log failed OCR scan
        AuditLogService.logScanProduct(
          scanData: {
            'scannedText': combinedText.substring(
              0,
              combinedText.length > 500 ? 500 : combinedText.length,
            ),
            'scanType': 'OCR',
            'extractionSuccess': false,
          },
        );

        // Extraction failed - show info modal with option to view OCR text
        _showExtractionFailedModal(combinedText);
      }

      setState(() {
        result = combinedText;
      });

      // NOTE: Do NOT reset image paths here - user may still need them for Conduct Report
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
          message:
              'Something went wrong while processing the images.\n\n'
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
    } finally {
      // Always reset the processing flag to allow future scans
      _isProcessingOCR = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
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

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
        } else {
          Navigator.maybePop(context);
        }
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
                  borderRadius: isOCRMode
                      ? BorderRadius.zero
                      : BorderRadius.circular(20),
                  boxShadow: isOCRMode
                      ? []
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: ClipRRect(
                  borderRadius: isOCRMode
                      ? BorderRadius.zero
                      : BorderRadius.circular(20),
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
      ..color = Colors.black.withValues(alpha: 0.5)
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
