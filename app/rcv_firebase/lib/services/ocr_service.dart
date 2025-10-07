// =========================================================================
// OCR SERVICE - OPTICAL CHARACTER RECOGNITION
// =========================================================================
// This service provides modular OCR functionality with:
// - Image loading and validation
// - Image preprocessing for better accuracy
// - Multi-language text extraction
// - Result saving and management
// =========================================================================

import 'dart:io';
import 'dart:developer' as developer;
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// =========================================================================
// OCR RESULT MODEL
// =========================================================================
class OcrResult {
  final String text;
  final String language;
  final double confidence;
  final DateTime timestamp;
  final String? sourceFilePath;

  OcrResult({
    required this.text,
    required this.language,
    required this.confidence,
    required this.timestamp,
    this.sourceFilePath,
  });

  Map<String, dynamic> toJson() => {
        'text': text,
        'language': language,
        'confidence': confidence,
        'timestamp': timestamp.toIso8601String(),
        'sourceFilePath': sourceFilePath,
      };

  factory OcrResult.fromJson(Map<String, dynamic> json) => OcrResult(
        text: json['text'],
        language: json['language'],
        confidence: json['confidence'],
        timestamp: DateTime.parse(json['timestamp']),
        sourceFilePath: json['sourceFilePath'],
      );
}

// =========================================================================
// OCR SERVICE CLASS
// =========================================================================
class OcrService {
  static final OcrService _instance = OcrService._internal();
  factory OcrService() => _instance;
  OcrService._internal();

  final ImagePicker _imagePicker = ImagePicker();
  TextRecognizer? _textRecognizer;

  // Supported languages (English by default, expandable)
  final List<String> supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja'];

