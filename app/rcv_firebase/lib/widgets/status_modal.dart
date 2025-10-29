import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import 'package:rcv_firebase/themes/app_fonts.dart';

enum StatusModalType { success, warning, error, info }

class StatusModal extends StatelessWidget {
  final StatusModalType type;
  final String title;
  final String message;
  final String buttonText;
  final VoidCallback? onButtonPressed;

  const StatusModal({
    super.key,
    required this.type,
    required this.title,
    required this.message,
    this.buttonText = 'Proceed',
    this.onButtonPressed,
  });

  Color _backgroundColor() {
    switch (type) {
      case StatusModalType.success:
        return app_colors.AppColors.primary;
      case StatusModalType.warning:
        return Colors.orange.shade700;
      case StatusModalType.error:
        return app_colors.AppColors.error;
      case StatusModalType.info:
        return app_colors.AppColors.accent;
    }
  }

  IconData _icon() {
    switch (type) {
      case StatusModalType.success:
        return Icons.check_circle_outline;
      case StatusModalType.warning:
        return Icons.warning_amber_outlined;
      case StatusModalType.error:
        return Icons.error_outline;
      case StatusModalType.info:
        return Icons.info_outline;
    }
  }

  Color _iconCircleColor() {
    return Colors.white;
  }

  @override
  Widget build(BuildContext context) {
    final bg = _backgroundColor();
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                Text(
                  title,
                  style: AppFonts.titleStyle.copyWith(
                    color: app_colors.AppColors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  style: AppFonts.contentStyle.copyWith(
                    color: app_colors.AppColors.white,
                    fontSize: 16,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed:
                      onButtonPressed ?? () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: app_colors.AppColors.white,
                    foregroundColor: bg,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    buttonText,
                    style: AppFonts.labelStyle.copyWith(
                      color: bg,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: -36,
            child: CircleAvatar(
              radius: 36,
              backgroundColor: _iconCircleColor(),
              child: Icon(_icon(), size: 70, color: bg),
            ),
          ),
        ],
      ),
    );
  }
}

/// Helper to show the status modal
Future<void> showStatusModal(
  BuildContext context, {
  required StatusModalType type,
  required String title,
  required String message,
  String buttonText = 'Proceed',
  VoidCallback? onButtonPressed,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black54,
    builder: (_) => StatusModal(
      type: type,
      title: title,
      message: message,
      buttonText: buttonText,
      onButtonPressed: onButtonPressed,
    ),
  );
}
