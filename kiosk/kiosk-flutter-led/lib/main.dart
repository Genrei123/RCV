import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'widgets/led_toggle_button.dart';
import 'screens/scanner_screen.dart';

void main() {
  runApp(const ThreeButtonToggleApp());
}

class ThreeButtonToggleApp extends StatelessWidget {
  const ThreeButtonToggleApp({super.key});    

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Three Button Toggle',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const ToggleHomePage(),
    );
  }
}

class ToggleHomePage extends StatefulWidget {
  const ToggleHomePage({super.key});

  @override
  State<ToggleHomePage> createState() => _ToggleHomePageState();
}

class _ToggleHomePageState extends State<ToggleHomePage> {
  final List<bool> _buttonStates = [false, false, false];
  final TextEditingController _ipController = TextEditingController(text: '192.168.4.1');
  bool _isSending = false;
  String? _lastScanned;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Three Button Toggle'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan QR / Barcode',
            onPressed: () async {
              final result = await Navigator.of(context).push<String?>(
                MaterialPageRoute(builder: (_) => const ScannerScreen()),
              );
              if (result != null && mounted) {
                setState(() {
                  _lastScanned = result;
                });

                // If the QR contains an IP address, auto-fill the IP field.
                if (_looksLikeIp(result)) {
                  setState(() {
                    _ipController.text = result;
                  });
                }

                // Trigger blink on ESP32 LED 1 three times.
                // Run in background but await it so we can show errors via SnackBar.
                await _blinkLedSequence(1, 3);
              }
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // IP input and send indicator
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ipController,
                    decoration: const InputDecoration(
                      labelText: 'ESP32 IP',
                      hintText: 'e.g. 192.168.4.1',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 12),
                _isSending
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const SizedBox(width: 24, height: 24),
              ],
            ),
            const SizedBox(height: 12),
            if (_lastScanned != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Last scanned:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(
                    // show the last scanned string
                    _lastScanned!,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            const SizedBox(height: 12),
            ...List.generate(_buttonStates.length, (index) {
            final isOn = _buttonStates[index];
            final labelColor = _labelColorForIndex(index);
            return LedToggleButton(
              index: index,
              isOn: isOn,
              labelColor: labelColor,
              onPressed: () => _toggleButton(index),
            );
          }),
          ],
        ),
      ),
    );
  }

  void _toggleButton(int index) {
    final ip = _ipController.text.trim();
    if (ip.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter ESP32 IP address')),
      );
      return;
    }

    final newState = !_buttonStates[index];

    // Optimistic UI update
    setState(() {
      _buttonStates[index] = newState;
      _isSending = true;
    });

    _sendLedRequest(ip, index + 1, newState).then((success) {
      if (!success) {
        // Revert UI on failure
        if (!mounted) return;
        setState(() {
          _buttonStates[index] = !newState;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send request to ESP32')),
        );
        return;
      }
    }).whenComplete(() {
      if (!mounted) return;
      setState(() {
        _isSending = false;
      });
    });
  }

  Future<bool> _sendLedRequest(String ip, int ledNumber, bool turnOn) async {
    try {
      final uri = Uri.parse('http://$ip/led$ledNumber?state=${turnOn ? 'on' : 'off'}');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  bool _looksLikeIp(String input) {
    // Allow optional port and surrounding whitespace
    final ipPortRegex = RegExp(r'^\s*\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\s*$');
    return ipPortRegex.hasMatch(input);
  }

  Future<void> _blinkLedSequence(int ledNumber, int times) async {
    final ip = _ipController.text.trim();
    if (ip.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No ESP32 IP set to blink.')),
      );
      return;
    }

    // Blink all LEDs (1..3) together. Use shorter on/off durations for a
    // faster blink as requested.
    const onMs = 150;
    const offMs = 150;
    final leds = [1, 2, 3];

    for (var i = 0; i < times; i++) {
      // Turn all on in parallel
      final onFutures = leds.map((led) => _sendLedRequest(ip, led, true));
      final onResults = await Future.wait(onFutures);

      await Future.delayed(const Duration(milliseconds: onMs));

      // Turn all off in parallel
      final offFutures = leds.map((led) => _sendLedRequest(ip, led, false));
      final offResults = await Future.wait(offFutures);

      // If any failed, show which cycle failed and abort
      if (onResults.any((r) => r == false) || offResults.any((r) => r == false)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Blink failed at iteration ${i + 1}')),
        );
        return;
      }

      await Future.delayed(const Duration(milliseconds: offMs));
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('ESP32 blinked all LEDs 3 times')),
    );
  }

  Color _labelColorForIndex(int index) {
    // Always return black so toggle labels are uniformly black.
    return Colors.black;
  }

  @override
  void dispose() {
    _ipController.dispose();
    super.dispose();
  }
}
