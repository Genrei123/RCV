import 'dart:io';
import 'dart:typed_data';

import 'package:crop_your_image/crop_your_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show compute; // offload heavy work
import 'package:path_provider/path_provider.dart';
import 'package:image/image.dart' as img;
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class CropLabelPage extends StatefulWidget {
  const CropLabelPage({super.key});

  @override
  State<CropLabelPage> createState() => _CropLabelPageState();
}

class _CropLabelPageState extends State<CropLabelPage> {
  final CropController _controller = CropController();
  Uint8List? _imageBytes;
  Uint8List?
  _previewBytes; // what the Crop widget displays (original or grayscale)
  bool _isCropping = false;
  bool _applyGrayscale = false;
  bool _isBuildingPreview = false;
  int _previewTaskId = 0; // guards against outdated async results

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
      await _rebuildPreview();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load image: $e')));
      Navigator.pop(context);
    }
  }

  Future<void> _rebuildPreview() async {
    if (_imageBytes == null) return;
    if (_isBuildingPreview) return; // debounce if a build is already running
    final int taskId = ++_previewTaskId;
    setState(() => _isBuildingPreview = true);
    try {
      if (_applyGrayscale) {
        final Uint8List result = await compute(
          _buildPreviewBytes,
          <String, dynamic>{
            'bytes': _imageBytes!,
            'applyGrayscale': true,
            'maxDim': 1600,
          },
        );
        if (!mounted || taskId != _previewTaskId) return;
        _previewBytes = result;
      } else {
        _previewBytes = _imageBytes;
      }
    } catch (_) {
      _previewBytes = _imageBytes;
    } finally {
      if (mounted && taskId == _previewTaskId) {
        setState(() => _isBuildingPreview = false);
      }
    }
  }

  Future<void> _onConfirmCrop() async {
    if (_imageBytes == null || _isCropping) return;
    setState(() => _isCropping = true);
    _controller.crop();
  }

  Future<void> _handleCropped(Uint8List bytes) async {
    try {
      Uint8List outputBytes = bytes;
      if (_applyGrayscale) {
        final img.Image? decoded = img.decodeImage(bytes);
        if (decoded != null) {
          final img.Image gray = img.grayscale(decoded);
          final List<int> png = img.encodePng(gray, level: 6);
          outputBytes = Uint8List.fromList(png);
        }
      }

      final dir = await getTemporaryDirectory();
      final ext = _applyGrayscale ? 'png' : 'jpg';
      final file = File(
        '${dir.path}/crop_${DateTime.now().millisecondsSinceEpoch}.$ext',
      );
      await file.writeAsBytes(outputBytes);
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
      canPop: !(_isCropping || _isBuildingPreview),
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
                        if (_previewBytes != null)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                            child: Crop(
                              image: _previewBytes!,
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
                        if (_isBuildingPreview)
                          Container(
                            color: Colors.black.withValues(alpha: 0.2),
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                        if (_isCropping)
                          Container(
                            color: Colors.black.withValues(alpha: 0.3),
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                        if (_applyGrayscale && !_isBuildingPreview)
                          Positioned(
                            left: 8,
                            top: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'Grayscale preview',
                                style: TextStyle(color: Colors.white),
                              ),
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
                        
                          const SizedBox(height: 8),
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
                                onPressed: (_isCropping || _isBuildingPreview || _imageBytes == null)
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

  // (Reverted) Binarization helper removed
}

// Top-level function for compute(): builds a fast preview (optionally grayscale)
Uint8List _buildPreviewBytes(Map<String, dynamic> args) {
  final Uint8List bytes = args['bytes'] as Uint8List;
  final bool applyGrayscale = args['applyGrayscale'] == true;
  final int maxDim = (args['maxDim'] as int?) ?? 1600;

  final img.Image? decoded = img.decodeImage(bytes);
  if (decoded == null) return bytes;

  img.Image image = decoded;
  final int w = image.width;
  final int h = image.height;

  if (w > maxDim || h > maxDim) {
    final double scale = w > h ? maxDim / w : maxDim / h;
    final int newW = (w * scale).round();
    final int newH = (h * scale).round();
    image = img.copyResize(
      image,
      width: newW,
      height: newH,
      interpolation: img.Interpolation.linear,
    );
  }

  if (applyGrayscale) {
    image = img.grayscale(image);
  }

  // JPEG is faster/smaller for preview; crop output quality is handled separately
  final List<int> jpg = img.encodeJpg(image, quality: 90);
  return Uint8List.fromList(jpg);
}
