import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

/// A simple reusable processing/loading modal.
///
/// Use `showProcessingModal(context, message: '...')` to display and
/// `hideProcessingModal(context)` to dismiss.
class ProcessingModal extends StatelessWidget {
  final String message;
  final bool dismissible;

  const ProcessingModal({
    super.key,
    this.message = 'Processing...',
    this.dismissible = false,
  });

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: dismissible,
      child: Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  height: 56,
                  width: 56,
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(
                      app_colors.AppColors.primary,
                    ),
                    strokeWidth: 4,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  message,
                  style: AppFonts.contentStyle.copyWith(
                    fontSize: 14,
                    color: Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shows the processing modal. Returns a Future that completes when the dialog is closed.
Future<void> showProcessingModal(
  BuildContext context, {
  String message = 'Processing...',
  bool dismissible = false,
}) {
  return showDialog(
    context: context,
    barrierDismissible: dismissible,
    barrierColor: Colors.black54,
    builder: (_) => ProcessingModal(message: message, dismissible: dismissible),
  );
}

/// Hides the processing modal if it's open.
void hideProcessingModal(BuildContext context) {
  try {
    Navigator.of(context, rootNavigator: true).pop();
  } catch (_) {
    // ignore
  }
}
