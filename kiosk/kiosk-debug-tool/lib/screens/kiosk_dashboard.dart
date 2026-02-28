import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/kiosk_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/led_status_card.dart';
import '../widgets/control_button_card.dart';
import '../widgets/kiosk_info_card.dart';
import 'log_viewer_screen.dart';

class KioskDashboard extends StatefulWidget {
  const KioskDashboard({super.key});

  @override
  State<KioskDashboard> createState() => _KioskDashboardState();
}

class _KioskDashboardState extends State<KioskDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Start monitoring kiosk status
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KioskService>().startMonitoring();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    context.read<KioskService>().stopMonitoring();
    super.dispose();
  }

  void _handleLogout() {
    context.read<AuthService>().logout();
  }

  void _showSnackBar(String message, {bool isError = false, bool isWarning = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.errorRed : (isWarning ? Colors.orange : AppTheme.successGreen),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _handleCommand(String commandName, Future<bool> Function() command) async {
    final success = await command();
    if (success) {
      _showSnackBar('$commandName sent! Kiosk will execute shortly.');
    } else {
      _showSnackBar('Please wait before sending another command', isWarning: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kiosk Debug Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<KioskService>().fetchAllKiosks();
            },
            tooltip: 'Refresh Status',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: [
            const Tab(
              icon: Icon(Icons.dashboard, size: 20),
              text: 'Controls',
            ),
            Tab(
              child: Consumer<KioskService>(
                builder: (context, kiosk, _) {
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.receipt_long, size: 20),
                      const SizedBox(width: 6),
                      const Text('Logs'),
                      if (kiosk.errorLogCount > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.errorRed,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${kiosk.errorLogCount}',
                            style: const TextStyle(
                              fontSize: 10,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
      body: Consumer<KioskService>(
        builder: (context, kioskService, _) {
          if (kioskService.isLoading && kioskService.allKiosks.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          return Column(
            children: [
              // Kiosk selector is always visible at top
              Padding(
                padding: const EdgeInsets.all(12),
                child: _buildKioskSelector(kioskService),
              ),
              
              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Tab 1: Controls (original dashboard content)
                    _buildControlsTab(kioskService),
                    // Tab 2: Logs
                    const LogViewerScreen(),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildControlsTab(KioskService kioskService) {
    if (kioskService.selectedKioskId == null) {
      return _buildNoKioskSelected();
    }

    return RefreshIndicator(
      onRefresh: () => kioskService.fetchAllKiosks(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Kiosk Info Card
            KioskInfoCard(
              isOnline: kioskService.isOnline,
              lastSeen: kioskService.lastSeen,
              currentMode: kioskService.currentMode,
              kioskName: kioskService.kioskName,
              kioskCity: kioskService.kioskCity,
            ),
            const SizedBox(height: 16),
            
            // Show restart button prominently when offline
            if (!kioskService.isOnline)
              _buildOfflineRestartCard(kioskService),
            
            if (kioskService.isOnline) ...[
              // Command Queue Notice
              _buildCommandQueueNotice(),
            ],
            const SizedBox(height: 24),
            
            // LED Status Section
            const Text(
              'LED Status Indicators',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            LEDStatusCard(
              title: 'Processing LED',
              ledName: 'Yellow/Processing',
              isOn: kioskService.ledProcessing,
              color: AppTheme.warningOrange,
              onToggle: () => _handleCommand('Toggle Processing LED', 
                () => kioskService.toggleLED('processing')),
            ),
            const SizedBox(height: 12),
            LEDStatusCard(
              title: 'Success LED',
              ledName: 'Green/Success',
              isOn: kioskService.ledSuccess,
              color: AppTheme.successGreen,
              onToggle: () => _handleCommand('Toggle Success LED',
                () => kioskService.toggleLED('success')),
            ),
            const SizedBox(height: 12),
            LEDStatusCard(
              title: 'Error LED',
              ledName: 'Red/Error',
              isOn: kioskService.ledError,
              color: AppTheme.errorRed,
              onToggle: () => _handleCommand('Toggle Error LED',
                () => kioskService.toggleLED('error')),
            ),
            const SizedBox(height: 24),
            
            // Control Actions Section
            const Text(
              'Kiosk Controls',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ControlButtonCard(
              icon: Icons.restart_alt,
              title: 'Restart Kiosk',
              subtitle: 'Reboot the entire kiosk application',
              color: AppTheme.primaryGreen,
              onPressed: () => _showConfirmDialog(
                    context,
                    'Restart Kiosk?',
                    'This will restart the kiosk application. The command will be queued and executed on next heartbeat.',
                    () => _handleCommand('Restart', kioskService.restartKiosk),
                  ),
            ),
            const SizedBox(height: 12),
            ControlButtonCard(
              icon: Icons.slideshow,
              title: 'Force Slideshow Mode',
              subtitle: 'Switch to slideshow display',
              color: AppTheme.accentTeal,
              onPressed: () => _handleCommand('Set Slideshow Mode',
                () => kioskService.setMode('slideshow')),
            ),
            const SizedBox(height: 12),
            ControlButtonCard(
              icon: Icons.qr_code_scanner,
              title: 'Force Scanner Mode',
              subtitle: 'Switch to QR scanner mode',
              color: AppTheme.primaryLight,
              onPressed: () => _handleCommand('Set Scanner Mode',
                () => kioskService.setMode('scanner')),
            ),
            const SizedBox(height: 12),
            ControlButtonCard(
              icon: Icons.camera_alt,
              title: 'Force OCR Mode',
              subtitle: 'Switch to OCR capture mode',
              color: Colors.blue,
              onPressed: () => _handleCommand('Set OCR Mode',
                () => kioskService.setMode('ocr')),
            ),
            const SizedBox(height: 24),
            
            // Danger Zone
            const Text(
              'Maintenance',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ControlButtonCard(
              icon: Icons.power_settings_new,
              title: 'Close Application',
              subtitle: 'Stop the kiosk for maintenance (will NOT auto-restart)',
              color: AppTheme.errorRed,
              onPressed: () => _showConfirmDialog(
                context,
                'Close Kiosk Application?',
                'This will close the kiosk application completely. It will NOT auto-restart.\n\nTo start it again you will need to manually run the kiosk or reboot the device.',
                () => _handleCommand('Close Application', kioskService.closeApp),
              ),
            ),
            const SizedBox(height: 24),
            
            // Test All LEDs Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _handleCommand('Test All LEDs', kioskService.testAllLEDs),
                icon: const Icon(Icons.lightbulb_outline),
                label: const Text('Test All LEDs'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.warningOrange,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKioskSelector(KioskService kioskService) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Kiosk',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            if (kioskService.allKiosks.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.grey.shade600),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'No kiosks found. Make sure a kiosk is running and sending heartbeats to the API.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  ],
                ),
              )
            else
              DropdownButtonFormField<String>(
                initialValue: kioskService.selectedKioskId,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                isExpanded: true,
                hint: const Text('Choose a kiosk to manage'),
                items: kioskService.allKiosks.where((kiosk) => kiosk['kioskId'] != null).map((kiosk) {
                  final kioskId = kiosk['kioskId']?.toString() ?? '';
                  final name = kiosk['name']?.toString() ?? kioskId;
                  final status = kiosk['status']?.toString() ?? 'unknown';
                  final city = (kiosk['location'] as Map<String, dynamic>?)?['city']?.toString() ?? '';
                  
                  final displayText = city.isNotEmpty ? '$name ($city)' : name;
                  
                  return DropdownMenuItem<String>(
                    value: kioskId,
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: status == 'online' ? AppTheme.successGreen : AppTheme.errorRed,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            displayText,
                            style: const TextStyle(fontWeight: FontWeight.w500),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (kioskId) {
                  if (kioskId != null) {
                    kioskService.selectKiosk(kioskId);
                  }
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoKioskSelected() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(Icons.devices, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text(
              'No Kiosk Selected',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Select a kiosk from the dropdown above to view its status and send commands.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineRestartCard(KioskService kioskService) {
    return Card(
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Kiosk is Offline',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange.shade900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'The kiosk is not responding. You can queue a restart command which will execute when the kiosk comes back online.',
                        style: TextStyle(fontSize: 13, color: Colors.orange.shade800),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _handleCommand('Restart', kioskService.restartKiosk),
                icon: const Icon(Icons.restart_alt),
                label: const Text('Queue Restart Command'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Note: If the kiosk was fully shutdown, you may need to manually start it or use SSH to run the kiosk script.',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommandQueueNotice() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Commands are sent to the kiosk and executed when it polls the server (every 10 seconds). A 3-second cooldown prevents spam.',
              style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showConfirmDialog(
    BuildContext context,
    String title,
    String message,
    VoidCallback onConfirm,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorRed,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      onConfirm();
    }
  }
}
