import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../widgets/title_logo_header_app_bar.dart';
import '../themes/app_colors.dart';

enum CanSide { front, right, back, left }

class CanRotationCapturePage extends StatefulWidget {
  const CanRotationCapturePage({super.key});

  @override
  State<CanRotationCapturePage> createState() => _CanRotationCapturePageState();
}

class _CanRotationCapturePageState extends State<CanRotationCapturePage>
    with TickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  late AnimationController _rotationController;
  late AnimationController _pulseController;

  final Map<CanSide, String?> capturedImages = {
    CanSide.front: null,
    CanSide.right: null,
    CanSide.back: null,
    CanSide.left: null,
  };

  int currentStep = 0;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _pulseController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _captureImage(CanSide side) async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image == null) return;

    setState(() {
      capturedImages[side] = image.path;
      if (currentStep < 3) {
        currentStep++;
      }
    });
  }

  bool get _allCaptured => capturedImages.values.every((path) => path != null);

  String _getCanCaptureLabelButton(CanSide side) {
    switch (side) {
      case CanSide.front:
        return 'Capture front';
      case CanSide.right:
        return 'Capture right';
      case CanSide.back:
        return 'Capture back';
      case CanSide.left:
        return 'Capture left';
    }
  }

  Widget _buildCanSideButton(CanSide side) {
    final isCaptured = capturedImages[side] != null;

    return GestureDetector(
      onTap: () => _captureImage(side),
      child: Container(
        decoration: BoxDecoration(
          color: isCaptured
              ? AppColors.success.withOpacity(0.2)
              : AppColors.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCaptured ? AppColors.success : AppColors.primary,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: isCaptured
              ? MainAxisAlignment.start
              : MainAxisAlignment.center,
          children: [
            if (isCaptured && capturedImages[side] != null)
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.file(
                      File(capturedImages[side]!),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              )
            else
              Icon(Icons.add_a_photo, size: 32, color: AppColors.primary),
            if (!isCaptured) const SizedBox(height: 8),
            if (!isCaptured)
              Text(
                _getCanCaptureLabelButton(side),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      child: Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'Can Capture',
          showBackButton: false,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Back button at top
                Align(
                  alignment: Alignment.topLeft,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, size: 18),
                    label: const Text('Back'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Instructions
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info, color: AppColors.primary, size: 20),
                          const SizedBox(width: 12),
                          const Text(
                            'Rotating Can Capture',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Rotate your can and capture all 4 sides for complete label scanning. This helps capture all product information.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black87,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Progress indicator
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Progress: $currentStep/4',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: LinearProgressIndicator(
                            value: currentStep / 4,
                            minHeight: 6,
                            backgroundColor: AppColors.primary.withOpacity(0.2),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _allCaptured
                                  ? AppColors.success
                                  : AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      if (_allCaptured)
                        const Icon(
                          Icons.check_circle,
                          color: AppColors.success,
                          size: 20,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Capture cards grid - 2x2 layout
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildCanSideButton(CanSide.front),
                    _buildCanSideButton(CanSide.right),
                    _buildCanSideButton(CanSide.back),
                    _buildCanSideButton(CanSide.left),
                  ],
                ),
                const SizedBox(height: 24),

                // Action buttons
                if (_allCaptured)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context, capturedImages);
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('All Sides Captured - Continue'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: null,
                      icon: const Icon(Icons.hourglass_empty),
                      label: Text('Capture remaining ${4 - currentStep} sides'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        disabledForegroundColor: AppColors.primary.withOpacity(
                          0.6,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
