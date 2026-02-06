import 'package:flutter/material.dart';

class LEDStatusCard extends StatelessWidget {
  final String title;
  final String ledName;
  final bool isOn;
  final Color color;
  final VoidCallback onToggle;

  const LEDStatusCard({
    super.key,
    required this.title,
    required this.ledName,
    required this.isOn,
    required this.color,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // LED Indicator
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isOn ? color : Colors.grey.shade300,
                boxShadow: isOn
                    ? [
                        BoxShadow(
                          color: color.withOpacity(0.5),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ]
                    : null,
              ),
              child: Icon(
                Icons.circle,
                color: isOn ? Colors.white : Colors.grey.shade500,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            
            // LED Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ledName,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isOn ? 'ON' : 'OFF',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isOn ? color : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
            
            // Toggle Switch
            Switch(
              value: isOn,
              onChanged: (_) => onToggle(),
              activeColor: color,
            ),
          ],
        ),
      ),
    );
  }
}
