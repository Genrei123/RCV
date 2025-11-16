import 'package:flutter/material.dart';

/// Styled LED control button matching the provided design.
class LedToggleButton extends StatelessWidget {
  final int index;
  final bool isOn;
  final Color labelColor; // kept for API compatibility, not used
  final VoidCallback onPressed;

  const LedToggleButton({
    Key? key,
    required this.index,
    required this.isOn,
    required this.labelColor,
    required this.onPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    const Color brand = Color(0xFF005C45);
    // Match design: when LED is OFF -> show filled "TURN ON" button
    // when LED is ON  -> show outlined "TURN OFF" button
    final bool filled = !isOn;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: onPressed,
          style: ButtonStyle(
            backgroundColor: WidgetStateProperty.resolveWith<Color>((states) {
              return filled ? brand : Colors.white;
            }),
            foregroundColor: WidgetStatePropertyAll<Color>(
              filled ? Colors.white : brand,
            ),
            overlayColor: WidgetStatePropertyAll<Color>(
              (filled ? Colors.white : brand).withOpacity(0.08),
            ),
            side: WidgetStatePropertyAll<BorderSide>(
              BorderSide(color: brand, width: filled ? 0 : 2),
            ),
            shape: const WidgetStatePropertyAll<RoundedRectangleBorder>(
              RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(14)),
              ),
            ),
            elevation: const WidgetStatePropertyAll<double>(0),
            padding: const WidgetStatePropertyAll<EdgeInsets>(
              EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: filled ? Colors.white : brand,
                    width: 2,
                  ),
                ),
                child: Icon(
                  Icons.power_settings_new,
                  size: 18,
                  color: filled ? Colors.white : brand,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                isOn ? 'TURN OFF LED ${index + 1}' : 'TURN ON LED ${index + 1}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: filled ? Colors.white : brand,
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
