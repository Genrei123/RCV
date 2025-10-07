import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import 'pages/ocr_scanner_page.dart';
import 'dart:math'; // THIS IS NOW CORRECTLY PLACED AT THE TOP

// =========================================================================
// DATA MODEL
// =========================================================================
class ScannedItem {
  final String companyName;
  final String productName;
  final String brandName;
  final String regNumber;
  final String productImage;

  ScannedItem({
    required this.companyName,
    required this.productName,
    required this.brandName,
    required this.regNumber,
    required this.productImage,
  });

  factory ScannedItem.fromJson(Map<String, dynamic> json) {
    return ScannedItem(
      companyName: json['company_name'] ?? '',
      productName: json['product_name'] ?? '',
      brandName: json['brand_name'] ?? '',
      regNumber: json['reg_number'] ?? '',
      productImage: json['product_image'] ?? '',
    );
  }
}

// =========================================================================
// CUSTOM NAVBAR COMPONENT
// =========================================================================
class CustomNavbar extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onItemTapped;

  const CustomNavbar({
    Key? key,
    required this.selectedIndex,
    required this.onItemTapped,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      items: <BottomNavigationBarItem>[
        const BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined),
          activeIcon: Icon(Icons.home),
          label: 'Home',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.fact_check_outlined),
          activeIcon: Icon(Icons.fact_check),
          label: 'Audit',
        ),
        BottomNavigationBarItem(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.qr_code_scanner,
                color: AppColors.white, size: 30),
          ),
          label: '',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.bar_chart_outlined),
          activeIcon: Icon(Icons.bar_chart),
          label: 'Reports',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.person_outlined),
          activeIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
      currentIndex: selectedIndex,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.muted,
      showUnselectedLabels: true,
      onTap: onItemTapped,
      type: BottomNavigationBarType.fixed,
      backgroundColor: AppColors.white,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
    );
  }
}

// =========================================================================
// QR SCANNER PAGE
// =========================================================================
class QRScannerPage extends StatefulWidget {
  const QRScannerPage({Key? key}) : super(key: key);

  @override
  State<QRScannerPage> createState() => _QRScannerPageState();
}

class _QRScannerPageState extends State<QRScannerPage> {
  bool _showDetails = false;
  ScannedItem? _scannedItem;

  Future<void> _loadScannedItem() async {
    // Simulate network delay for a more realistic feel
    await Future.delayed(const Duration(milliseconds: 500));
    try {
      final String response =
          await rootBundle.loadString('assets/data/scanned_item.json');
      final data = json.decode(response);
      setState(() {
        _scannedItem = ScannedItem.fromJson(data);
      });
    } catch (e) {
      print('Error loading scanned_item.json: $e');
      // Set dummy data if JSON fails to load
      setState(() {
        _scannedItem = ScannedItem(
          companyName: 'Dummy Company Inc.',
          productName: 'Sample Product Name',
          brandName: 'Brand X',
          regNumber: 'DM-123456789',
          productImage: 'assets/product_placeholder.png', // Fallback image
        );
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _loadScannedItem();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _showDetails
          ? null // No AppBar for scanned item details, as we're using a custom header
          : AppBar(
              backgroundColor: AppColors.primary,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.white),
                onPressed: () {
                  Navigator.of(context).pop();
                },
              ),
              title: const Text(
                'Scanning Page',
                style: TextStyle(
                    color: AppColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold),
              ),
              centerTitle: true,
              actions: [
                IconButton(
                  icon: const Icon(Icons.info_outline, color: AppColors.white),
                  onPressed: () {
                    // Handle info button press
                  },
                ),
              ],
            ),
      body: _showDetails
          ? (_scannedItem == null
              ? const Center(child: CircularProgressIndicator())
              : _buildScannedItemDetails())
          : _buildQRScannerView(),
      bottomNavigationBar: CustomNavbar(
        selectedIndex: 2,
        onItemTapped: (index) {
          if (index != 2) Navigator.of(context).pop();
        },
      ),
    );
  }

