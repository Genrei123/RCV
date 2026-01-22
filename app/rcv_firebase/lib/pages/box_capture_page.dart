import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../themes/app_colors.dart';
import '../widgets/title_logo_header_app_bar.dart';

enum BoxSide { top, bottom, front, back, left, right }

class BoxCapturePage extends StatefulWidget {
  final VoidCallback onComplete;
  final Function(Map<BoxSide, String?>) onImagesSelected;

  const BoxCapturePage({
    Key? key,
    required this.onComplete,
    required this.onImagesSelected,
  }) : super(key: key);

  @override
  State<BoxCapturePage> createState() => _BoxCapturePageState();
}

class _BoxCapturePageState extends State<BoxCapturePage> {
  final ImagePicker _imagePicker = ImagePicker();
  Map<BoxSide, String?> capturedImages = {
    BoxSide.top: null,
    BoxSide.bottom: null,
    BoxSide.front: null,
    BoxSide.back: null,
    BoxSide.left: null,
    BoxSide.right: null,
  };

  Future<void> _captureImage(BoxSide side) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (image != null) {
        setState(() {
          capturedImages[side] = image.path;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error capturing image: $e')));
    }
  }

  String _getBoxCaptureLabelButton(BoxSide side) {
    switch (side) {
      case BoxSide.top:
        return 'Capture top';
      case BoxSide.bottom:
        return 'Capture bottom';
      case BoxSide.front:
        return 'Capture front';
      case BoxSide.back:
        return 'Capture back';
      case BoxSide.left:
        return 'Capture left';
      case BoxSide.right:
        return 'Capture right';
    }
  }

  Widget _buildBoxSideButton(BoxSide side) {
    final isCaptureed = capturedImages[side] != null;

    return GestureDetector(
      onTap: () => _captureImage(side),
      child: Container(
        decoration: BoxDecoration(
          color: isCaptureed
              ? AppColors.success.withOpacity(0.2)
              : AppColors.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCaptureed ? AppColors.success : AppColors.primary,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: isCaptureed
              ? MainAxisAlignment.start
              : MainAxisAlignment.center,
          children: [
            if (isCaptureed && capturedImages[side] != null)
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
            if (!isCaptureed) const SizedBox(height: 8),
            if (!isCaptureed)
              Text(
                _getBoxCaptureLabelButton(side),
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
    final int capturedCount = capturedImages.values
        .where((image) => image != null)
        .length;
    final bool allCaptured = capturedCount == 6;

    return PopScope(
      canPop: true,
      child: Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'Box Capture',
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
                            'Box 6-Side Capture',
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
                        'Capture all 6 sides of the box for complete product information. Tap each side to take a photo.',
                        style: TextStyle(fontSize: 14, color: Colors.black87),
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
                        'Progress: $capturedCount/6',
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
                            value: capturedCount / 6,
                            minHeight: 6,
                            backgroundColor: AppColors.primary.withOpacity(0.2),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              allCaptured
                                  ? AppColors.success
                                  : AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      if (allCaptured)
                        const Icon(
                          Icons.check_circle,
                          color: AppColors.success,
                          size: 20,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Box side capture grid - 3x2 layout
                GridView.count(
                  crossAxisCount: 3,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildBoxSideButton(BoxSide.top),
                    _buildBoxSideButton(BoxSide.bottom),
                    _buildBoxSideButton(BoxSide.front),
                    _buildBoxSideButton(BoxSide.back),
                    _buildBoxSideButton(BoxSide.left),
                    _buildBoxSideButton(BoxSide.right),
                  ],
                ),
                const SizedBox(height: 24),

                // Action button
                if (allCaptured)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        widget.onImagesSelected(capturedImages);
                        widget.onComplete();
                        Navigator.pop(context);
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
                      label: Text(
                        'Capture remaining ${6 - capturedCount} sides',
                      ),
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
