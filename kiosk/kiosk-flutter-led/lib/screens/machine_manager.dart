import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../widgets/led_toggle_button.dart';
import '../widgets/title_logo_header_app_bar.dart';
import 'scanner_screen.dart';

class MachineManager extends StatefulWidget {
  const MachineManager({super.key});

  @override
  State<MachineManager> createState() => _MachineManagerState();
}

class _MachineManagerState extends State<MachineManager> {
  final List<bool> _buttonStates = [false, false, false];
  late final TextEditingController _ipController;
  bool _isSending = false;
  bool _didSetArgs = false;

  @override
  void initState() {
    super.initState();
    _ipController = TextEditingController(text: '192.168.4.1');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didSetArgs) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map && args['ip'] is String) {
        _ipController.text = args['ip'] as String;
      }
      _didSetArgs = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TitleLogoHeaderAppBar(
        title: 'Machine Manager',
        height: 140,
        showBackButton: false,
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 4,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: const Text(
          'IOT MANAGER ONLY',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: const Icon(Icons.qr_code_scanner),
                tooltip: 'Scan QR / Barcode',
                onPressed: () async {
                  final result = await Navigator.of(context).push<String?>(
                    MaterialPageRoute(builder: (_) => const ScannerScreen()),
                  );
                  if (result != null && mounted) {
                    if (_looksLikeIp(result)) {
                      setState(() {
                        _ipController.text = result;
                      });
                    }
                    await _blinkLedSequence(1, 3);
                  }
                },
              ),
            ),
            _Esp32Form(ipController: _ipController, isSending: _isSending),
            const SizedBox(height: 24),
            const SizedBox(height: 8),
            Text('Controls', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Column(
              children: List.generate(_buttonStates.length, (index) {
                return LedToggleButton(
                  index: index,
                  isOn: _buttonStates[index],
                  labelColor: _labelColorForIndex(index),
                  onPressed: () => _toggleButton(index),
                );
              }),
            ),
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

    setState(() {
      _buttonStates[index] = newState;
      _isSending = true;
    });

    _sendLedRequest(ip, index + 1, newState)
        .then((success) {
          if (!success) {
            if (!mounted) return;
            setState(() {
              _buttonStates[index] = !newState;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to send request to ESP32')),
            );
          }
        })
        .whenComplete(() {
          if (!mounted) return;
          setState(() {
            _isSending = false;
          });
        });
  }

  Future<bool> _sendLedRequest(String ip, int ledNumber, bool turnOn) async {
    try {
      final uri = Uri.parse(
        'http://$ip/led$ledNumber?state=${turnOn ? 'on' : 'off'}',
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  bool _looksLikeIp(String input) {
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

    const onMs = 150;
    const offMs = 150;
    final leds = [1, 2, 3];

    for (var i = 0; i < times; i++) {
      final onFutures = leds.map((led) => _sendLedRequest(ip, led, true));
      final onResults = await Future.wait(onFutures);
      await Future.delayed(const Duration(milliseconds: onMs));
      final offFutures = leds.map((led) => _sendLedRequest(ip, led, false));
      final offResults = await Future.wait(offFutures);

      if (onResults.any((r) => r == false) ||
          offResults.any((r) => r == false)) {
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

  Color _labelColorForIndex(int index) => Colors.black;

  @override
  void dispose() {
    _ipController.dispose();
    super.dispose();
  }
}

class _Esp32Form extends StatelessWidget {
  final TextEditingController ipController;
  final bool isSending;
  const _Esp32Form({required this.ipController, required this.isSending});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ESP32 Connection',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: ipController,
                decoration: const InputDecoration(
                  labelText: 'ESP32 IP',
                  hintText: 'e.g. 192.168.4.1',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 12),
            isSending
                ? const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const SizedBox(width: 28, height: 28),
          ],
        ),
      ],
    );
  }
}
