import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';

class ConnectivityCheckScreen extends StatefulWidget {
  final Widget child;
  
  const ConnectivityCheckScreen({super.key, required this.child});

  @override
  State<ConnectivityCheckScreen> createState() => _ConnectivityCheckScreenState();
}

class _ConnectivityCheckScreenState extends State<ConnectivityCheckScreen> {
  bool _isChecking = true;
  bool _isConnected = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
  }

  Future<void> _checkConnectivity() async {
    setState(() {
      _isChecking = true;
      _errorMessage = '';
    });

    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 10));
      
      if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
        setState(() {
          _isConnected = true;
          _isChecking = false;
        });
        
        // Wait a moment to show success, then proceed
        await Future.delayed(const Duration(seconds: 1));
        
        // If still mounted and connected, show the child widget
        if (mounted && _isConnected) {
          // The widget will automatically show child when _isConnected is true
        }
      } else {
        throw Exception('No internet connection');
      }
    } catch (e) {
      setState(() {
        _isConnected = false;
        _isChecking = false;
        _errorMessage = 'Unable to connect to the internet. Please check your connection and try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // If connected, show the actual app
    if (_isConnected && !_isChecking) {
      return widget.child;
    }

    // Otherwise, show connectivity check screen
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF005440),
              Color(0xFF003D2E),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Logo or Title
                  const Icon(
                    Icons.verified_user_rounded,
                    size: 100,
                    color: Colors.white,
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'RCV',
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Product Verification System',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 60),
                  
                  // Status Section
                  if (_isChecking)
                    Column(
                      children: [
                        const CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          strokeWidth: 3,
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Checking connection...',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    )
                  else if (!_isConnected)
                    Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.red[100],
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.wifi_off,
                            size: 50,
                            color: Colors.red[700],
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'No Internet Connection',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          onPressed: _checkConnectivity,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try Again'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF005440),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.green[100],
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.check_circle,
                            size: 50,
                            color: Colors.green[700],
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Connected!',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
