import 'dart:io';
import 'dart:typed_data';

import 'package:crop_your_image/crop_your_image.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class CropLabelPage extends StatefulWidget {
  const CropLabelPage({super.key});

  @override
  State<CropLabelPage> createState() => _CropLabelPageState();
}

class _CropLabelPageState extends State<CropLabelPage> {
  final CropController _controller = CropController();
  Uint8List? _imageBytes;
  bool _isCropping = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (_imageBytes == null && args is Map && args['imagePath'] is String) {
      final path = args['imagePath'] as String;
      _loadImageBytes(path);
    }
  }

  Future<void> _loadImageBytes(String path) async {
    try {
      final file = File(path);
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      setState(() => _imageBytes = bytes);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load image: $e')));
      Navigator.pop(context);
    }
  }

  Future<void> _onConfirmCrop() async {
    if (_imageBytes == null || _isCropping) return;
    setState(() => _isCropping = true);
    _controller.crop();
  }

  Future<void> _handleCropped(Uint8List bytes) async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/crop_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await file.writeAsBytes(bytes);
      if (!mounted) return;
      Navigator.pop(context, file.path);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save cropped image: $e')),
      );
      setState(() => _isCropping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isCropping,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: app_colors.AppColors.primary,
          iconTheme: const IconThemeData(color: Colors.white),
          title: const Text(
            'Crop Label',
            style: TextStyle(color: Colors.white),
          ),
          centerTitle: true,
        ),
        body: _imageBytes == null
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Expanded(
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (_imageBytes != null)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                            child: Crop(
                              image: _imageBytes!,
                              controller: _controller,
                              withCircleUi: false,
                              onCropped: (result) async {
                                try {
                                  if (result is CropSuccess) {
                                    await _handleCropped(result.croppedImage);
                                  } else {
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Crop failed: unsupported result (${result.runtimeType})',
                                        ),
                                      ),
                                    );
                                    setState(() => _isCropping = false);
                                  }
                                } catch (e) {
                                  if (!mounted) return;
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Crop failed: $e')),
                                  );
                                  setState(() => _isCropping = false);
                                }
                              },
                              baseColor: Colors.black,
                              maskColor: Colors.black.withValues(alpha: 0.5),
                              cornerDotBuilder: (size, edgeAlignment) =>
                                  Container(
                                    width: size,
                                    height: size,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                            ),
                          ),
                        if (_isCropping)
                          Container(
                            color: Colors.black.withValues(alpha: 0.3),
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                      ],
                    ),
                  ),
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              TextButton.icon(
                                onPressed: _isCropping
                                    ? null
                                    : () => Navigator.pop(context),
                                icon: const Icon(Icons.close),
                                label: const Text('Cancel'),
                              ),
                              FilledButton(
                                onPressed: (_isCropping || _imageBytes == null)
                                    ? null
                                    : _onConfirmCrop,
                                child: _isCropping
                                    ? Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: const [
                                          SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          ),
                                          SizedBox(width: 10),
                                          Text('Processing…'),
                                        ],
                                      )
                                    : Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: const [
                                          Icon(Icons.check),
                                          SizedBox(width: 8),
                                          Text('Crop'),
                                        ],
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
  }
}
