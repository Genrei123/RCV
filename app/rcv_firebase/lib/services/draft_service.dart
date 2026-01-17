import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_service.dart';

class DraftService {
  static const String _draftsKeyPrefix = 'compliance_report_drafts_';

  // Get user-specific drafts key
  static Future<String> _getDraftsKey() async {
    final token = await AuthService.getToken();
    if (token == null) {
      return '${_draftsKeyPrefix}anonymous';
    }

    // Extract user ID from token (it's a JWT)
    try {
      final parts = token.split('.');
      if (parts.length == 3) {
        final payload = json.decode(
          utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
        );
        final userId = payload['sub'] ?? 'anonymous';
        return '$_draftsKeyPrefix$userId';
      }
    } catch (e) {
      // If token parsing fails, use anonymous
    }
    return '${_draftsKeyPrefix}anonymous';
  }

  // Save a draft
  static Future<void> saveDraft(Map<String, dynamic> draftData) async {
    final prefs = await SharedPreferences.getInstance();
    final draftsKey = await _getDraftsKey();
    List<String> drafts = prefs.getStringList(draftsKey) ?? [];

    // Add timestamp and ID if not present
    if (!draftData.containsKey('id')) {
      draftData['id'] = DateTime.now().millisecondsSinceEpoch.toString();
    }
    draftData['savedAt'] = DateTime.now().toIso8601String();

    // Check if draft with same ID exists and update it
    int existingIndex = -1;
    for (int i = 0; i < drafts.length; i++) {
      final d = jsonDecode(drafts[i]);
      if (d['id'] == draftData['id']) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex != -1) {
      drafts[existingIndex] = jsonEncode(draftData);
    } else {
      drafts.add(jsonEncode(draftData));
    }

    await prefs.setStringList(draftsKey, drafts);
  }

  // Get all drafts
  static Future<List<Map<String, dynamic>>> getDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final draftsKey = await _getDraftsKey();
    List<String> drafts = prefs.getStringList(draftsKey) ?? [];

    return drafts.map((d) => jsonDecode(d) as Map<String, dynamic>).toList()
      ..sort((a, b) {
        // Sort by newest first
        DateTime dateA =
            DateTime.tryParse(a['savedAt'] ?? '') ?? DateTime(2000);
        DateTime dateB =
            DateTime.tryParse(b['savedAt'] ?? '') ?? DateTime(2000);
        return dateB.compareTo(dateA);
      });
  }

  // Delete a draft
  static Future<void> deleteDraft(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final draftsKey = await _getDraftsKey();
    List<String> drafts = prefs.getStringList(draftsKey) ?? [];

    drafts.removeWhere((d) {
      final Map<String, dynamic> data = jsonDecode(d);
      return data['id'] == id;
    });

    await prefs.setStringList(draftsKey, drafts);
  }

  // Clear all drafts for current user
  static Future<void> clearAllDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final draftsKey = await _getDraftsKey();
    await prefs.remove(draftsKey);
  }

  // Clear all drafts for all users (used during logout to be safe)
  static Future<void> clearAllDraftsForAllUsers() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys();
    for (final key in keys) {
      if (key.startsWith(_draftsKeyPrefix)) {
        await prefs.remove(key);
      }
    }
  }
}
