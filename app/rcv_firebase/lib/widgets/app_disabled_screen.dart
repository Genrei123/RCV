import 'package:flutter/material.dart';
import '../services/remote_config_service.dart';

class AppDisabledScreen extends StatefulWidget {
  const AppDisabledScreen({super.key});

  @override
  State<AppDisabledScreen> createState() => _AppDisabledScreenState();
}

class _AppDisabledScreenState extends State<AppDisabledScreen> {
  bool _isChecking = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF005440),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
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
                  color: Colors.white.withOpacity(0.9),
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 40),
              
              // Check Again Button
              SizedBox(
                width: 200,
                height: 45,
                child: ElevatedButton(
                  onPressed: _isChecking ? null : _checkStatus,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF005440),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(25),
                    ),
                  ),
                  child: _isChecking
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Color(0xFF005440),
                            ),
                          ),
                        )
                      : const Text(
                          'Check Again',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Future<void> _checkStatus() async {
    setState(() {
      _isChecking = true;
    });
    
    try {
      // Refresh Remote Config to get latest values
      await RemoteConfigService.refresh();
      
      // The listener in LandingPage will automatically trigger a rebuild
      // when the status changes, so we don't need to do anything else here
      
    } catch (e) {
      // Show error message if refresh fails
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to check status. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isChecking = false;
        });
      }
    }
  }
}