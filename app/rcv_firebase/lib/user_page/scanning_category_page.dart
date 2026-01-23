import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../themes/app_colors.dart';
import 'scanning_page.dart';

enum ScanningCategory {
  cannedProduct,
  sackProduct,
  packProduct,
  boxProduct,
  qrScan,
}

class ScanningCategoryPage extends StatelessWidget {
  const ScanningCategoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const TitleLogoHeaderAppBar(
          title: 'Scanning',
          showBackButton: false,
        ),
        Expanded(
          child: _buildContent(context),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
                const Text(
                  'Product Category',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select the type of product you want to scan',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
                const SizedBox(height: 22),

                // Product Type Cards
                _buildCategoryCard(
                  context,
                  title: 'Canned Product',
                  description: 'Scan products in cans or tins',
                  icon: FontAwesomeIcons.candyCane,
                  color: AppColors.primary,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerPage(
                          category: ScanningCategory.cannedProduct,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),

                _buildCategoryCard(
                  context,
                  title: 'Sack Product',
                  description: 'Scan products in sacks or bags',
                  icon: LucideIcons.package,
                  color: AppColors.success,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerPage(
                          category: ScanningCategory.sackProduct,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),

                _buildCategoryCard(
                  context,
                  title: 'Pack Product',
                  description: 'Scan products in sachets or packs',
                  icon: Icons.inventory_2,
                  color: AppColors.secondary,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerPage(
                          category: ScanningCategory.packProduct,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),

                _buildCategoryCard(
                  context,
                  title: 'Box Product',
                  description: 'Scan products in boxes (6-side capture)',
                  icon: Icons.card_giftcard,
                  color: const Color(0xFF6B21A8),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerPage(
                          category: ScanningCategory.boxProduct,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 32),

                const Divider(),
                const SizedBox(height: 16),

                // QR Scan Option
                _buildCategoryCard(
                  context,
                  title: 'QR Scan',
                  description: 'Quick scan using QR code',
                  icon: Icons.qr_code_scanner,
                  color: AppColors.primaryLight,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerPage(
                          category: ScanningCategory.qrScan,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      }

  Widget _buildCategoryCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [color.withValues(alpha: 0.1), color.withValues(alpha: 0.05)],
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 30),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, color: color, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
