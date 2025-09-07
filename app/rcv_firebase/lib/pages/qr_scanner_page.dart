import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rcv_firebase/services/api_service.dart';

class QRScannerPage extends StatefulWidget {
  const QRScannerPage({Key? key}) : super(key: key);

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

  @override
  void initState() {
    super.initState();
    _requestCameraPermission();
  }

  Future<void> _requestCameraPermission() async {
    final status = await Permission.camera.request();
    if (status.isDenied) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Camera permission is required for scanning')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          isOCRMode ? 'OCR Scanner' : 'QR Reader',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: const Color(0xFF005440),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: IconButton(
              icon: Icon(
                Icons.info_outline,
                color: Colors.white.withOpacity(0.9),
              ),
              onPressed: () {
                _showInfoDialog();
              },
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Camera View Container
          Expanded(
            flex: 5,
            child: Container(
              width: double.infinity,
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
          
          // Controls Section
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              children: [
                // Mode Toggle
                Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() {
                            isOCRMode = false;
                            result = '';
                          }),
                          child: Container(
                            height: 46,
                            margin: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: !isOCRMode ? const Color(0xFF005440) : Colors.transparent,
                              borderRadius: BorderRadius.circular(23),
                            ),
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.qr_code_scanner,
                                    color: !isOCRMode ? Colors.white : Colors.grey[600],
                                    size: 20,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'QR Scanner',
                                    style: TextStyle(
                                      color: !isOCRMode ? Colors.white : Colors.grey[600],
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() {
                            isOCRMode = true;
                            result = '';
                          }),
                          child: Container(
                            height: 46,
                            margin: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: isOCRMode ? const Color(0xFF005440) : Colors.transparent,
                              borderRadius: BorderRadius.circular(23),
                            ),
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.text_fields,
                                    color: isOCRMode ? Colors.white : Colors.grey[600],
                                    size: 20,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'OCR Mode',
                                    style: TextStyle(
                                      color: isOCRMode ? Colors.white : Colors.grey[600],
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Action Buttons Row
                Row(
                  children: [
                    // Flash Button
                    _buildActionButton(
                      icon: isFlashOn ? Icons.flash_on : Icons.flash_off,
                      onTap: _toggleFlash,
                      isActive: isFlashOn,
                    ),
                    const SizedBox(width: 12),
                    
                    // Gallery Button (for OCR)
                    _buildActionButton(
                      icon: Icons.photo_library,
                      onTap: _pickImageForOCR,
                      isActive: false,
                    ),
                    const SizedBox(width: 12),
                    
                    // Pause/Resume Button
                    _buildActionButton(
                      icon: isScanning ? Icons.pause : Icons.play_arrow,
                      onTap: _pauseResumeCamera,
                      isActive: !isScanning,
                    ),
                    const SizedBox(width: 12),
                    
                    // Test Button
                    _buildActionButton(
                      icon: Icons.bug_report,
                      onTap: () {
                        _printToTerminal('Test scan data - ${DateTime.now()}', 'Test');
                        _showScanFeedback('Test scan data - Button pressed successfully!', 'Test');
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Test button pressed! Check terminal for output.'),
                            backgroundColor: const Color(0xFF005440),
                            behavior: SnackBarBehavior.floating,
                            margin: const EdgeInsets.all(16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        );
                      },
                      isActive: false,
                      color: Colors.purple,
                    ),
                  ],
                ),
                
                const SizedBox(height: 20),
                
                // Upload QR Button (matching the design from screenshots)
                if (!isOCRMode)
                  Container(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: _pickImageForOCR,
                      icon: const Icon(Icons.upload, size: 20),
                      label: const Text(
                        'Upload QR',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF005440),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                
                const SizedBox(height: 16),
                
                // Reset Button
                Container(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: _resetScanner,
                    icon: const Icon(Icons.refresh, size: 20),
                    label: const Text(
                      'Reset Scanner',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF005440),
                      side: const BorderSide(color: Color(0xFF005440), width: 1.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Result Display
          if (result.isNotEmpty)
            Container(
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF005440).withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF005440).withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        color: const Color(0xFF005440),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Scan Result',
                        style: TextStyle(
                          color: const Color(0xFF005440),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    result,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.black87,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQrView(BuildContext context) {
    return Stack(
      children: [
        // Camera Scanner
        Container(
          width: double.infinity,
          height: double.infinity,
          child: MobileScanner(
            controller: cameraController,
            onDetect: isOCRMode ? null : _onDetect,
          ),
        ),
        
        // Scanning Frame Overlay
        if (!isOCRMode)
          Container(
            width: double.infinity,
            height: double.infinity,
            child: CustomPaint(
              painter: ScannerOverlayPainter(),
            ),
          ),
        
        // OCR Mode Overlay
        if (isOCRMode)
          Container(
            width: double.infinity,
            height: double.infinity,
            color: Colors.black.withOpacity(0.7),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
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
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.text_fields,
                          size: 48,
                          color: const Color(0xFF005440),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'OCR Mode',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Select an image from gallery\nto extract text',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                            height: 1.4,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: _pickImageForOCR,
                          icon: const Icon(Icons.photo_library, size: 20),
                          label: const Text('Select Image'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF005440),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
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
        
        // Scanning Instructions
        if (!isOCRMode)
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

  void _onDetect(capture) {
    developer.log('🔍 QR Scanner: _onDetect called', name: 'QRScanner');
    print('🔍 QR Scanner: Detection triggered at ${DateTime.now()}');
    
    final List<Barcode> barcodes = capture.barcodes;
    print('🔍 QR Scanner: Found ${barcodes.length} barcodes');
    
    for (final barcode in barcodes) {
      if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
        String scannedData = barcode.rawValue!;
        print('🔍 QR Scanner: Processing data: $scannedData');
        
        // Only update if it's different from the last result to prevent spam
        if (result != scannedData) {
          setState(() {
            result = scannedData;
          });
          
          // Print to console/terminal with enhanced details
          _printToTerminal(scannedData, 'QR Code');
          
          // Send to API
          _sendScanToAPI(scannedData);
          
          // Show detailed feedback dialog
          _showScanFeedback(scannedData, 'QR Code');
        }
        break;
      }
    }
  }

  void _toggleFlash() async {
    await cameraController.toggleTorch();
    setState(() {
      isFlashOn = !isFlashOn;
    });
  }

  Widget _buildActionButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isActive,
    Color? color,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 50,
          decoration: BoxDecoration(
            color: isActive 
                ? (color ?? const Color(0xFF005440))
                : Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isActive 
                  ? (color ?? const Color(0xFF005440))
                  : Colors.grey[300]!,
              width: 1,
            ),
          ),
          child: Icon(
            icon,
            color: isActive 
                ? Colors.white 
                : (color ?? Colors.grey[600]),
            size: 22,
          ),
        ),
      ),
    );
  }

  void _showInfoDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(Icons.info, color: const Color(0xFF005440)),
              const SizedBox(width: 8),
              const Text('Scanner Info'),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'QR Scanner Mode:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text('• Point camera at QR codes or barcodes'),
              Text('• Automatic detection and scanning'),
              SizedBox(height: 12),
              Text(
                'OCR Mode:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text('• Upload images to extract text'),
              Text('• Supports various text formats'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Got it'),
            ),
          ],
        );
      },
    );
  }

  void _pauseResumeCamera() async {
    if (isScanning) {
      await cameraController.stop();
    } else {
      await cameraController.start();
    }
    setState(() {
      isScanning = !isScanning;
    });
    print('📷 Camera ${isScanning ? 'resumed' : 'paused'}');
  }

  void _resetScanner() async {
    setState(() {
      result = '';
      isScanning = true;
    });
    if (!isScanning) {
      await cameraController.start();
    }
    print('🔄 Scanner reset');
  }

  Future<void> _pickImageForOCR() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        print('📸 Image selected for OCR: ${image.path}');
        await _performOCR(image.path);
      }
    } catch (e) {
      print('❌ Error picking image: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking image: $e')),
      );
    }
  }

  Future<void> _performOCR(String imagePath) async {
    try {
      print('🔤 Starting OCR processing...');
      final inputImage = InputImage.fromFilePath(imagePath);
      final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);
      
      String extractedText = recognizedText.text;
      
      if (extractedText.isNotEmpty) {
        setState(() {
          result = extractedText;
        });
        
        // Print to console/terminal
        _printToTerminal(extractedText, 'OCR');
        
        // Send to API
        _sendScanToAPI(extractedText);
        
        // Show detailed feedback dialog
        _showScanFeedback(extractedText, 'OCR');
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Text extracted from image successfully!')),
        );
      } else {
        print('🔤 No text found in the image');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No text found in the image')),
        );
      }
    } catch (e) {
      print('❌ OCR Error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OCR Error: $e')),
      );
    }
  }

  Future<void> _sendScanToAPI(String scanData) async {
    try {
      String type = 'text';
      if (scanData.contains('http://') || scanData.contains('https://')) {
        type = 'url';
      } else if (RegExp(r'^[0-9]+$').hasMatch(scanData)) {
        type = 'number';
      }

      print('🌐 Sending scan data to API...');
      final result = await ApiService.sendScanData(
        data: scanData,
        type: type,
      );

      if (result['success']) {
        print('✅ API Response: ${result['message']}');
      } else {
        print('❌ API Error: ${result['message']}');
      }
    } catch (e) {
      print('❌ Network error sending to API: $e');
      // Don't show error to user for API failures in this case
    }
  }

  void _printToTerminal(String data, [String scanType = 'QR/OCR']) {
    // Enhanced terminal output with emojis and formatting
    print('');
    print('🎯 ===============================================');
    print('🎯           SCAN DETECTED');
    print('🎯 ===============================================');
    print('📱 Type: $scanType');
    print('📄 Data: $data');
    print('🕒 Time: ${DateTime.now().toLocal()}');
    print('📏 Length: ${data.length} characters');
    if (data.length > 50) {
      print('📄 Preview: ${data.substring(0, 50)}...');
    }
    print('🎯 ===============================================');
    print('');
    
    // Also log using developer.log for better debugging
    developer.log('$scanType Scan: $data', name: 'Scanner');
  }

  void _showScanFeedback(String data, String scanType) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(
                scanType == 'QR Code' ? Icons.qr_code : 
                scanType == 'OCR' ? Icons.text_fields : Icons.bug_report,
                color: scanType == 'Test' ? Colors.purple : const Color(0xFF005440),
              ),
              const SizedBox(width: 8),
              Text('$scanType Detected'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Content:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  data,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Length: ${data.length} characters',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
              Text(
                'Time: ${DateTime.now().toLocal().toString().split('.')[0]}',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
            if (scanType != 'Test')
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _resetScanner();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF005440),
                ),
                child: const Text('Scan Again', style: TextStyle(color: Colors.white)),
              ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    cameraController.dispose();
    _textRecognizer.close();
    super.dispose();
  }
}

// Custom painter for scanner overlay
class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    // Calculate the scan area (square in the center)
    final scanAreaSize = size.width * 0.7;
    final left = (size.width - scanAreaSize) / 2;
    final top = (size.height - scanAreaSize) / 2;
    final scanRect = Rect.fromLTWH(left, top, scanAreaSize, scanAreaSize);

    // Draw the overlay with a transparent square in the middle
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(20)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    // Draw corner brackets
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