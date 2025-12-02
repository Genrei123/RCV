import 'package:flutter/material.dart';

class AppDisabledScreen extends StatefulWidget {
  const AppDisabledScreen({super.key});

  @override
  State<AppDisabledScreen> createState() => _AppDisabledScreenState();
}

class _AppDisabledScreenState extends State<AppDisabledScreen> {

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF005440),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Maintenance Icon
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.build_circle,
                    size: 60,
                    color: Color(0xFF005440),
                  ),
                ),
                
                const SizedBox(height: 30),
                
                // Title
                const Text(
                  'App Under Maintenance',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 15),
                
                // Message
                Text(
                  'RCV Inspector is currently being updated.\nPlease check back in a few minutes.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}