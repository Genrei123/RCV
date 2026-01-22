import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QRScannerPage extends StatefulWidget {
  const QRScannerPage({Key? key}) : super(key: key);

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage> {
  String? selectedCategory;
  String? scannedData;
  bool isScanning = false;
  late MobileScannerController cameraController;

  @override
  void initState() {
    super.initState();
    cameraController = MobileScannerController();
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  void _startScanning(String category) {
    setState(() {
      selectedCategory = category;
      isScanning = true;
      scannedData = null;
    });
  }

  void _backToCategory() {
    setState(() {
      isScanning = false;
      selectedCategory = null;
      scannedData = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isScanning) {
      return _buildScannerScreen();
    } else {
      return _buildCategoryScreen();
    }
  }

  Widget _buildCategoryScreen() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Scanner'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            const Text(
              'Scanning Category',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),

            // Category Cards
            _buildCategoryCard(
              icon: Icons.local_drink,
              title: 'Canned Product',
              onTap: () => _startScanning('Canned Product'),
            ),
            const SizedBox(height: 12),
            _buildCategoryCard(
              icon: Icons.shopping_bag,
              title: 'Sack Product',
              onTap: () => _startScanning('Sack Product'),
            ),
            const SizedBox(height: 12),
            _buildCategoryCard(
              icon: Icons.card_giftcard,
              title: 'Pack Product',
              onTap: () => _startScanning('Pack Product'),
            ),
            const SizedBox(height: 24),

            // QR Scan Option
            _buildCategoryCard(
              icon: Icons.qr_code_2,
              title: 'QR Scan',
              onTap: () => _startScanning('QR Scan'),
              isHighlighted: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCard({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isHighlighted = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        elevation: isHighlighted ? 4 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: isHighlighted ? Colors.blue.shade50 : Colors.white,
            border: Border.all(
              color: isHighlighted ? Colors.blue : Colors.grey.shade300,
              width: isHighlighted ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isHighlighted ? Colors.blue : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: isHighlighted ? Colors.blue : Colors.grey.shade700,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isHighlighted ? Colors.blue : Colors.black87,
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: isHighlighted ? Colors.blue : Colors.grey,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScannerScreen() {
    return Scaffold(
      appBar: AppBar(
        title: Text('Scanning: $selectedCategory'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _backToCategory,
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Camera Scanner
          MobileScanner(
            controller: cameraController,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                debugPrint('Barcode found! ${barcode.rawValue}');
                setState(() {
                  scannedData = barcode.rawValue;
                });
              }
            },
          ),

          // Result Display
          if (scannedData != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 8,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.check_circle,
                            color: Colors.green.shade700,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'Scan Result',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildResultField(
                      label: 'Packaging Type',
                      value: selectedCategory ?? 'Unknown',
                      icon: Icons.category,
                    ),
                    const SizedBox(height: 12),
                    _buildResultField(
                      label: 'Scanned Data',
                      value: scannedData ?? 'No data',
                      icon: Icons.qr_code,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _backToCategory,
                            icon: const Icon(Icons.arrow_back),
                            label: const Text('Back'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey.shade300,
                              foregroundColor: Colors.black,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() {
                                scannedData = null;
                              });
                            },
                            icon: const Icon(Icons.refresh),
                            label: const Text('Scan Again'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
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
    );
  }

  Widget _buildResultField({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
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
}

