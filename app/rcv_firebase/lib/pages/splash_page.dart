import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:io';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  final _auth = AuthService();
  Timer? _timer;
  Timer? _poll;
  bool _navigated = false;
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    _startFlow();
  }

  Future<void> _startFlow() async {
    // Quick brand delay
    _timer = Timer(const Duration(milliseconds: 800), () {});

    final online = await _hasInternet();
    if (!mounted) return;
    if (online) {
      await _goNext();
    } else {
      setState(() => _offline = true);
      // Poll periodically until online, then proceed
      _poll = Timer.periodic(const Duration(seconds: 3), (_) async {
        final ok = await _hasInternet();
        if (ok) {
          _poll?.cancel();
          if (mounted) {
            setState(() => _offline = false);
          }
          await _goNext();
        }
      });
    }
  }

  Future<void> _goNext() async {
    if (!mounted) return;
    final loggedIn = await _auth.isLoggedIn();
    if (!mounted) return;
    if (_navigated) return;
    _navigated = true;
    if (loggedIn) {
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/user-home',
        (route) => false,
      );
    } else {
      // If not logged in, go straight to login for a quicker flow
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }

  Future<bool> _hasInternet() async {
    try {
      final result = await InternetAddress.lookup(
        'google.com',
      ).timeout(const Duration(seconds: 5));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _poll?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF00A47D), Color(0xFF005440)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: _offline ? _buildOfflineBlock() : _buildSplashBranding(),
          ),
        ),
      ),
    );
  }

  Widget _buildSplashBranding() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: const [
        // Logo
        _LogoBlock(),
        SizedBox(height: 32),
        SizedBox(
          width: 36,
          height: 36,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildOfflineBlock() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const _LogoBlock(),
          const SizedBox(height: 24),
          const Text(
            'Connection error',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Unable to connect with the server. Check your internet connection and try again.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton(
                onPressed: () async {
                  final ok = await _hasInternet();
                  if (ok) {
                    await _goNext();
                  } else {
                    HapticFeedback.mediumImpact();
                  }
                },
                child: const Text(
                  'TRY AGAIN',
                  style: TextStyle(color: Colors.white),
                ),
              ),
              const SizedBox(width: 16),
              TextButton(
                onPressed: () => SystemNavigator.pop(),
                child: const Text(
                  'CLOSE APP',
                  style: TextStyle(color: Colors.white70),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LogoBlock extends StatelessWidget {
  const _LogoBlock();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SvgPicture.asset('assets/landinglogo.svg', width: 220, height: 220),
        const SizedBox(height: 24),
        const Text(
          'RCV',
          style: TextStyle(
            color: Colors.white,
            fontSize: 36,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
      ],
    );
  }
}
