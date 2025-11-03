// =========================================================================
// OCR SCANNER PAGE - USER INTERFACE
// =========================================================================
// This page provides the UI for OCR functionality:
// - Image source selection (camera or gallery)
// - Processing progress indication
// - Results display with copy functionality
// - History view
// =========================================================================

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import '../services/ocr_service.dart';

class OcrScannerPage extends StatefulWidget {
  const OcrScannerPage({super.key});

  @override
  State<OcrScannerPage> createState() => _OcrScannerPageState();
}

class _OcrScannerPageState extends State<OcrScannerPage> {
  final OcrService _ocrService = OcrService();

  bool _isProcessing = false;
  File? _selectedImage;
  OcrResult? _result;
  String? _errorMessage;
  List<String> _history = [];
  // Default to combined English + Filipino + Tagalog
  String _selectedLangs = 'eng+fil+tgl';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _ocrService.dispose();
    super.dispose();
  }

  // =========================================================================
  // LOAD HISTORY
  // =========================================================================
  Future<void> _loadHistory() async {
    final history = await _ocrService.getHistory();
    setState(() {
      _history = history;
    });
  }

  // =========================================================================
  // PROCESS IMAGE PIPELINE
  // =========================================================================
  Future<void> _processImage(ImageSource source) async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
      _result = null;
      _selectedImage = null;
    });

    try {
      // Step 1: Load image
      final File? imageFile = await _ocrService.loadImage(source: source);
      if (imageFile == null) {
        setState(() {
          _isProcessing = false;
        });
        return;
      }

      // Redirect to crop page first
      String? croppedPath;
      try {
        croppedPath =
            await Navigator.pushNamed(
                  context,
                  '/crop-label',
                  arguments: {'imagePath': imageFile.path},
                )
                as String?;
      } catch (_) {}

      final File finalImage = (croppedPath != null && croppedPath.isNotEmpty)
          ? File(croppedPath)
          : imageFile;

      setState(() {
        _selectedImage = finalImage;
      });

      // Step 2: Preprocess image
      final File preprocessedImage = await _ocrService.preprocessImage(
        finalImage,
      );

      // Step 3: Extract text
      final OcrResult result = await _ocrService.extractText(
        preprocessedImage,
        language:
            _selectedLangs, // Supports 'eng', 'fil', 'tgl', or combos like 'eng+fil+tgl'
      );

      // Step 4: Save result
      await _ocrService.saveResult(result);
      await _loadHistory();

      setState(() {
        _result = result;
        _isProcessing = false;
      });

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Text extracted: ${result.text.length} characters'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isProcessing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // =========================================================================
  // COPY TO CLIPBOARD
  // =========================================================================
  Future<void> _copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('📋 Copied to clipboard'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  // =========================================================================
  // UI BUILD
  // =========================================================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'OCR Text Scanner',
          style: TextStyle(color: AppColors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_history.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.history, color: AppColors.white),
              onPressed: _showHistory,
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // Instructions
              _buildInstructions(),
              const SizedBox(height: 30),

              // Action buttons
              _buildActionButtons(),
              const SizedBox(height: 16),
              _buildLanguageSelector(),
              const SizedBox(height: 30),

              // Processing indicator
              if (_isProcessing) _buildProcessingIndicator(),

              // Selected image preview
              if (_selectedImage != null && !_isProcessing)
                _buildImagePreview(),

              // Error message
              if (_errorMessage != null) _buildErrorMessage(),

              // Results
              if (_result != null && !_isProcessing) _buildResults(),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // UI COMPONENTS
  // =========================================================================

  Widget _buildInstructions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.white.withOpacity(0.3)),
      ),
      child: const Column(
        children: [
          Icon(Icons.text_fields, color: AppColors.white, size: 48),
          SizedBox(height: 15),
          Text(
            'Extract Text from Images',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 10),
          Text(
            'Select an image from your camera or gallery to extract text.\n\nSupported formats: JPG, PNG',
            style: TextStyle(color: AppColors.white, fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _isProcessing
                ? null
                : () => _processImage(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('Camera'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.white,
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        const SizedBox(width: 15),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _isProcessing
                ? null
                : () => _processImage(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('Gallery'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.white,
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLanguageSelector() {
    final options = <String>[
      'eng',
      'fil',
      'tgl',
      'eng+fil',
      'eng+tgl',
      'fil+tgl',
      'eng+fil+tgl',
    ];

    return Row(
      children: [
        const Text(
          'Language(s):',
          style: TextStyle(color: AppColors.white, fontWeight: FontWeight.bold),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedLangs,
                items: options
                    .map(
                      (v) => DropdownMenuItem(
                        value: v,
                        child: Text(v.toUpperCase()),
                      ),
                    )
                    .toList(),
                onChanged: _isProcessing
                    ? null
                    : (v) =>
                          setState(() => _selectedLangs = v ?? 'eng+fil+tgl'),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProcessingIndicator() {
    return Container(
      padding: const EdgeInsets.all(30),
      decoration: BoxDecoration(
        color: AppColors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Column(
        children: [
          CircularProgressIndicator(color: AppColors.white),
          SizedBox(height: 20),
          Text(
            'Processing image...',
            style: TextStyle(color: AppColors.white, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.white, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.file(
          _selectedImage!,
          height: 200,
          width: double.infinity,
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResults() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Extracted Text',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy, color: AppColors.primary),
                onPressed: () => _copyToClipboard(_result!.text),
                tooltip: 'Copy to clipboard',
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 10),

          // Metadata
          _buildMetadataRow('Language:', _result!.language.toUpperCase()),
          _buildMetadataRow(
            'Confidence:',
            '${(_result!.confidence * 100).toStringAsFixed(1)}%',
          ),
          _buildMetadataRow('Characters:', '${_result!.text.length}'),
          const SizedBox(height: 15),

          // Extracted text
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: SelectableText(
              _result!.text.isEmpty ? 'No text found in image' : _result!.text,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 16,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetadataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 10),
          Text(value, style: const TextStyle(color: AppColors.primary)),
        ],
      ),
    );
  }

  // =========================================================================
  // SHOW HISTORY DIALOG
  // =========================================================================
  void _showHistory() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('OCR History'),
        content: SizedBox(
          width: double.maxFinite,
          child: _history.isEmpty
              ? const Center(child: Text('No history available'))
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: _history.length,
                  itemBuilder: (context, index) {
                    final text = _history[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary,
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(color: AppColors.white),
                        ),
                      ),
                      title: Text(
                        text.length > 50 ? '${text.substring(0, 50)}...' : text,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.copy),
                        onPressed: () {
                          _copyToClipboard(text);
                          Navigator.pop(context);
                        },
                      ),
                    );
                  },
                ),
        ),
        actions: [
          if (_history.isNotEmpty)
            TextButton(
              onPressed: () async {
                await _ocrService.clearHistory();
                await _loadHistory();
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text('Clear History'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
