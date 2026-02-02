# Language Selection & OCR Enhancements - Implementation Summary

## Overview
This document describes the bilingual support (English/Tagalog) and OCR data structure enhancements added to the RCV Kiosk system.

## 🎯 Features Implemented

### 1. Enhanced OCR Data Structure for Fuzzy Search
**Purpose**: Send structured data to backend instead of plain text for better fuzzy matching accuracy

**Changes in `services/ocr_handler.py`:**
- ✅ Added `get_ocr_data_for_api()` method that returns structured dictionary:
  ```python
  {
      'blockOfText': combined_text,           # Full OCR text from both images
      'frontText': front_text,                # Front label text only
      'backText': back_text,                  # Back label text only
      'extractedFields': {                    # Pre-extracted fields for fuzzy search
          'lto_number': 'LTO-XXX',
          'cfpr_number': 'CFPR-XXX',
          'batch_number': 'BATCH-XXX',
          'expiry_date': 'MM/DD/YYYY',
          'mfg_date': 'MM/DD/YYYY',
          'potential_product_name': 'Product Name'
      },
      'frontImageBase64': base64_string,      # Front image for visual verification
      'backImageBase64': base64_string,       # Back image for visual verification
      'captureTimestamp': ISO_timestamp       # When photos were captured
  }
  ```

- ✅ Added `_extract_product_info()` helper method using regex patterns to identify:
  - LTO numbers (e.g., "LTO: ABC123", "LTO#ABC-123")
  - CFPR numbers (Certificate of Free Product Registration)
  - Batch/Lot numbers
  - Expiry dates (various formats: MM/DD/YYYY, DD-MM-YY, etc.)
  - Manufacturing dates
  - Potential product names (first substantial text line)

**Changes in `main.py`:**
- ✅ Updated `_submit_ocr_scan()` to use `get_ocr_data_for_api()` instead of `get_combined_ocr_text()`
- ✅ Added error handling for OCR data extraction failures
- ✅ Sends structured data to `api_service.scan_product_ocr(ocr_data)`

**Benefits:**
- Backend receives pre-parsed fields for more accurate fuzzy matching
- Images included for visual verification by admins
- Metadata timestamp helps with debugging and audit trails
- Fallback to full text if specific fields not found

---

### 2. Bilingual Language Support (English/Tagalog)

#### 2.1 Language Configuration (`config.py`)
**Added:**
- ✅ `Language` enum with `ENGLISH` and `TAGALOG` values
- ✅ `Messages` class with bilingual message dictionaries:
  ```python
  READY = {"en": "Ready to scan", "tl": "Handa nang mag-scan"}
  SCANNING = {"en": "Scanning QR code...", "tl": "Nag-scan ng QR code..."}
  SUCCESS = {"en": "Certificate is valid!", "tl": "Ang sertipiko ay wasto!"}
  ERROR = {"en": "Error occurred", "tl": "May error na nangyari"}
  FRAUD = {"en": "Warning: Fake certificate!", "tl": "Babala: Pekeng sertipiko!"}
  # ... and more
  ```

All messages now support both languages with 'en' and 'tl' keys.

#### 2.2 Main Application (`main.py`)
**Added:**
- ✅ `self.current_language` state variable (defaults to `Language.ENGLISH`)
- ✅ Language toggle button in upper right corner:
  - Shows "[EN] EN / TL" or "[TL] EN / TL" based on current language
  - Positioned at x=width-120, y=20 (upper right)
  - Click to toggle between languages
  - Accent color background for visibility
- ✅ `_toggle_language()` method to switch languages
- ✅ `_speak()` helper method to speak messages in current language
- ✅ All TTS calls updated from `speak_tagalog()` to `_speak()` to use current language

**Language-aware messages:**
- Ready/Maintenance status
- OCR capture instructions (front/back/complete)
- Scanning feedback
- Success/Error/Fraud alerts

