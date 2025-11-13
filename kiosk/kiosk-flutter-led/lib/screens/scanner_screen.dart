import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter/services.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({Key? key}) : super(key: key);

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // Detection handled inline in onDetect. When a code is found we return it
  // to the previous route (Navigator.pop) so the caller can use the value.

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR / Barcode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
            tooltip: 'Toggle torch',
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller.switchCamera(),
            tooltip: 'Switch camera',
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (BarcodeCapture capture) async {
              if (_isProcessing) return;
              final barcodes = capture.barcodes;
              if (barcodes.isEmpty) return;
              final barcode = barcodes.first;
              final String? code = barcode.rawValue;
              if (code == null || code.isEmpty) return;

              _isProcessing = true;

              // provide haptic and simple system sound feedback
              try {
                HapticFeedback.mediumImpact();
                SystemSound.play(SystemSoundType.click);
              } catch (_) {}

              // Stop the camera before popping so the camera resource is
              // released cleanly — this avoids race conditions that can cause
              // the app to go black or crash on some devices/OS versions.
              try {
                await _controller.stop();
              } catch (_) {}

              if (!mounted) return;
              // Return the scanned value to the previous screen.
              Navigator.of(context).pop(code);

              // No need to set _isProcessing = false because we're leaving
              // this route; if pop somehow doesn't happen, reset the flag.
              if (mounted) {
                _isProcessing = false;
              }
            },
          ),

          // simple overlay: centered rounded rectangle to guide scanning
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.8), width: 2),
                color: Colors.transparent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
