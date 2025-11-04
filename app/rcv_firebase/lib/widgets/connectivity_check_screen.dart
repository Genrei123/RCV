import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';
import 'package:flutter/services.dart';

class ConnectivityCheckScreen extends StatefulWidget {
  final Widget child;

  const ConnectivityCheckScreen({super.key, required this.child});

  @override
  State<ConnectivityCheckScreen> createState() =>
      _ConnectivityCheckScreenState();
}

class _ConnectivityCheckScreenState extends State<ConnectivityCheckScreen>
    with WidgetsBindingObserver {
  bool _dialogOpen = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    // Observe app lifecycle to re-check on resume
    WidgetsBinding.instance.addObserver(this);
    // Run after first frame so dialogs can attach to a built context
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndWarnConnectivity();
    });
    // Periodically check connectivity; if offline and no dialog open, show it
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _checkAndWarnConnectivity();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkAndWarnConnectivity();
    }
  }

  Future<bool> _isConnected() async {
    try {
      final result = await InternetAddress.lookup(
        'google.com',
      ).timeout(const Duration(seconds: 5));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<void> _checkAndWarnConnectivity() async {
    if (_dialogOpen) return;
    final connected = await _isConnected();
    if (!connected && mounted) {
      _dialogOpen = true;
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Connection error'),
          content: const Text(
            'Unable to connect with the server. Check your internet connection and try again.',
          ),
          actions: [
            TextButton(
              onPressed: () async {
                final ok = await _isConnected();
                if (ok && mounted) {
                  Navigator.of(ctx).pop();
                } else {
                  // Keep dialog open but provide subtle feedback
                  HapticFeedback.mediumImpact();
                }
              },
              child: const Text('Retry'),
            ),
            TextButton(
              onPressed: () {
                SystemNavigator.pop();
              },
              child: const Text('Close App'),
            ),
          ],
        ),
      );
      // Allow showing again later; if still offline, periodic check will reopen
      _dialogOpen = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Always show app content; we warn with a dialog if offline
    return widget.child;
  }
}