#### 2.3 TTS Service (`services/tts_service.py`)
**Added:**
- ✅ Import `Language` and `Messages` from config
- ✅ `speak_message(message_key, language)` method:
  - Retrieves message from `Messages.{KEY}` dictionary
  - Selects text based on language ('en' or 'tl')
  - Chooses appropriate voice (Filipino vs English neural voice)
  - Speaks using Microsoft Edge TTS
- ✅ `speak_tagalog(message_key)` - Legacy compatibility method that calls `speak_message()` with Tagalog

**Voice Selection:**
- English: Uses `TTSConfig.ENGLISH_VOICE` (Microsoft English neural voice)
- Tagalog: Uses `TTSConfig.FILIPINO_VOICE` (Microsoft Filipino neural voice)

---

## 📁 Files Modified

### Primary Changes:
1. **`kiosk-python/services/ocr_handler.py`**
   - Added `get_ocr_data_for_api()` method (60+ lines)
   - Added `_extract_product_info()` helper method (40+ lines)
   - Uses regex patterns for FDA label field extraction

2. **`kiosk-python/main.py`**
   - Imported `Language` enum from config
   - Added `current_language` state variable
   - Created `_create_language_toggle()` UI button method
   - Created `_toggle_language()` toggle handler
   - Created `_speak()` helper for language-aware TTS
   - Updated `_submit_ocr_scan()` to use structured OCR data
   - Replaced all 11 `speak_tagalog()` calls with `_speak()`

3. **`kiosk-python/config.py`**
   - Added `Language` enum class
   - Added `Messages` class with 15+ bilingual message pairs
   - Each message has 'en' and 'tl' translations

4. **`kiosk-python/services/tts_service.py`**
   - Imported `Language` and `Messages` from config
   - Added `speak_message(message_key, language)` method
   - Updated `speak_tagalog()` for backward compatibility
   - Language-aware voice selection

---

## 🚀 Usage

### For Users:
1. **Language Toggle:**
   - Click the "EN / TL" button in upper right corner
   - Current language shows in brackets: "[EN]" or "[TL]"
   - All voice feedback switches immediately
   - UI text updates (when UI screens are updated)

2. **OCR Scanning:**
   - Press 'O' to start OCR mode
   - Capture front photo (Space)
   - Capture back photo (Space)
   - System extracts text AND specific fields automatically
   - Sends structured data to API for better matching

### For Developers:
1. **Adding New Messages:**
   ```python
   # In config.py Messages class:
   NEW_MESSAGE = {
       "en": "English text here",
       "tl": "Tagalog text dito"
   }
   ```

2. **Speaking Messages:**
   ```python
   # In main.py:
   self._speak("message_key")  # Uses current language
   
   # Or specify language:
   self.tts_service.speak_message("message_key", Language.ENGLISH)
   ```

3. **Using OCR Structured Data:**
   ```python
   ocr_data = self.ocr_handler.get_ocr_data_for_api()
   # Returns dict with blockOfText, extractedFields, images, etc.
   result = self.api_service.scan_product_ocr(ocr_data)
   ```

---

## 🔄 Backend API Requirements

The backend API endpoint for OCR scanning should now expect:

```typescript
interface OCRScanRequest {
  blockOfText: string;            // Full combined OCR text
  frontText: string;              // Front label text
  backText: string;               // Back label text
  extractedFields: {              // Pre-extracted fields (may be empty)
    lto_number?: string;
    cfpr_number?: string;
    batch_number?: string;
    expiry_date?: string;
    mfg_date?: string;
    potential_product_name?: string;
  };
  frontImageBase64: string;       // Base64 encoded front image
  backImageBase64: string;        // Base64 encoded back image
  captureTimestamp: string;       // ISO timestamp
}
```

**Benefits for Backend:**
- Can prioritize fuzzy search using extracted fields
- Fallback to full text search if specific fields not found
- Images available for admin verification
- Timestamp helps with audit logs

---

