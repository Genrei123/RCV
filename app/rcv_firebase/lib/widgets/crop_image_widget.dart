import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:crop_your_image/crop_your_image.dart';

/// Embeddable crop view built on top of crop_your_image's Crop widget
class CropImageView extends StatelessWidget {
  final Uint8List imageBytes;
  final CropController controller;
  final bool withCircleUi;
  final double? aspectRatio;
  final Color baseColor;
  final Color maskColor;
  final CornerDotBuilder? cornerDotBuilder;
  final ValueChanged<CropResult> onCropped;

  const CropImageView({
    super.key,
    required this.imageBytes,
    required this.controller,
    this.withCircleUi = false,
    this.aspectRatio,
    this.baseColor = Colors.black,
    Color? maskColor,
    this.cornerDotBuilder,
    required this.onCropped,
  }) : maskColor = maskColor ?? const Color.fromRGBO(0, 0, 0, 0.6);

  @override
  Widget build(BuildContext context) {
    return Crop(
      image: imageBytes,
      controller: controller,
      withCircleUi: withCircleUi,
      aspectRatio: aspectRatio,
      baseColor: baseColor,
      maskColor: maskColor,
      cornerDotBuilder:
          cornerDotBuilder ??
          (size, edgeAlignment) => Container(
            width: size,
            height: size,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
      onCropped: onCropped,
    );
  }
}

/// Shows a modal dialog with the crop view and returns cropped image bytes
Future<Uint8List?> showImageCropperDialog(
  BuildContext context, {
  required Uint8List imageBytes,
  String title = 'Crop Image',
  bool withCircleUi = false,
  double? aspectRatio,
  Color headerColor = const Color(0xFF005440),
}) async {
  final CropController controller = CropController();
  bool cropping = false;

  return showDialog<Uint8List?>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setStateDialog) => Dialog(
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 24,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: SizedBox(
            width: MediaQuery.of(ctx).size.width * 0.9,
            height: MediaQuery.of(ctx).size.height * 0.7,
            child: Column(
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: headerColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.photo, color: Colors.white),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: CropImageView(
                          imageBytes: imageBytes,
                          controller: controller,
                          withCircleUi: withCircleUi,
                          aspectRatio: aspectRatio,
                          onCropped: (result) async {
                            if (result is CropSuccess) {
                              // Return the bytes to caller
                              Navigator.of(ctx).pop(result.croppedImage);
                            }
                          },
                        ),
                      ),
                      if (cropping)
                        Container(
                          color: Colors.black45,
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            if (!cropping) {
                              setStateDialog(() => cropping = true);
                              controller.crop();
                            }
                          },
                          icon: const Icon(Icons.check),
                          label: const Text('Crop'),
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
    },
  ).then((value) => value);
}
