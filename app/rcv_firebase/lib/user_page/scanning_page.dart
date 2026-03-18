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
import 'package:lucide_icons/lucide_icons.dart';
import '../services/ocr_service.dart';
// import '../widgets/gradient_header_app_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../services/api_service.dart';
import '../services/audit_log_service.dart';
import '../services/local_fuzzy_search_service.dart';
import '../services/product_sync_service.dart';
import '../services/local_product_database.dart';
import '../models/local_product.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';
import '../utils/tab_history.dart';
import '../pages/compliance_report_page.dart';
import '../services/draft_service.dart';
import 'scanning_category_page.dart';
import '../pages/can_rotation_capture_page.dart';
import '../pages/box_capture_page.dart';
import '../pages/sack_capture_page.dart';
import '../pages/pack_capture_page.dart';

class QRScannerPage extends StatefulWidget {
  final ScanningCategory? category;

  const QRScannerPage({super.key, this.category});

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage>
    with WidgetsBindingObserver {
  MobileScannerController cameraController = MobileScannerController();
  String result = '';
  bool isScanning = true;
  bool isOCRMode = false;
  final ImagePicker _picker = ImagePicker();
  // Use Latin script recognition - best for English and Filipino text on product labels
  final TextRecognizer _textRecognizer = TextRecognizer(
    script: TextRecognitionScript.latin,
  );
  final OcrService _ocrService = OcrService();
  final bool _useTesseract =
      true; // Use both ML Kit and Tesseract for better coverage
  final ApiService _apiService = ApiService();

  // Scanning category
  ScanningCategory? _selectedCategory;

  // Manual search controllers
  final TextEditingController _cfprController = TextEditingController();
  final TextEditingController _ltoController = TextEditingController();
  bool _isManualSearching = false;

  // For dual image OCR
  String? _frontImagePath;
  String? _backImagePath;
  List<String>?
  _additionalImagePaths; // Additional images for box products (top, bottom, left, right)
  String? _frontImageUrl; // Firebase URL
  String? _backImageUrl; // Firebase URL
  List<String>? _additionalImageUrls; // Firebase URLs for additional images
  String? _ocrBlobText; // Store raw OCR text for compliance reports
  String? _frontOcrText; // Store front OCR text separately
  String? _backOcrText; // Store back OCR text separately
  List<MapEntry<String, String>>?
  _additionalOcrTexts; // OCR texts for additional images (label, text)
  bool _isProcessingOCR = false; // Guard against duplicate processing
  DateTime? _lastErrorTime; // Debounce errors to prevent spam
  Map<String, dynamic>? _extractedInfo; // Store extracted info for re-display

  // For OCR Progress UI
  final ValueNotifier<Map<String, dynamic>> _ocrProgressNotifier =
      ValueNotifier({'value': 0.0, 'status': 'Initializing...'});

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _selectedCategory = widget.category;

    // Set OCR mode for product categories, QR mode for qrScan
    if (_selectedCategory == ScanningCategory.qrScan) {
      isOCRMode = false;
    } else if (_selectedCategory == ScanningCategory.manualSearch) {
      isOCRMode = false; // Not OCR mode, it's a form
    } else if (_selectedCategory != null) {
      isOCRMode = true;
    }

    if (_selectedCategory != ScanningCategory.manualSearch) {
      _requestCameraPermission();
    }
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
      // For canned products, show rotating can capture UI
      if (_selectedCategory == ScanningCategory.cannedProduct) {
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
                      Icon(Icons.cameraswitch, size: 64, color: Colors.white),
                      const SizedBox(height: 16),
                      const Text(
                        'Rotating Can Capture',
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
                          'Capture all sides of the can\nby rotating it 360 degrees',
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
                // Main content - centered
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: ElevatedButton.icon(
                        onPressed: () => _openCanRotationCapture(),
                        icon: const Icon(Icons.cameraswitch, size: 32),
                        label: const Text(
                          'Start Can Capture',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF005440),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 40,
                            vertical: 24,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      }

      // For box products, show 6-side box capture UI
      if (_selectedCategory == ScanningCategory.boxProduct) {
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
                      Icon(Icons.card_giftcard, size: 64, color: Colors.white),
                      const SizedBox(height: 16),
                      const Text(
                        'Box 6-Side Capture',
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
                          'Capture all 6 sides of the box\nfor complete product information',
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
                // Main content - centered
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: ElevatedButton.icon(
                        onPressed: () => _openBoxCapture(),
                        icon: const Icon(Icons.card_giftcard, size: 32),
                        label: const Text(
                          'Start Box Capture',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF005440),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 40,
                            vertical: 24,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      }

      // For sack products, show sack capture UI
      if (_selectedCategory == ScanningCategory.sackProduct) {
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
                      Icon(Icons.shopping_bag, size: 64, color: Colors.white),
                      const SizedBox(height: 16),
                      const Text(
                        'Sack Product Capture',
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
                          'Capture front and back images\nof the sack for product scanning',
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
                // Main content - centered
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: ElevatedButton.icon(
                        onPressed: () => _openSackCapture(),
                        icon: const Icon(Icons.shopping_bag, size: 32),
                        label: const Text(
                          'Start Sack Capture',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF005440),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 40,
                            vertical: 24,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      }

      // For pack products, show pack capture UI
      if (_selectedCategory == ScanningCategory.packProduct) {
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
                      Icon(Icons.inventory_2, size: 64, color: Colors.white),
                      const SizedBox(height: 16),
                      const Text(
                        'Pack Product Capture',
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
                          'Capture front and back images\nof the pack for product scanning',
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
                // Main content - centered
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: ElevatedButton.icon(
                        onPressed: () => _openPackCapture(),
                        icon: const Icon(Icons.inventory_2, size: 32),
                        label: const Text(
                          'Start Pack Capture',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF005440),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 40,
                            vertical: 24,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      }

      // For other products, show traditional front/back UI
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
                          if (_extractedInfo != null &&
                              _ocrBlobText != null) ...[
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _showExtractedInfoModal(
                                _extractedInfo!,
                                _ocrBlobText!,
                              ),
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

    // Manual Search view
    if (_selectedCategory == ScanningCategory.manualSearch) {
      return _buildManualSearchView();
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

  Widget _buildManualSearchView() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF005440), Color(0xFF00796B)],
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(
            left: 24,
            right: 24,
            top: 20,
            bottom: 40,
          ),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(
            children: [
              // Header section
              const SizedBox(height: 16),
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
                  'Enter the exact CFPR Number and/or LTO Number\nto search for a product in the database',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.amber,
                    fontWeight: FontWeight.w500,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),

              // Form card
              Container(
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // CFPR Number field
                    const Text(
                      'CFPR Number',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF005440),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _cfprController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'e.g. CFPR-1234567890',
                        prefixIcon: const Icon(
                          Icons.badge_outlined,
                          color: Color(0xFF005440),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF005440),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // LTO Number field
                    const Text(
                      'LTO Number',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF005440),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _ltoController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'e.g. LTO-1234567890',
                        prefixIcon: const Icon(
                          Icons.assignment_outlined,
                          color: Color(0xFF005440),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF005440),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Hint text
                    Text(
                      'Enter at least one of the fields above to search.\nThe value must match exactly as registered.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Search button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _isManualSearching
                            ? null
                            : () => _performManualSearch(),
                        icon: _isManualSearching
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.search, size: 24),
                        label: Text(
                          _isManualSearching
                              ? 'Searching...'
                              : 'Search Product',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF005440),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              const Color(0xFF005440).withValues(alpha: 0.6),
                          disabledForegroundColor:
                              Colors.white.withValues(alpha: 0.7),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _performManualSearch() async {
    final cfpr = _cfprController.text.trim();
    final lto = _ltoController.text.trim();

    if (cfpr.isEmpty && lto.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter at least a CFPR or LTO number'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isManualSearching = true);

    try {
      developer.log('🔍 [ManualSearch] CFPR: "$cfpr", LTO: "$lto"');

      // Build a synthetic OCR text from the entered values (for compliance checks)
      final searchText = [if (cfpr.isNotEmpty) cfpr, if (lto.isNotEmpty) lto]
          .join(' ');

      // ---- Try LOCAL database first ----
      if (LocalFuzzySearchService.isReady) {
        developer.log('⚡ [ManualSearch] Searching local DB...');
        final db = LocalProductDatabase.instance;

        List<LocalProduct> results = [];

        if (cfpr.isNotEmpty && lto.isNotEmpty) {
          // Both provided — search with AND first
          results = await db.searchByCfprAndLto(cfpr, lto);
          if (results.isEmpty) {
            // Try each individually
            results = await db.searchByCfpr(cfpr);
            if (results.isEmpty) {
              results = await db.searchByLto(lto);
            }
          }
        } else if (cfpr.isNotEmpty) {
          results = await db.searchByCfpr(cfpr);
        } else {
          results = await db.searchByLto(lto);
        }

        if (results.isNotEmpty) {
          final product = results.first;
          developer.log(
            '⚡ [ManualSearch] Local match: ${product.productName}',
          );

          // Build compliance result (same format as OCR scan)
          final response = LocalFuzzySearchService.buildComplianceResult(
            product,
            searchText,
            packageType: 'MANUAL_SEARCH',
          );
          response['matchDetails'] = {
            'searchType': 'manual',
            'cfprQueried': cfpr.isNotEmpty ? cfpr : null,
            'ltoQueried': lto.isNotEmpty ? lto : null,
            'matchedLocally': true,
            'totalResults': results.length,
          };

          _handleManualSearchResult(response, searchText);
          return;
        }

        developer.log(
          '⚠️ [ManualSearch] No local match, falling back to server...',
        );
      }

      // ---- Fallback: Search server ----
      developer.log('🌐 [ManualSearch] Searching server...');
      final serverResponse = await _apiService.searchProduct(
        cfprNumber: cfpr.isNotEmpty ? cfpr : null,
        ltoNumber: lto.isNotEmpty ? lto : null,
      );

      if (serverResponse.found && serverResponse.products.isNotEmpty) {
        final product = serverResponse.products.first;
        developer.log(
          '🌐 [ManualSearch] Server match: ${product.productName}',
        );

        // Wrap the server response in the same format
        final response = <String, dynamic>{
          'success': true,
          'found': true,
          'productIdentified': true,
          'isCompliant': true,
          'productInfo': {
            'productName': product.productName,
            'brandName': product.brandName,
            'manufacturer': product.companyName ?? product.company?.name ?? 'Unknown',
            'CFPRNumber': product.cfprNumber,
            'LTONumber': product.ltoNumber,
            'certificateId': product.cfprNumber,
            'registrationNumber': product.cfprNumber,
            'dateOfRegistration': product.dateOfRegistration.toIso8601String(),
            'productCategory': product.productClassification,
            'productType': product.productSubClassification,
            'lotNumber': product.lotNumber,
            'companyId': product.companyId,
            'productId': product.id,
          },
          'packagingCompliance': {
            'cfpr': {
              'required': product.cfprNumber,
              'foundOnPackaging': cfpr.isNotEmpty,
              'status': cfpr.isNotEmpty ? 'COMPLIANT' : 'NOT_CHECKED',
            },
            'lto': {
              'required': product.ltoNumber,
              'foundOnPackaging': lto.isNotEmpty,
              'status': lto.isNotEmpty ? 'COMPLIANT' : 'NOT_CHECKED',
            },
          },
          'matchDetails': {
            'searchType': 'manual',
            'cfprQueried': cfpr.isNotEmpty ? cfpr : null,
            'ltoQueried': lto.isNotEmpty ? lto : null,
            'matchedLocally': false,
          },
          'source': 'server_search',
        };

        _handleManualSearchResult(response, searchText);
      } else {
        // Not found anywhere
        developer.log('❌ [ManualSearch] Product not found');
        _showManualSearchNotFoundModal(cfpr, lto);
      }
    } catch (e) {
      developer.log('❌ [ManualSearch] Error: $e');
      if (mounted) {
        _showErrorModal(
          title: 'Search Error',
          message:
              'An error occurred while searching for the product.\n\n'
              'Please check your internet connection and try again.',
          error: e.toString(),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isManualSearching = false);
      }
    }
  }

  void _handleManualSearchResult(
    Map<String, dynamic> response,
    String searchText,
  ) {
    final productInfo = response['productInfo'] ?? {};
    final packagingCompliance = response['packagingCompliance'] ?? {};
    final violations = response['violations'] as List<dynamic>? ?? [];
    final warnings = response['warnings'] as List<dynamic>? ?? [];

    final extractedInfo = {
      'productName': productInfo['productName'] ?? 'Not found',
      'brandName': productInfo['brandName'] ?? 'Not found',
      'manufacturer':
          productInfo['manufacturer'] ??
          productInfo['company'] ??
          productInfo['companyName'] ??
          'Not found',
      'company':
          productInfo['company'] ??
          productInfo['companyName'] ??
          productInfo['manufacturer'] ??
          'Not found',
      'LTONumber': packagingCompliance['lto']?['required'] ?? 'N/A',
      'CFPRNumber': packagingCompliance['cfpr']?['required'] ?? 'N/A',
      'isCompliant': response['isCompliant'] ?? false,
      'violations': violations,
      'warnings': warnings,
    };

    setState(() {
      _ocrBlobText = searchText;
      _extractedInfo = extractedInfo;
    });

    // Log to audit trail
    AuditLogService.logScanProduct(
      scanData: {
        'searchType': 'MANUAL_SEARCH',
        'cfprQueried': _cfprController.text.trim(),
        'ltoQueried': _ltoController.text.trim(),
        'extractionSuccess': true,
        'extractedInfo': extractedInfo,
        'isCompliant': extractedInfo['isCompliant'],
      },
    );

    _showExtractedInfoModal(extractedInfo, searchText);
  }

  void _showManualSearchNotFoundModal(String cfpr, String lto) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
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
                  'Product Not Found',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'No product found matching:\n'
                  '${cfpr.isNotEmpty ? '• CFPR: $cfpr\n' : ''}'
                  '${lto.isNotEmpty ? '• LTO: $lto\n' : ''}'
                  '\nWould you like to scan the product label instead?',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Colors.black54,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(dialogContext).pop();
                      // Pop back from manual search page, then open scanning category
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.camera_alt, size: 20),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF005440),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    label: const Text(
                      'Scan Product Instead',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF005440),
                      side: const BorderSide(color: Color(0xFF005440)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Try Again',
                      style: TextStyle(fontSize: 14),
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
          // Open PDF in browser — launch directly without canLaunchUrl
          // (canLaunchUrl can return false on Android 11+ if queries not declared)
          final uri = Uri.parse(pdfUrl);
          try {
            final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
            if (!launched) {
              _showErrorSnackBar('Could not open PDF — no browser available');
            }
          } catch (launchError) {
            developer.log('Error launching PDF URL: $launchError');
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
    if (_lastErrorTime != null &&
        now.difference(_lastErrorTime!).inSeconds < 2) {
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

    // Stop camera when modal opens
    cameraController.stop();
    developer.log('📹 Camera stopped - QR result modal opened');

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
                              ).withOpacity(0.1),
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
      // Restart camera when modal is closed
      cameraController.start();
      developer.log('📹 Camera restarted - QR result modal closed');

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
          child: Material(
            type: MaterialType.transparency,
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.9,
                maxHeight: MediaQuery.of(context).size.height * 0.8,
              ),
              child: Column(
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
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            message,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 16,
                              color: Colors.black87,
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
                              ),
                              child: Text(
                                error,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),
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
                  ),
                ],
              ),
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
          child: Material(
            type: MaterialType.transparency,
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.9,
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
                            'Extraction Failed',
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
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 64,
                            color: Colors.orange,
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'We couldn\'t extract enough information',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Please try scanning the product again, ensuring that all registration numbers and category details are clearly visible.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black54,
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 24),
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
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Manual Input Modal - allows agent to manually type registration numbers
  /// when OCR fails to capture them properly
  void _showManualInputModal(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) {
    final TextEditingController ltoController = TextEditingController();
    final TextEditingController cfprController = TextEditingController();

    // Pre-fill with current values if they exist and are valid
    final currentLTO = extractedInfo['LTONumber']?.toString() ?? '';
    final currentCFPR = extractedInfo['CFPRNumber']?.toString() ?? '';

    if (!currentLTO.contains('NOT FOUND')) {
      ltoController.text = currentLTO;
    }
    if (!currentCFPR.contains('NOT FOUND')) {
      cfprController.text = currentCFPR;
    }

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
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.purple.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.edit,
                          size: 28,
                          color: Colors.purple.shade700,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Manual Input',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Enter registration numbers manually',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Info text
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Type the registration numbers exactly as shown on the product packaging.',
                            style: TextStyle(
                              color: Colors.blue.shade900,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // LTO Number Field
                  const Text(
                    'LTO Number',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: ltoController,
                    decoration: InputDecoration(
                      hintText: 'e.g., LTO-R4A-0027-2023',
                      prefixIcon: Icon(
                        Icons.badge,
                        color: Colors.orange.shade600,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.purple.shade700,
                          width: 2,
                        ),
                      ),
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 16),

                  // CFPR Number Field
                  const Text(
                    'CFPR Number (Registration)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: cfprController,
                    decoration: InputDecoration(
                      hintText: 'e.g., DFI-21-5913',
                      prefixIcon: Icon(
                        Icons.assignment,
                        color: Colors.teal.shade600,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.purple.shade700,
                          width: 2,
                        ),
                      ),
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey.shade700,
                            side: BorderSide(color: Colors.grey.shade400),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: () {
                            // Update extractedInfo with manual values
                            final updatedInfo = Map<String, dynamic>.from(
                              extractedInfo,
                            );

                            if (ltoController.text.trim().isNotEmpty) {
                              updatedInfo['LTONumber'] = ltoController.text
                                  .trim();
                            }
                            if (cfprController.text.trim().isNotEmpty) {
                              updatedInfo['CFPRNumber'] = cfprController.text
                                  .trim();
                            }

                            // Update stored extracted info
                            setState(() {
                              _extractedInfo = updatedInfo;
                            });

                            Navigator.pop(context);

                            // Search with manual values
                            _searchWithManualInput(updatedInfo, ocrText);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.purple.shade700,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 8,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.search, size: 16),
                                SizedBox(width: 6),
                                Text(
                                  'Search',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Search for product with manually entered registration numbers
  Future<void> _searchWithManualInput(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) async {
    try {
      // Show loading indicator
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
                  'Searching with manual input...',
                  style: TextStyle(
                    color: Color(0xFF005440),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      // Get the manually entered values for verification
      final enteredLTO = extractedInfo['LTONumber']?.toString();
      final enteredCFPR = extractedInfo['CFPRNumber']?.toString();

      // Check if we have at least one valid search criteria
      final hasLTO =
          enteredLTO != null &&
          enteredLTO.isNotEmpty &&
          !enteredLTO.contains('NOT FOUND');
      final hasCFPR =
          enteredCFPR != null &&
          enteredCFPR.isNotEmpty &&
          !enteredCFPR.contains('NOT FOUND');

      if (!hasLTO && !hasCFPR) {
        // No valid registration numbers entered
        if (mounted) Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Please enter at least one registration number (LTO or CFPR)',
            ),
            backgroundColor: Colors.orange,
          ),
        );
        _showManualInputModal(extractedInfo, ocrText);
        return;
      }

      // Call search API with the manually entered values
      final result = await _apiService.searchProduct(
        ltoNumber: hasLTO ? enteredLTO : null,
        cfprNumber: hasCFPR ? enteredCFPR : null,
        productName:
            extractedInfo['productName']?.toString().contains('Not found') ==
                true
            ? null
            : extractedInfo['productName']?.toString(),
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (result.success && result.found && result.products.isNotEmpty) {
        // Product found - but we need to VERIFY it matches the entered values
        final product = result.products.first;

        // Normalize strings for comparison (remove spaces, dashes, convert to uppercase)
        String normalize(String? s) =>
            (s ?? '').replaceAll(RegExp(r'[\s\-]'), '').toUpperCase();

        // Check if the returned product actually matches what was entered
        bool matchesLTO =
            !hasLTO ||
            normalize(product.ltoNumber).contains(normalize(enteredLTO));
        bool matchesCFPR =
            !hasCFPR ||
            normalize(product.cfprNumber).contains(normalize(enteredCFPR));

        // Also check reverse - if entered value contains the DB value
        if (!matchesLTO && hasLTO) {
          matchesLTO = normalize(
            enteredLTO,
          ).contains(normalize(product.ltoNumber));
        }
        if (!matchesCFPR && hasCFPR) {
          matchesCFPR = normalize(
            enteredCFPR,
          ).contains(normalize(product.cfprNumber));
        }

        developer.log('Manual input verification:');
        developer.log(
          '  Entered LTO: $enteredLTO, DB LTO: ${product.ltoNumber}, matches: $matchesLTO',
        );
        developer.log(
          '  Entered CFPR: $enteredCFPR, DB CFPR: ${product.cfprNumber}, matches: $matchesCFPR',
        );

        if (matchesLTO && matchesCFPR) {
          // Product matches - update extracted info with database values
          final updatedInfo = {
            'productName': product.productName,
            'brandName': product.brandName,
            'manufacturer': product.company?.name,
            'company': product.company?.name,
            'LTONumber': product.ltoNumber,
            'CFPRNumber': product.cfprNumber,
            'isCompliant': true, // Found in database means compliant
            'violations': <dynamic>[],
            'warnings': <dynamic>[],
          };

          setState(() {
            _extractedInfo = updatedInfo;
          });

          // Show updated info modal
          _showExtractedInfoModal(updatedInfo, ocrText);
        } else {
          // Product found but doesn't match - show fraud warning
          developer.log(
            '⚠️ Product found but registration numbers do not match!',
          );
          _showProductNotFoundWarningModal(extractedInfo, ocrText);
        }
      } else {
        // Product not found with manual input - show fraud warning
        _showProductNotFoundWarningModal(extractedInfo, ocrText);
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Show error
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Search failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );

        // Re-show the original modal
        _showExtractedInfoModal(extractedInfo, ocrText);
      }
    }
  }

  /// Show warning modal when manual input doesn't find a product
  /// This indicates the product may be fraudulent/unregistered
  void _showProductNotFoundWarningModal(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) {
    final ltoNumber = extractedInfo['LTONumber']?.toString() ?? '';
    final cfprNumber = extractedInfo['CFPRNumber']?.toString() ?? '';

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
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.warning_amber_rounded,
                      size: 48,
                      color: Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Product Not Registered',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.red.shade900,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.red.shade300,
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.dangerous,
                          color: Colors.red.shade700,
                          size: 32,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'POTENTIAL FRAUD WARNING',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'The registration number(s) you entered were not found in our database. This product may be:',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.black87,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildWarningItem('Unregistered or illegal'),
                        _buildWarningItem('Using fake registration numbers'),
                        _buildWarningItem('Counterfeit product'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Show entered values
                  if (ltoNumber.isNotEmpty &&
                      !ltoNumber.contains('NOT FOUND')) ...[
                    _buildEnteredValueRow('LTO Number', ltoNumber),
                    const SizedBox(height: 8),
                  ],
                  if (cfprNumber.isNotEmpty &&
                      !cfprNumber.contains('NOT FOUND')) ...[
                    _buildEnteredValueRow('CFPR Number', cfprNumber),
                    const SizedBox(height: 16),
                  ],
                  const Text(
                    'Please verify the product information carefully before consuming or using this product.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.black54,
                      fontStyle: FontStyle.italic,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        // Allow user to try again with different values
                        _showManualInputModal(extractedInfo, ocrText);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 6),
                            Text(
                              'Try Different Numbers',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF005440),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Close',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // Helper widget for warning items
  Widget _buildWarningItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(Icons.cancel, size: 16, color: Colors.red.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 13, color: Colors.red.shade900),
            ),
          ),
        ],
      ),
    );
  }

  // Helper widget for entered values display
  Widget _buildEnteredValueRow(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.black54,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
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
          child: Material(
            type: MaterialType.transparency,
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
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Scan Again',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        if (_frontOcrText != null) {
                          _showOCRModal(
                            _frontOcrText!,
                            _backOcrText,
                            _additionalOcrTexts,
                          );
                        } else {
                          _showOCRModal(ocrText);
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF005440),
                        side: const BorderSide(color: Color(0xFF005440)),
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'View Raw OCR Text',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
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
          child: Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            elevation: 24,
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
                            ? [const Color(0xFF00A47D), const Color(0xFF005440)]
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
                          isCompliant
                              ? Icons.check_circle_outline
                              : Icons.warning_amber_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            isCompliant ? 'Product Compliant' : 'Found errors',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white),
                          onPressed: () => _handleCloseOCRResults(extractedInfo, ocrText),
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
                                border: Border.all(
                                  color: Colors.red.shade300,
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.error_outline,
                                        color: Colors.red.shade700,
                                        size: 20,
                                      ),
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
                                  ...violations.map(
                                    (v) => Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            '• ',
                                            style: TextStyle(fontSize: 16),
                                          ),
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
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
                                      Icon(
                                        Icons.warning_amber,
                                        color: Colors.orange.shade700,
                                        size: 20,
                                      ),
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
                                  ...warnings.map(
                                    (w) => Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            '• ',
                                            style: TextStyle(fontSize: 16),
                                          ),
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
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Display category if available
                          if (_selectedCategory != null &&
                              _selectedCategory != ScanningCategory.qrScan) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF005440).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFF005440).withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    _getCategoryIcon(_selectedCategory!),
                                    color: const Color(0xFF005440),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Packaging Type',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.black45,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _getCategoryLabel(_selectedCategory!),
                                          style: const TextStyle(
                                            fontSize: 15,
                                            color: Color(0xFF005440),
                                            fontWeight: FontWeight.bold,
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
                            extractedInfo['LTONumber']?.toString().contains(
                                      'NOT FOUND',
                                    ) ==
                                    true
                                ? Colors.red
                                : Colors.orange,
                            extractedInfo['LTONumber']?.toString().contains(
                                  'NOT FOUND',
                                ) ==
                                true,
                          ),
                          const SizedBox(height: 12),

                          // CFPR Number
                          _buildComplianceField(
                            'CFPR Number',
                            extractedInfo['CFPRNumber'] ?? 'Not found',
                            Icons.assignment,
                            extractedInfo['CFPRNumber']?.toString().contains(
                                      'NOT FOUND',
                                    ) ==
                                    true
                                ? Colors.red
                                : Colors.teal,
                            extractedInfo['CFPRNumber']?.toString().contains(
                                  'NOT FOUND',
                                ) ==
                                true,
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
                                    'Review the compliance information above. Verify the registration numbers match what is printed on the product packaging.',
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
                        ],
                      ),
                    ),
                  ),
                  // Sticky Action Buttons
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _conductReport(extractedInfo, ocrText),
                            icon: const Icon(Icons.assignment, size: 18),
                            label: const Text(
                              'Conduct Report',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
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
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => _saveAsDraft(extractedInfo, ocrText),
                                icon: const Icon(Icons.save_outlined, size: 18),
                                label: const Text('Save Draft'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange.shade600,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  if (_frontOcrText != null) {
                                    _showOCRModal(
                                      _frontOcrText!,
                                      _backOcrText,
                                      _additionalOcrTexts,
                                    );
                                  } else {
                                    _showOCRModal(ocrText);
                                  }
                                },
                                icon: const Icon(Icons.article_outlined, size: 18),
                                label: const Text('Raw Text'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF005440),
                                  side: const BorderSide(color: Color(0xFF005440)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
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
            // NOTE: Expiration date removed - certificate expiration in DB, not product expiration
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
                  // Note: expirationDate removed from entity display - database stores certificate expiration,
                  // not product expiration. Physical product expiration should be visually verified.
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
      padding: const EdgeInsets.all(12),
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
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color[700], size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
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
      padding: const EdgeInsets.all(12),
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
                ? Colors.red.withOpacity(0.1)
                : Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isViolation ? Colors.red.shade50 : color[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isViolation ? Icons.error_outline : icon,
              color: isViolation ? Colors.red.shade700 : color[700],
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[600],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isViolation) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'MISSING',
                          style: TextStyle(
                            fontSize: 8,
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
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isViolation ? Colors.red.shade900 : Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Merge OCR results from two engines intelligently
  String _mergeOcrResults(String mlKitText, String tesseractText) {
    // If one is empty, return the other
    if (mlKitText.trim().isEmpty) return tesseractText;
    if (tesseractText.trim().isEmpty) return mlKitText;

    // If they're very similar, return the longer one
    final mlKitLen = mlKitText.trim().length;
    final tesseractLen = tesseractText.trim().length;

    // If Tesseract found significantly more text (30%+), use it
    if (tesseractLen > mlKitLen * 1.3) {
      return tesseractText;
    }

    // If ML Kit found significantly more text, use it
    if (mlKitLen > tesseractLen * 1.3) {
      return mlKitText;
    }

    // Otherwise, combine both with deduplication
    // Use the longer text as base and append unique lines from shorter
    final baseText = mlKitLen >= tesseractLen ? mlKitText : tesseractText;
    final supplementText = mlKitLen >= tesseractLen ? tesseractText : mlKitText;

    final baseLines = baseText
        .split('\n')
        .map((l) => l.trim().toLowerCase())
        .toSet();
    final supplementLines = supplementText.split('\n');

    final additionalLines = <String>[];
    for (final line in supplementLines) {
      final trimmedLower = line.trim().toLowerCase();
      // Add line if it's not already in base and has meaningful content
      if (trimmedLower.isNotEmpty &&
          trimmedLower.length > 3 &&
          !baseLines.contains(trimmedLower)) {
        additionalLines.add(line);
      }
    }

    if (additionalLines.isNotEmpty) {
      return '$baseText\n${additionalLines.join('\n')}';
    }

    return baseText;
  }

  // Get category icon
  IconData _getCategoryIcon(ScanningCategory category) {
    switch (category) {
      case ScanningCategory.cannedProduct:
        return Icons.shopping_bag;
      case ScanningCategory.sackProduct:
        return LucideIcons.package;
      case ScanningCategory.packProduct:
        return Icons.inventory_2;
      case ScanningCategory.boxProduct:
        return Icons.card_giftcard;
      case ScanningCategory.qrScan:
        return Icons.qr_code_scanner;
      case ScanningCategory.manualSearch:
        return Icons.search;
    }
  }

  // Get category label
  String _getCategoryLabel(ScanningCategory category) {
    switch (category) {
      case ScanningCategory.cannedProduct:
        return 'Canned Product';
      case ScanningCategory.sackProduct:
        return 'Sack Product';
      case ScanningCategory.packProduct:
        return 'Pack Product';
      case ScanningCategory.boxProduct:
        return 'Box Product';
      case ScanningCategory.qrScan:
        return 'QR Scan';
      case ScanningCategory.manualSearch:
        return 'Manual Search';
    }
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

      // Navigate to compliance report page with local paths for background upload
      final success = await _navigateToComplianceReport(
        extractedInfo,
        {'found': false, 'product': null},
        'NON_COMPLIANT',
        frontImageUrl: null,
        backImageUrl: null,
        additionalImageUrls: null,
        localFrontPath: _frontImagePath,
        localBackPath: _backImagePath,
        localAdditionalPaths: _additionalImagePaths,
        ocrBlobText: _ocrBlobText,
      );

      // If the user cancelled the report (pressed back), reopen the modal
      if (!success && mounted) {
        _showExtractedInfoModal(extractedInfo, ocrText);
      }
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
  // Handle the close button with double confirmation
  Future<void> _handleCloseOCRResults(
    Map<String, dynamic> extractedInfo,
    String ocrText,
  ) async {
    // First Confirmation: Are you sure you want to exit?
    final bool? exitConfirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard Scan?'),
        content: const Text(
          'Are you sure you want to close? You will lose the current scan results.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Exit',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (exitConfirmed != true) return;

    // Second Confirmation: Save as Draft or Discard?
    if (mounted) {
      final String? result = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Save Results?'),
          content: const Text(
            'Would you like to save this scan as a draft before closing?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop('discard'),
              child: const Text(
                'Discard',
                style: TextStyle(color: Colors.red),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop('save'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF005440),
                foregroundColor: Colors.white,
              ),
              child: const Text('Save Draft'),
            ),
          ],
        ),
      );

      if (result == 'save') {
        await _saveAsDraft(extractedInfo, ocrText);
        if (mounted) {
          Navigator.of(context).pop(); // Close the OCR results modal
        }
      } else if (result == 'discard') {
        if (mounted) {
          Navigator.of(context).pop(); // Close the OCR results modal
        }
      }
    }
  }

  Future<bool> _navigateToComplianceReport(
    Map<String, dynamic> extractedInfo,
    Map<String, dynamic> searchResponse,
    String status, {
    String? frontImageUrl,
    String? backImageUrl,
    List<String>? additionalImageUrls,
    String? localFrontPath,
    String? localBackPath,
    List<String>? localAdditionalPaths,
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
            additionalImageUrls: additionalImageUrls,
            // Pass local paths for deferred upload
            localFrontPath: localFrontPath,
            localBackPath: localBackPath,
            localAdditionalPaths: localAdditionalPaths,
            ocrBlobText: ocrBlobText,
          ),
        ),
      );

      // If report was submitted successfully, reset scan state
      if (success == true && mounted) {
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
          _additionalImagePaths = null;
          _frontImageUrl = null;
          _backImageUrl = null;
          _additionalImageUrls = null;
          _ocrBlobText = null;
          _frontOcrText = null;
          _backOcrText = null;
          _additionalOcrTexts = null;
        });

        if (!mounted) return success == true;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Compliance report submitted successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      }
      return success == true;
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
      return false;
    }
  }

  // Show OCR results modal - supports multiple images
  void _showOCRModal(
    String frontText, [
    String? backText,
    List<MapEntry<String, String>>? additionalTexts,
  ]) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        // Build the list of all image texts
        final List<MapEntry<String, String>> allTexts = [];

        // Determine if this is a multi-image (box) product
        final bool isMultiImage =
            additionalTexts != null && additionalTexts.isNotEmpty;

        if (isMultiImage) {
          // For box products, label as Image 1, Image 2, etc.
          allTexts.add(MapEntry('Image 1 (Front)', frontText));
          if (backText != null) {
            allTexts.add(MapEntry('Image 2 (Back)', backText));
          }
          int imageNum = 3;
          for (final entry in additionalTexts) {
            allTexts.add(
              MapEntry('Image $imageNum (${entry.key})', entry.value),
            );
            imageNum++;
          }
        } else if (backText != null) {
          // For front/back products
          allTexts.add(MapEntry('Front Image Text', frontText));
          allTexts.add(MapEntry('Back Image Text', backText));
        } else {
          // Single image
          allTexts.add(MapEntry('Scanned Text', frontText));
        }

        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
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
                      Expanded(
                        child: Text(
                          isMultiImage
                              ? 'OCR Results (${allTexts.length} Images)'
                              : 'OCR Results',
                          style: const TextStyle(
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (int i = 0; i < allTexts.length; i++) ...[
                          if (i > 0) const SizedBox(height: 16),
                          Text(
                            '${allTexts[i].key}:',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: SelectableText(
                              allTexts[i].value.isEmpty
                                  ? 'No text detected'
                                  : allTexts[i].value,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
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

  Future<void> _openCanRotationCapture() async {
    final result = await Navigator.push<Map<dynamic, String?>>(
      context,
      MaterialPageRoute(builder: (context) => const CanRotationCapturePage()),
    );

    if (result == null) return;

    // Process the captured images from can rotation
    final front = result[CanSide.front];
    final back = result[CanSide.back];
    final left = result[CanSide.left];
    final right = result[CanSide.right];

    if (front != null && back != null) {
      setState(() {
        _frontImagePath = front;
        _backImagePath = back;
        // Store left and right as additional images for canned products
        _additionalImagePaths = [
          if (left != null) left,
          if (right != null) right,
        ];
      });

      // Start OCR processing with front and back images
      await _performDualOCR(front, back);
    }
  }

  Future<void> _openBoxCapture() async {
    final result = await Navigator.push<Map<dynamic, String?>>(
      context,
      MaterialPageRoute(
        builder: (context) => BoxCapturePage(
          onComplete: () {},
          onImagesSelected: (images) {
            // Store the box images
            setState(() {
              _frontImagePath = images[BoxSide.front];
              _backImagePath = images[BoxSide.back];
              // Store additional images (top, bottom, left, right)
              _additionalImagePaths = [
                if (images[BoxSide.top] != null) images[BoxSide.top]!,
                if (images[BoxSide.bottom] != null) images[BoxSide.bottom]!,
                if (images[BoxSide.left] != null) images[BoxSide.left]!,
                if (images[BoxSide.right] != null) images[BoxSide.right]!,
              ];
            });
          },
        ),
      ),
    );

    if (result == null) return;

    // Process the captured images from box capture
    final front = result[BoxSide.front];
    final back = result[BoxSide.back]; // Use back side as back image

    if (front != null && back != null) {
      setState(() {
        _frontImagePath = front;
        _backImagePath = back;
        // Store additional images (top, bottom, left, right)
        _additionalImagePaths = [
          if (result[BoxSide.top] != null) result[BoxSide.top]!,
          if (result[BoxSide.bottom] != null) result[BoxSide.bottom]!,
          if (result[BoxSide.left] != null) result[BoxSide.left]!,
          if (result[BoxSide.right] != null) result[BoxSide.right]!,
        ];
      });

      // Start OCR processing with front and back images
      await _performDualOCR(front, back);
    }
  }

  Future<void> _openSackCapture() async {
    final result = await Navigator.push<Map<dynamic, String?>>(
      context,
      MaterialPageRoute(
        builder: (context) => SackCapturePage(
          onComplete: () {},
          onImagesSelected: (images) {
            // Store the sack images
            setState(() {
              _frontImagePath = images[SackSide.front];
              _backImagePath = images[SackSide.back];
            });
          },
        ),
      ),
    );

    if (result == null) return;

    // Process the captured images from sack capture
    final front = result[SackSide.front];
    final back = result[SackSide.back];

    if (front != null && back != null) {
      setState(() {
        _frontImagePath = front;
        _backImagePath = back;
      });

      // Start OCR processing with front and back images
      await _performDualOCR(front, back);
    }
  }

  Future<void> _openPackCapture() async {
    final result = await Navigator.push<Map<dynamic, String?>>(
      context,
      MaterialPageRoute(
        builder: (context) => PackCapturePage(
          onComplete: () {},
          onImagesSelected: (images) {
            // Store the pack images
            setState(() {
              _frontImagePath = images[PackSide.front];
              _backImagePath = images[PackSide.back];
            });
          },
        ),
      ),
    );

    if (result == null) return;

    // Process the captured images from pack capture
    final front = result[PackSide.front];
    final back = result[PackSide.back];

    if (front != null && back != null) {
      setState(() {
        _frontImagePath = front;
        _backImagePath = back;
      });

      // Start OCR processing with front and back images
      await _performDualOCR(front, back);
    }
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

      // Show dynamic loading indicator with progress bar
      if (!mounted) return;
      _ocrProgressNotifier.value = {'value': 0.0, 'status': 'Initializing...'};
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => ValueListenableBuilder<Map<String, dynamic>>(
          valueListenable: _ocrProgressNotifier,
          builder: (context, progress, child) {
            final double value = progress['value'];
            final String status = progress['status'];

            return Center(
              child: Dialog(
                backgroundColor: Colors.transparent,
                elevation: 0,
                child: Container(
                  width: 320,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF005440).withOpacity(0.15),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Animated Icon container
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF005440).withOpacity(0.05),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.insights_rounded,
                          color: Color(0xFF005440),
                          size: 48,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Analyzing Packaging',
                        style: TextStyle(
                          color: Color(0xFF005440),
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Scanning product details...',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 32),
                      // Premium Progress Bar
                      Stack(
                        children: [
                          Container(
                            height: 12,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 500),
                            height: 12,
                            width: 320 * value, // Approximate width
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF00A47D), Color(0xFF005440)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF00A47D).withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(
                        status,
                        style: const TextStyle(
                          color: Colors.black87,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      // Percentage Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF005440).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${(value * 100).toInt()}% Done',
                          style: const TextStyle(
                            color: Color(0xFF005440),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      );

      String frontText = '';
      String backText = '';
      String tesseractFrontText = '';
      String tesseractBackText = '';
      String combinedText = ''; // Will be built from all OCR texts

      // Use ML Kit as primary engine (faster and more accurate on mobile)
      developer.log('🔍 Processing images with ML Kit (Latin script)...');
      _ocrProgressNotifier.value = {'value': 0.1, 'status': 'Starting OCR engines...'};

      try {
        _ocrProgressNotifier.value = {'value': 0.2, 'status': 'Analyzing labels (ML Kit)...'};
        
        // Parallelize ML Kit for front and back
        final mlKitResults = await Future.wait([
          _textRecognizer.processImage(InputImage.fromFilePath(frontImagePath)),
          _textRecognizer.processImage(InputImage.fromFilePath(backImagePath)),
        ]);
        
        frontText = mlKitResults[0].text;
        backText = mlKitResults[1].text;

        developer.log(
          '📊 ML Kit Results - Front: ${frontText.length} chars, Back: ${backText.length} chars',
        );
      } catch (mlKitError) {
        developer.log('⚠️ ML Kit failed: $mlKitError');
      }

      // ALWAYS use Tesseract in addition to ML Kit for better accuracy
      // Run both engines and merge results to capture more text
      if (_useTesseract) {
        developer.log(
          '🔍 Running Tesseract for enhanced accuracy (higher DPI)...',
        );
        _ocrProgressNotifier.value = {'value': 0.4, 'status': 'Deep scanning labels (Tesseract)...'};

        try {
          // Parallelize Tesseract for front and back
          final tesseractResults = await Future.wait([
            _ocrService.smartOcr(File(frontImagePath), dpi: 300, saveResult: false),
            _ocrService.smartOcr(File(backImagePath), dpi: 300, saveResult: false),
          ]);
          
          tesseractFrontText = tesseractResults[0].text;
          tesseractBackText = tesseractResults[1].text;

          developer.log(
            '📊 Tesseract Results - Front: ${tesseractFrontText.length} chars, Back: ${tesseractBackText.length} chars',
          );

          // Smart merge: Combine unique content from both engines
          _ocrProgressNotifier.value = {'value': 0.65, 'status': 'Merging OCR data...'};
          frontText = _mergeOcrResults(frontText, tesseractFrontText);
          backText = _mergeOcrResults(backText, tesseractBackText);

          developer.log(
            '📊 Merged Results - Front: ${frontText.length} chars, Back: ${backText.length} chars',
          );
        } catch (e) {
          developer.log('⚠️ Tesseract enhancement failed: $e');
          // Continue with ML Kit results
        }
      }
      // NOTE: Image upload deferred to ComplianceReportPage for faster OCR results

      developer.log(
        '📊 Final OCR Results - Front: ${frontText.length} chars, Back: ${backText.length} chars',
      );

      // Store individual OCR texts for display
      setState(() {
        _frontOcrText = frontText;
        _backOcrText = backText;
      });

      // For box products, also perform OCR on additional images
      if (_selectedCategory == ScanningCategory.boxProduct &&
          _additionalImagePaths != null &&
          _additionalImagePaths!.isNotEmpty) {
        developer.log(
          '📦 Box product detected - processing ${_additionalImagePaths!.length} additional images...',
        );

        List<MapEntry<String, String>> additionalTexts = [];
        final sideLabels = ['Top', 'Bottom', 'Left', 'Right'];

        // Parallelize additional views OCR
        _ocrProgressNotifier.value = {'value': 0.7, 'status': 'Processing additional views...'};
        
        try {
          final additionalResults = await Future.wait(
            _additionalImagePaths!.asMap().entries.map((entry) async {
              final i = entry.key;
              final path = entry.value;
              if (i >= sideLabels.length) return const MapEntry<String, String>('', '');
              
              String text = '';
              // ML Kit First
              try {
                final inputImage = InputImage.fromFilePath(path);
                final recognizedText = await _textRecognizer.processImage(inputImage);
                text = recognizedText.text;
              } catch (e) {
                developer.log('⚠️ ML Kit failed for ${sideLabels[i]}: $e');
              }
              
              // Tesseract second
              if (_useTesseract) {
                try {
                  final tesseractResult = await _ocrService.smartOcr(File(path), dpi: 300, saveResult: false);
                  text = _mergeOcrResults(text, tesseractResult.text);
                } catch (e) {
                  developer.log('⚠️ Tesseract failed for ${sideLabels[i]}: $e');
                }
              }
              
              developer.log('📊 ${sideLabels[i]} OCR: ${text.length} chars');
              return MapEntry<String, String>(sideLabels[i], text);
            }),
          );
          
          additionalTexts = additionalResults.where((e) => e.key.isNotEmpty).toList();
          developer.log('✅ Additional views processed: ${additionalTexts.length}');
        } catch (e) {
          developer.log('⚠️ Failed to process additional views: $e');
        }

        // Store additional OCR texts
        setState(() {
          _additionalOcrTexts = additionalTexts;
        });

        // NOTE: Additional images upload deferred to ComplianceReportPage

        // Add additional texts to combined text
        String additionalCombined = '';
        for (final entry in additionalTexts) {
          additionalCombined +=
              '\n\n--- ${entry.key.toUpperCase()} OF BOX ---\n\n${entry.value}';
        }

        // Update combined text with all 6 sides
        combinedText =
            '--- FRONT OF LABEL ---\n\n$frontText\n\n--- BACK OF LABEL ---\n\n$backText$additionalCombined';
      }

      // Combine both texts with clear labels
      if (_selectedCategory != ScanningCategory.boxProduct) {
        combinedText =
            '--- FRONT OF LABEL ---\n\n$frontText\n\n--- BACK OF LABEL ---\n\n$backText';
      }

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
              '• Make sure labels are clearly visible',
        );

        // Reset image paths
        setState(() {
          _frontImagePath = null;
          _backImagePath = null;
        });
        return;
      }

      // NOTE: Image upload deferred to ComplianceReportPage

      // ================================================================
      // LOCAL FUZZY SEARCH — runs on-device for instant results
      // Reporting / scan history / AI summary still go to the server.
      // ================================================================
      _ocrProgressNotifier.value = {'value': 0.9, 'status': 'Searching local product DB...'};
      developer.log('🔍 Performing local fuzzy search...');
      final apiService = ApiService();
      Map<String, dynamic> response;

      try {
        // Convert category to API format
        String? packageTypeString;
        if (_selectedCategory != null) {
          switch (_selectedCategory!) {
            case ScanningCategory.cannedProduct:
              packageTypeString = 'CANNED_PRODUCT';
              break;
            case ScanningCategory.sackProduct:
              packageTypeString = 'SACK_PRODUCT';
              break;
            case ScanningCategory.packProduct:
              packageTypeString = 'PACK_PRODUCT';
              break;
            case ScanningCategory.boxProduct:
              packageTypeString = 'BOX_PRODUCT';
              break;
            case ScanningCategory.qrScan:
              packageTypeString = 'QR_SCAN';
              break;
            case ScanningCategory.manualSearch:
              packageTypeString = 'MANUAL_SEARCH';
              break;
          }
        }

        // Try LOCAL fuzzy search first (instant, no network needed)
        if (LocalFuzzySearchService.isReady) {
          developer.log('⚡ Using LOCAL fuzzy search (${LocalFuzzySearchService.productCount} products)');
          final localResult = await LocalFuzzySearchService.searchProductsFuzzy(combinedText);

          if (localResult.product != null) {
            // Build response in the same shape as the server endpoint
            response = LocalFuzzySearchService.buildComplianceResult(
              localResult.product!,
              combinedText,
              frontImageUrl: _frontImageUrl,
              backImageUrl: _backImageUrl,
              packageType: packageTypeString,
            );
            response['matchDetails'] = localResult.searchDetails;
            developer.log('⚡ Local match: ${localResult.product!.productName}');
          } else {
            // No local match — fall back to server
            developer.log('⚠️ No local match, falling back to server...');
            response = await apiService.scanProduct(
              combinedText,
              packageType: packageTypeString,
            );
          }
        } else {
          // Local DB not ready yet — use server (triggers sync in background)
          developer.log('⚠️ Local DB empty, using server scan...');
          response = await apiService.scanProduct(
            combinedText,
            packageType: packageTypeString,
          );
          // Trigger background sync so next scan is local
          ProductSyncService.instance.syncIfNeeded();
        }
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
      if (response['success'] == true &&
          response['productIdentified'] == true) {
        // NEW: Build extractedInfo from new compliance structure
        final productInfo = response['productInfo'] ?? {};
        final packagingCompliance = response['packagingCompliance'] ?? {};
        final violations = response['violations'] as List<dynamic>?;
        final warnings = response['warnings'] as List<dynamic>?;

        // Build extractedInfo for display (showing what's ON packaging)
        final extractedInfo = {
          'productName': productInfo['productName'] ?? 'Not found',
          'brandName': productInfo['brandName'] ?? 'Not found',
          'manufacturer':
              productInfo['manufacturer'] ??
              productInfo['company'] ??
              productInfo['companyName'] ??
              'Not found',
          'company':
              productInfo['company'] ??
              productInfo['companyName'] ??
              productInfo['manufacturer'] ??
              'Not found',
          // Show what's actually on packaging (compliance check)
          'LTONumber': packagingCompliance['lto']?['foundOnPackaging'] == true
              ? (packagingCompliance['lto']?['required'] ??
                    'NOT FOUND ON PACKAGING')
              : 'NOT FOUND ON PACKAGING',
          'CFPRNumber': packagingCompliance['cfpr']?['foundOnPackaging'] == true
              ? (packagingCompliance['cfpr']?['required'] ??
                    'NOT FOUND ON PACKAGING')
              : 'NOT FOUND ON PACKAGING',
          // NOTE: Expiration date removed - database stores certificate expiration, not product expiration
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

        // Close loading dialog before showing info
        _ocrProgressNotifier.value = {'value': 1.0, 'status': 'Processing complete!'};
        
        // Modal will be shown on the current page
        _showExtractedInfoModal(extractedInfo, combinedText);
      } else if (response['success'] == true &&
          response['extractedInfo'] != null) {
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

        // Close loading dialog
        _ocrProgressNotifier.value = {'value': 1.0, 'status': 'Processing complete!'};
        // The pop is removed here as the modal will be shown on the current page
        // if (mounted) Navigator.of(context).pop();

        // Extraction failed - show info modal with option to view OCR text
        _showExtractionFailedModal(combinedText);
      }

      setState(() {
        result = combinedText;
      });

      // NOTE: Do NOT reset image paths here - user may still need them for Conduct Report
    } catch (e) {
      // Close loading dialog if it's still open
      if (mounted) {
        // If we are still processing, try to pop the loading dialog
        if (_isProcessingOCR) {
          Navigator.of(context).pop();
        }
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
    _cfprController.dispose();
    _ltoController.dispose();
    _ocrProgressNotifier.dispose();
    super.dispose();
  }

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
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        // Show confirmation if user has captured images in OCR mode
        if (isOCRMode && (_frontImagePath != null || _backImagePath != null)) {
          final shouldDiscard = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Discard Images?'),
              content: const Text(
                'Are you sure you want to discard? This will still save your captured images for future reference.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  child: const Text('Discard'),
                ),
              ],
            ),
          );

          if (shouldDiscard != true) return;
        }

        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          // ignore: use_build_context_synchronously
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
        } else {
          // ignore: use_build_context_synchronously
          Navigator.maybePop(context);
        }
      },
      child: Scaffold(
        appBar: TitleLogoHeaderAppBar(
          title: _selectedCategory == ScanningCategory.qrScan
              ? 'QR Scanner'
              : _selectedCategory == ScanningCategory.manualSearch
                  ? 'Manual Search'
                  : 'OCR Scanner',
          showBackButton: false,
        ),
        body: Column(
          children: [
            Expanded(
              child: (isOCRMode || _selectedCategory == ScanningCategory.manualSearch)
                  ? SizedBox(
                      width: double.infinity,
                      child: _buildQrView(context),
                    )
                  : Center(
                      child: Container(
                        width: double.infinity,
                        height: MediaQuery.of(context).size.height * 0.45,
                        margin: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: _buildQrView(context),
                        ),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: _selectedCategory == ScanningCategory.manualSearch
                  ? Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: const Text('Back to Category'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF005440),
                          side: const BorderSide(color: Color(0xFF005440)),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    )
                  : Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Resolved version combining both branches
                  Row(
                    children: [
                      // Only show OCR mode toggle if no category was selected (backward compatibility)
                      if (_selectedCategory == null)
                        ElevatedButton.icon(
                          onPressed: () async {
                            // Show confirmation if user has captured images in OCR mode
                            if (isOCRMode &&
                                (_frontImagePath != null ||
                                    _backImagePath != null)) {
                              final shouldDiscard = await showDialog<bool>(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: const Text('Discard Images?'),
                                  content: const Text(
                                    'Are you sure you want to discard? This will still save your captured images for future reference.',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.of(context).pop(false),
                                      child: const Text('Cancel'),
                                    ),
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.of(context).pop(true),
                                      style: TextButton.styleFrom(
                                        foregroundColor: Colors.red,
                                      ),
                                      child: const Text('Discard'),
                                    ),
                                  ],
                                ),
                              );

                              if (shouldDiscard != true) return;
                            }

                            setState(() {
                              isOCRMode = !isOCRMode;
                            });
                          },
                          icon: Icon(
                            Icons.text_fields,
                            color: isOCRMode
                                ? Colors.white
                                : const Color(0xFF005440),
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
                      if (_selectedCategory == null) const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: const Text('Back to Category'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF005440),
                          side: const BorderSide(color: Color(0xFF005440)),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
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