## ⚠️ Known Limitations & Future Work

### Current State:
✅ Language state management - COMPLETE
✅ Language toggle button - COMPLETE
✅ TTS language switching - COMPLETE
✅ OCR structured data - COMPLETE
✅ All TTS calls updated - COMPLETE

### Pending Work:
❌ **UI Screens Bilingual Text** - Not yet implemented
   - IdleScreen, ScanningScreen, OCRCaptureScreen, ProcessingScreen
   - CertificateScreen, ProductScreen, ComplianceScreen, ErrorScreen
   - MaintenanceScreen
   
   **Why not done yet:**
   - Requires updating 9+ screen classes in `ui/` directory
   - Each screen has multiple text elements
   - Current implementation uses hardcoded English text
   - Should be done as separate task when testing UI

   **How to implement (when ready):**
   ```python
   # Example for IdleScreen:
   def render(self, canvas, language=Language.ENGLISH, ...):
       lang = 'en' if language == Language.ENGLISH else 'tl'
       
       canvas.create_text(
           x, y,
           text=Messages.READY[lang],  # Instead of hardcoded text
           ...
       )
   ```

   **Files to update:**
   - `ui/screens.py` (IdleScreen, ScanningScreen, ProcessingScreen, ErrorScreen, MaintenanceScreen)
   - `ui/certificate_screen.py`
   - `ui/product_screen.py`
   - `ui/compliance_screen.py`
   - `ui/ocr_capture_screen.py`
   
   **Changes needed in main.py:**
   - Pass `language=self.current_language` to all `screen.render()` calls
   - Update screen refresh when language toggles

---

## 🧪 Testing Checklist

### OCR Enhancements:
- [ ] Capture product with visible LTO/CFPR numbers
- [ ] Verify `extractedFields` contains correct data
- [ ] Test with product without clear fields (should still work)
- [ ] Confirm base64 images are valid
- [ ] Check backend receives and processes structured data

### Language Switching:
- [x] Toggle button appears in upper right
- [x] Clicking button switches language indicator
- [x] TTS voice changes (Filipino vs English)
- [x] All message keys work in both languages
- [ ] UI text updates (when UI screens updated)

### Integration:
- [ ] Language persists during OCR workflow
- [ ] Voice feedback matches current language
- [ ] API calls work with new OCR data format
- [ ] No errors in console when switching languages

---

## 📊 Statistics

**Lines of Code Added:**
- `ocr_handler.py`: ~100 lines (2 new methods)
- `config.py`: ~80 lines (Language enum + Messages class)
- `tts_service.py`: ~35 lines (2 new methods)
- `main.py`: ~25 lines (language toggle + helper)

**Total**: ~240 lines of new code

**Code Improved:**
- Updated 11 TTS call sites in main.py
- Improved 1 OCR submission workflow
- Enhanced API data structure for backend

---

## 🎓 Architecture Notes

### Design Patterns Used:
1. **Enum Pattern**: `Language.ENGLISH` / `Language.TAGALOG` for type safety
2. **Strategy Pattern**: TTS voice selection based on language
3. **Template Method**: `_speak()` abstracts language-aware speaking
4. **Data Transfer Object**: Structured OCR data dict for API communication

### Separation of Concerns:
- **Config**: Language definitions and message strings
- **Services**: Language-agnostic TTS/OCR logic
- **Main App**: Language state management and UI coordination
- **UI Screens**: Presentation layer (pending bilingual update)

---

## 🔗 Related Documentation
- [QUICK_START.md](QUICK_START.md) - How to run the kiosk
- [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md) - Previous refactoring details
- [README.md](README.md) - Full system documentation
- [KIOSK_IMPROVEMENTS.md](KIOSK_IMPROVEMENTS.md) - Past improvements log

---

**Last Updated**: 2024
**Status**: Core functionality complete, UI screen updates pending
**Next Steps**: Update UI screens with bilingual text when ready for visual testing