  // 🔹 Black background only for scanning view
  Widget _buildQRScannerView() {
    return Container(
      color: AppColors.text, // black background
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.primary, width: 2),
              ),
              child: Image.asset(
                'assets/dog_food.png', // Changed to dog_food.png
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: AppColors.muted,
                    child: const Center(
                      child: Text(
                        'Image Not Found', // Changed placeholder text
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.white),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 30),
            const Text(
              'Capture the Product Image',
              style: TextStyle(color: AppColors.white, fontSize: 18),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () => setState(() => _showDetails = true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 30, vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Capture image',
                      style: TextStyle(color: AppColors.white)),
                ),
                const SizedBox(width: 20),
                ElevatedButton(
                  onPressed: () => setState(() => _showDetails = true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 30, vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Upload image',
                      style: TextStyle(color: AppColors.white)),
                ),
              ],
            ),
            const SizedBox(height: 30),
            
            // ===================================================================
            // OCR MODE BUTTON - TEXT EXTRACTION FROM IMAGES
            // ===================================================================
            const Divider(color: AppColors.white, thickness: 1),
            const SizedBox(height: 20),
            const Text(
              'Or Extract Text from Images',
              style: TextStyle(color: AppColors.white, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 15),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const OcrScannerPage(),
                  ),
                );
              },
              icon: const Icon(Icons.text_fields, color: AppColors.primary),
              label: const Text(
                'OCR Text Scanner',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 40,
                  vertical: 15,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Custom painter for the hexagonal badge with two checkmarks
  Widget _buildCustomCheckBadgeIcon() {
    return CustomPaint(
      size: const Size(48, 48), // Adjust size as needed
      painter: _HexagonCheckPainter(AppColors.white), // Use AppColors.white for the icon
    );
  }

  // 🔹 Scanned Item Page with custom header matching Image 2
  Widget _buildScannedItemDetails() {
    if (_scannedItem == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Custom header for "Scanned Item"
        Container(
          color: AppColors.primary, // Green background
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.white),
                onPressed: () {
                  setState(() => _showDetails = false);
                },
                padding: EdgeInsets.zero, // Remove default padding
                constraints: const BoxConstraints(), // Remove default constraints
              ),
              const SizedBox(width: 10),
              const Text(
                'Scanned Item',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(), // Pushes the icon to the right
              _buildCustomCheckBadgeIcon(), // Use the custom icon
            ],
          ),
        ),
        
        Expanded( // Wrap content in Expanded to take remaining space
          child: SingleChildScrollView(
            child: Column(
              children: [
                // ✅ Product Image
                Container(
                  padding: const EdgeInsets.all(16.0),
                  child: Center(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.primary, width: 2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(
                          _scannedItem!.productImage,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              height: 200,
                              color: AppColors.muted.withOpacity(0.5),
                              child: const Center(
                                child: Text('Image Not Found',
                                    style: TextStyle(color: AppColors.text)),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),

                // ✅ Details Card
                Container(
                  padding: const EdgeInsets.all(20.0),
                  margin: const EdgeInsets.symmetric(horizontal: 16.0),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    border: Border.all(color: AppColors.primary, width: 1.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Company Name:', _scannedItem!.companyName),
                      _buildDetailRow('Product Name:', _scannedItem!.productName),
                      _buildDetailRow('Brand Name:', _scannedItem!.brandName),
                      const SizedBox(height: 10),
                      const Text(
                        'Registration Details:',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text),
                      ),
                      const SizedBox(height: 5),
                      _buildDetailRow('Reg. Number:', _scannedItem!.regNumber),
                    ],
                  ),
                ),
                const SizedBox(height: 20), // Add some spacing at the bottom
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 14, color: AppColors.muted)),
          Text(value,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text)),
        ],
      ),
    );
  }
}

// =========================================================================
// CUSTOM PAINTER FOR HEXAGONAL CHECK BADGE
// =========================================================================
class _HexagonCheckPainter extends CustomPainter {
  final Color color;

  _HexagonCheckPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke // For the outline
      ..strokeWidth = 3.0; // Adjust for desired thickness

    final path = Path();
    final double radius = size.width / 2;
    final double centerX = size.width / 2;
    final double centerY = size.height / 2;

    // Draw Hexagon outline
    for (int i = 0; i < 6; i++) {
      final double angle = (i * 60 + 30) * (pi / 180); // +30 to rotate upright
      final double x = centerX + radius * cos(angle);
      final double y = centerY + radius * sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);

    // Draw the two checkmarks inside
    final TextPainter textPainter = TextPainter(
      textDirection: TextDirection.ltr,
    );

    // First checkmark
    textPainter.text = TextSpan(
      text: String.fromCharCode(Icons.done.codePoint),
      style: TextStyle(
        fontFamily: Icons.done.fontFamily,
        fontSize: size.width * 0.4, // Adjust size
        color: color,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(size.width * 0.2, size.height * 0.25), // Adjust position
    );

    // Second checkmark (slightly offset)
    textPainter.text = TextSpan(
      text: String.fromCharCode(Icons.done.codePoint),
      style: TextStyle(
        fontFamily: Icons.done.fontFamily,
        fontSize: size.width * 0.4, // Adjust size
        color: color,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(size.width * 0.45, size.height * 0.4), // Adjust position
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}

// =========================================================================
// MAIN
// =========================================================================
void main() {
  runApp(const QRPageApp());
}

class QRPageApp extends StatelessWidget {
  const QRPageApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'QR Scanner Page',
      theme: ThemeData(
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: AppColors.white,
        fontFamily: 'Roboto',
        visualDensity: VisualDensity.adaptivePlatformDensity,
        appBarTheme: const AppBarTheme(
          systemOverlayStyle: SystemUiOverlayStyle.light,
        ),
      ),
      home: const QRScannerPage(),
    );
  }
}