  // =========================================================================
  // STEP 1: LOAD IMAGE
  // =========================================================================
  /// Loads an image from camera or gallery
  /// Returns the File object or null if cancelled/error
  Future<File?> loadImage({required ImageSource source}) async {
    try {
      developer.log('📷 Loading image from ${source == ImageSource.camera ? "camera" : "gallery"}');

      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source,
        imageQuality: 100, // High quality for better OCR
      );

      if (pickedFile == null) {
        developer.log('⚠️ No image selected');
        return null;
      }

      final File imageFile = File(pickedFile.path);
      
      // Validate file exists and is readable
      if (!await imageFile.exists()) {
        throw Exception('Image file does not exist');
      }

      final int fileSize = await imageFile.length();
      developer.log('✅ Image loaded successfully: ${pickedFile.path} (${fileSize ~/ 1024} KB)');

      return imageFile;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error loading image',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 2: PREPROCESS IMAGE
  // =========================================================================
  /// Preprocesses the image for better OCR accuracy
  /// In this implementation, we validate and prepare the image
  /// For advanced preprocessing (contrast, denoising), consider using the 'image' package
  Future<File> preprocessImage(File imageFile) async {
    try {
      developer.log('🔧 Preprocessing image: ${imageFile.path}');

      // Validate image format
      final String extension = imageFile.path.split('.').last.toLowerCase();
      final List<String> supportedFormats = ['jpg', 'jpeg', 'png'];
      
      if (!supportedFormats.contains(extension)) {
        throw Exception('Unsupported image format: $extension. Supported: ${supportedFormats.join(", ")}');
      }

      // Check file size (max 10MB)
      final int fileSize = await imageFile.length();
      const int maxSize = 10 * 1024 * 1024; // 10MB
      
      if (fileSize > maxSize) {
        throw Exception('Image too large: ${fileSize ~/ 1024 ~/ 1024}MB. Max size: 10MB');
      }

      developer.log('✅ Image preprocessing complete');
      
      // For now, return the original file
      // Future enhancement: Add image enhancement (contrast, sharpening, denoising)
      return imageFile;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error preprocessing image',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 3: EXTRACT TEXT
  // =========================================================================
  /// Extracts text from the preprocessed image using ML Kit
  /// Supports multiple languages and returns confidence scores
  Future<OcrResult> extractText(File imageFile, {String language = 'en'}) async {
    try {
      developer.log('🔍 Extracting text from image (language: $language)');

      // Initialize text recognizer for the specified language
      _textRecognizer = _getTextRecognizerForLanguage(language);

      // Create InputImage from file
      final InputImage inputImage = InputImage.fromFile(imageFile);

      // Process image with ML Kit
      final RecognizedText recognizedText = await _textRecognizer!.processImage(inputImage);

      // Extract text and calculate average confidence
      final String extractedText = recognizedText.text;
      final double confidence = _calculateConfidence(recognizedText);

      developer.log('✅ Text extraction complete: ${extractedText.length} characters, confidence: ${(confidence * 100).toStringAsFixed(1)}%');

      // Create result object
      final OcrResult result = OcrResult(
        text: extractedText,
        language: language,
        confidence: confidence,
        timestamp: DateTime.now(),
        sourceFilePath: imageFile.path,
      );

      return result;
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error extracting text',
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  // =========================================================================
  // STEP 4: SAVE RESULT
  // =========================================================================
  /// Saves the OCR result to local storage
  /// Stores both in SharedPreferences (for history) and as a file
  Future<void> saveResult(OcrResult result) async {
    try {
      developer.log('💾 Saving OCR result');

      // Save to SharedPreferences for history
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final List<String> history = prefs.getStringList('ocr_history') ?? [];
      
      // Add new result (limit to last 50 results)
      history.insert(0, result.text);
      if (history.length > 50) {
        history.removeRange(50, history.length);
      }
      
      await prefs.setStringList('ocr_history', history);

      // Save to file for detailed record
      final Directory appDir = await getApplicationDocumentsDirectory();
      final String fileName = 'ocr_${result.timestamp.millisecondsSinceEpoch}.txt';
      final File resultFile = File('${appDir.path}/$fileName');
      
      final StringBuffer content = StringBuffer();
      content.writeln('OCR Result');
      content.writeln('==========');
      content.writeln('Timestamp: ${result.timestamp}');
      content.writeln('Language: ${result.language}');
      content.writeln('Confidence: ${(result.confidence * 100).toStringAsFixed(1)}%');
      content.writeln('Source: ${result.sourceFilePath ?? "N/A"}');
      content.writeln('\nExtracted Text:');
      content.writeln('---------------');
      content.writeln(result.text);
      
      await resultFile.writeAsString(content.toString());

      developer.log('✅ Result saved: $fileName');
    } catch (e, stackTrace) {
      developer.log(
        '❌ Error saving result',
        error: e,
        stackTrace: stackTrace,
      );
      // Don't rethrow - saving is optional
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /// Gets the appropriate text recognizer for the specified language
  TextRecognizer _getTextRecognizerForLanguage(String language) {
    // ML Kit supports Latin, Chinese, Devanagari, Japanese, Korean scripts
    // For simplicity, we'll use Latin script recognizer
    // Future enhancement: Map languages to specific scripts
    return TextRecognizer(script: TextRecognitionScript.latin);
  }

  /// Calculates average confidence from recognized text blocks
  double _calculateConfidence(RecognizedText recognizedText) {
    if (recognizedText.blocks.isEmpty) return 0.0;

    // ML Kit doesn't provide confidence scores directly
    // We'll use a heuristic based on text structure
    int totalCharacters = 0;
    int recognizedWords = 0;

    for (final TextBlock block in recognizedText.blocks) {
      for (final TextLine line in block.lines) {
        for (final TextElement element in line.elements) {
          totalCharacters += element.text.length;
          recognizedWords++;
        }
      }
    }

    // Simple heuristic: more words and characters indicate higher confidence
    if (totalCharacters == 0) return 0.0;
    
    // Estimate confidence based on word density
    double avgWordLength = totalCharacters / recognizedWords.clamp(1, double.infinity);
    double confidence = (avgWordLength / 10).clamp(0.0, 1.0);
    
    return confidence;
  }

  /// Retrieves OCR history from SharedPreferences
  Future<List<String>> getHistory() async {
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      return prefs.getStringList('ocr_history') ?? [];
    } catch (e) {
      developer.log('Error retrieving history: $e');
      return [];
    }
  }

  /// Clears OCR history
  Future<void> clearHistory() async {
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('ocr_history');
      developer.log('✅ History cleared');
    } catch (e) {
      developer.log('Error clearing history: $e');
    }
  }

  // =========================================================================
  // DISPOSE
  // =========================================================================
  /// Cleans up resources
  Future<void> dispose() async {
    await _textRecognizer?.close();
    _textRecognizer = null;
  }
}
