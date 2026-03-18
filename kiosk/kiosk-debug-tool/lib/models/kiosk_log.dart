import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents a single log entry from a kiosk machine.
/// Logs are streamed in real-time from Firebase Firestore.
class KioskLog {
  final String id;
  final String level; // 'info', 'warning', 'error', 'debug'
  final String message;
  final String category; // 'general', 'ocr', 'scan', 'api', 'system', 'gpio', 'command'
  final String kioskId;
  final DateTime timestamp;
  final String localTime;
  final Map<String, dynamic>? data;

  KioskLog({
    required this.id,
    required this.level,
    required this.message,
    required this.category,
    required this.kioskId,
    required this.timestamp,
    required this.localTime,
    this.data,
  });

  factory KioskLog.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    
    DateTime parsedTimestamp = DateTime.now();
    final rawTimestamp = d['timestamp'];
    if (rawTimestamp is Timestamp) {
      parsedTimestamp = rawTimestamp.toDate();
    } else if (rawTimestamp is String) {
      parsedTimestamp = DateTime.tryParse(rawTimestamp) ?? DateTime.now();
    } else if (rawTimestamp is int) {
      parsedTimestamp = DateTime.fromMillisecondsSinceEpoch(rawTimestamp);
    }
    
    return KioskLog(
      id: doc.id,
      level: d['level'] ?? 'info',
      message: d['message'] ?? '',
      category: d['category'] ?? 'general',
      kioskId: d['kioskId'] ?? '',
      timestamp: parsedTimestamp,
      localTime: d['localTime']?.toString() ?? '',
      data: d['data'] is Map ? Map<String, dynamic>.from(d['data']) : null,
    );
  }

  /// Display-friendly level label
  String get levelLabel {
    switch (level) {
      case 'error':
        return 'ERR';
      case 'warning':
        return 'WARN';
      case 'debug':
        return 'DBG';
      default:
        return 'INFO';
    }
  }

  /// Display-friendly category label
  String get categoryLabel {
    switch (category) {
      case 'ocr':
        return 'OCR';
      case 'scan':
        return 'SCAN';
      case 'api':
        return 'API';
      case 'system':
        return 'SYS';
      case 'gpio':
        return 'GPIO';
      case 'command':
        return 'CMD';
      default:
        return 'GEN';
    }
  }
}
