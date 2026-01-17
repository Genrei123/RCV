import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class DraftService {
  static const String _draftsKey = 'compliance_report_drafts';

  // Save a draft
  static Future<void> saveDraft(Map<String, dynamic> draftData) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> drafts = prefs.getStringList(_draftsKey) ?? [];
    
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
    
    await prefs.setStringList(_draftsKey, drafts);
  }

  // Get all drafts
  static Future<List<Map<String, dynamic>>> getDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> drafts = prefs.getStringList(_draftsKey) ?? [];
    
    return drafts.map((d) => jsonDecode(d) as Map<String, dynamic>).toList()
      ..sort((a, b) {
        // Sort by newest first
        DateTime dateA = DateTime.tryParse(a['savedAt'] ?? '') ?? DateTime(2000);
        DateTime dateB = DateTime.tryParse(b['savedAt'] ?? '') ?? DateTime(2000);
        return dateB.compareTo(dateA);
      });
  }

  // Delete a draft
  static Future<void> deleteDraft(String id) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> drafts = prefs.getStringList(_draftsKey) ?? [];
    
    drafts.removeWhere((d) {
      final Map<String, dynamic> data = jsonDecode(d);
      return data['id'] == id;
    });
    
    await prefs.setStringList(_draftsKey, drafts);
  }
}
