import 'dart:io';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'dart:developer' as developer;

/// Service for preprocessing images before OCR
/// Handles image enhancement like grayscale conversion
class ImagePreprocessingService {
  /// Convert an image to grayscale for better OCR text extraction
  /// 
  /// This preserves the original colored image but returns a grayscale version
  /// optimized for text extraction.
  /// 
  /// Returns the file path of the grayscale image
  static Future<String> convertToGrayscale(String imagePath) async {
    try {
      developer.log('🖼️ Converting image to grayscale: $imagePath');
      
      // Read the original image
      final File imageFile = File(imagePath);
      final Uint8List imageBytes = await imageFile.readAsBytes();
      
      // Decode image
      final img.Image? decodedImage = img.decodeImage(imageBytes);
      if (decodedImage == null) {
        developer.log('❌ Failed to decode image');
        throw Exception('Failed to decode image');
      }
      
      // Convert to grayscale
      final img.Image grayscaleImage = img.grayscale(decodedImage);
      
      // Encode back to PNG
      final List<int> pngBytes = img.encodePng(grayscaleImage, level: 6);
      
      // Save to temporary directory
      final Directory tempDir = await getTemporaryDirectory();
      final String fileName = 'ocr_grayscale_${DateTime.now().millisecondsSinceEpoch}.png';
      final File grayscaleFile = File('${tempDir.path}/$fileName');
      
      await grayscaleFile.writeAsBytes(pngBytes);
      
      developer.log('✅ Grayscale image saved: ${grayscaleFile.path}');
      return grayscaleFile.path;
    } catch (e) {
      developer.log('❌ Error converting to grayscale: $e');
      throw Exception('Failed to convert image to grayscale: $e');
    }
  }
  
  /// Batch convert multiple images to grayscale
  /// 
  /// Useful when processing multiple images at once
  /// Returns list of paths to grayscale versions
  static Future<List<String>> convertMultipleToGrayscale(List<String> imagePaths) async {
    try {
      developer.log('🖼️ Converting ${imagePaths.length} images to grayscale');
      
      final List<String> grayscalePaths = [];
      for (final path in imagePaths) {
        final grayscalePath = await convertToGrayscale(path);
        grayscalePaths.add(grayscalePath);
      }
      
      developer.log('✅ All images converted to grayscale');
      return grayscalePaths;
    } catch (e) {
      developer.log('❌ Error batch converting images: $e');
      throw Exception('Failed to batch convert images: $e');
    }
  }
}
