import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../themes/app_colors.dart';
import '../widgets/title_logo_header_app_bar.dart';

enum PackSide { front, back }

class PackCapturePage extends StatefulWidget {
  final VoidCallback onComplete;
  final Function(Map<PackSide, String?>) onImagesSelected;

  const PackCapturePage({
    Key? key,
    required this.onComplete,
    required this.onImagesSelected,
  }) : super(key: key);

  @override
  State<PackCapturePage> createState() => _PackCapturePageState();
}

class _PackCapturePageState extends State<PackCapturePage> {
  final ImagePicker _imagePicker = ImagePicker();
  Map<PackSide, String?> capturedImages = {
    PackSide.front: null,
    PackSide.back: null,
  };

  Future<void> _captureImage(PackSide side) async {
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

  String _getCaptureSideLabel(PackSide side) {
    switch (side) {
      case PackSide.front:
        return 'Capture front image';
      case PackSide.back:
        return 'Capture back image';
    }
  }

  Widget _buildPackImageSlot(PackSide side) {
    final isCaptured = capturedImages[side] != null;
    final displayName = side.toString().split('.').last.toUpperCase();

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
              Icon(Icons.add_a_photo, size: 48, color: AppColors.primary),
            if (!isCaptured) const SizedBox(height: 12),
            if (!isCaptured)
              Text(
                _getCaptureSideLabel(side),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
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
    final bool allCaptured = capturedCount == 2;

    return PopScope(
      canPop: true,
      child: Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'Pack Capture',
          showBackButton: false,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Back button at top left
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
                const SizedBox(height: 24),
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
                            'Pack Product Capture',
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
                        'Capture both front and back images of the pack for product scanning.',
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
                        'Progress: $capturedCount/2',
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
                            value: capturedCount / 2,
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

                // Image capture slots - horizontal layout
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 280,
                        child: _buildPackImageSlot(PackSide.front),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: SizedBox(
                        height: 280,
                        child: _buildPackImageSlot(PackSide.back),
                      ),
                    ),
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
                        Navigator.pop(context, capturedImages);
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('Both Images Captured - Continue'),
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
                        'Capture remaining ${2 - capturedCount} image(s)',
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
