import 'package:flutter/material.dart';

/// A small reusable widget that renders a padded ElevatedButton used for
/// controlling a single LED. Presentation is separated from the toggle
/// logic so the button UI can live in its own file.
class LedToggleButton extends StatelessWidget {
  final int index;
  final bool isOn;
  // labelColor is kept for API compatibility but will be ignored so all
  // button labels use black as requested.
  final Color labelColor;
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 60),
          backgroundColor: isOn ? Colors.green : Colors.grey.shade300,
          foregroundColor: isOn ? Colors.white : Colors.black,
        ),
        onPressed: onPressed,
        child: Text(
          'Button ${index + 1}: ${isOn ? 'ON' : 'OFF'}',
          style: const TextStyle(fontSize: 20, color: Colors.black),
        ),
      ),
    );
  }
}
