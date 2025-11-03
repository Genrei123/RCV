import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../services/audit_log_service.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';

// Audit Log model
class AuditLog {
  final String id;
  final String action;
  final String actionType;
  final DateTime createdAt;
  final String? ipAddress;
  final String? userAgent;
  final String platform;
  final Map<String, dynamic>? location;
  final Map<String, dynamic>? metadata;

  AuditLog({
    required this.id,
    required this.action,
    required this.actionType,
    required this.createdAt,
    this.ipAddress,
    this.userAgent,
    required this.platform,
    this.location,
    this.metadata,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) {
    return AuditLog(
      id: json['_id'] ?? '',
      action: json['action'] ?? '',
      actionType: json['actionType'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      ipAddress: json['ipAddress'],
      userAgent: json['userAgent'],
      platform: json['platform'] ?? 'MOBILE',
      location: json['location'],
      metadata: json['metadata'],
    );
  }
}

class AuditTrailPage extends StatefulWidget {
  const AuditTrailPage({super.key});

  @override
  State<AuditTrailPage> createState() => _AuditTrailPageState();
}

class _AuditTrailPageState extends State<AuditTrailPage> {
  List<AuditLog> _auditLogs = [];
  bool _isLoading = true;
  bool _hasError = false;
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadAuditLogs();
  }

  Future<void> _loadAuditLogs({bool loadMore = false}) async {
    if (loadMore) {
      if (_isLoadingMore || _currentPage >= _totalPages) return;
      setState(() => _isLoadingMore = true);
    } else {
      setState(() {
        _isLoading = true;
        _hasError = false;
        _currentPage = 1;
      });
    }

    final result = await AuditLogService.getMyAuditLogs(
      page: loadMore ? _currentPage + 1 : 1,
      limit: 20,
    );

    if (result != null && result['success'] == true) {
      final logs = (result['data'] as List)
          .map((json) => AuditLog.fromJson(json))
          .toList();

      setState(() {
        if (loadMore) {
          _auditLogs.addAll(logs);
          _currentPage++;
        } else {
          _auditLogs = logs;
        }
        _totalPages = result['pagination']?['total_pages'] ?? 1;
        _isLoading = false;
        _isLoadingMore = false;
        _hasError = false;
      });
    } else {
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
        _hasError = true;
      });
    }
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day}, ${hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} $period';
  }

  IconData _getIconForActionType(String actionType) {
    switch (actionType) {
      case 'LOGIN':
        return Icons.login;
      case 'LOGOUT':
        return Icons.logout;
      case 'SCAN_PRODUCT':
        return Icons.qr_code_scanner;
      case 'UPDATE_PROFILE':
        return Icons.person;
      case 'CHANGE_PASSWORD':
        return Icons.lock;
      case 'LOCATION_UPDATE':
        return Icons.location_on;
      case 'APP_CLOSED':
        return Icons.close;
      default:
        return Icons.info;
    }
  }

  Color _getColorForActionType(String actionType) {
    switch (actionType) {
      case 'LOGIN':
        return Colors.green;
      case 'LOGOUT':
        return Colors.orange;
      case 'SCAN_PRODUCT':
        return app_colors.AppColors.primary;
      case 'UPDATE_PROFILE':
      case 'CHANGE_PASSWORD':
        return Colors.blue;
      case 'LOCATION_UPDATE':
        return Colors.purple;
      case 'APP_CLOSED':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  void _showLogDetails(AuditLog log) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: _getColorForActionType(log.actionType),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _getIconForActionType(log.actionType),
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              log.actionType.replaceAll('_', ' '),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Log ID: ${log.id.substring(0, 8)}...',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                // Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDetailRow('Action', log.action),
                        const Divider(height: 24),
                        _buildDetailRow('Action Type', log.actionType),
                        const Divider(height: 24),
                        _buildDetailRow('Platform', log.platform),
                        const Divider(height: 24),
                        _buildDetailRow('Date & Time', _formatDate(log.createdAt)),
                        if (log.ipAddress != null) ...[
                          const Divider(height: 24),
                          _buildDetailRow('IP Address', log.ipAddress!),
                        ],
                        if (log.location != null &&
                            log.location!['address'] != null) ...[
                          const Divider(height: 24),
                          _buildDetailRow('Location', log.location!['address']),
                        ],
                        if (log.metadata != null && log.metadata!.isNotEmpty) ...[
                          const Divider(height: 24),
                          const Text(
                            'Additional Details:',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: SelectableText(
                              log.metadata.toString(),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                // Footer
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.black54,
            ),
          ),
        ),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 14))),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Feature disable checker
    if (RemoteConfigService.isFeatureDisabled('disable_audit_page')) {
      return FeatureDisabledScreen(
        featureName: 'Audit',
        icon: Icons.history,
        selectedNavIndex: 1,
        navBarRole: NavBarRole.user,
      );
    }

    return Scaffold(
      appBar: GradientHeaderAppBar(
        showBackButton: false,
        showBranding: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _hasError
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load audit logs',
                        style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => _loadAuditLogs(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: app_colors.AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _auditLogs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history, size: 80, color: Colors.grey[300]),
                          const SizedBox(height: 16),
                          Text(
                            'No audit logs yet',
                            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => _loadAuditLogs(),
                      child: NotificationListener<ScrollNotification>(
                        onNotification: (ScrollNotification scrollInfo) {
                          if (scrollInfo.metrics.pixels ==
                                  scrollInfo.metrics.maxScrollExtent &&
                              !_isLoadingMore) {
                            _loadAuditLogs(loadMore: true);
                          }
                          return false;
                        },
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _auditLogs.length + (_isLoadingMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == _auditLogs.length) {
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(16.0),
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }

                            final log = _auditLogs[index];
                            final color = _getColorForActionType(log.actionType);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(12),
                                leading: Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: color.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _getIconForActionType(log.actionType),
                                    color: color,
                                    size: 28,
                                  ),
                                ),
                                title: Text(
                                  log.actionType.replaceAll('_', ' '),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    Text(
                                      log.action,
                                      style: TextStyle(
                                        color: Colors.grey[700],
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.access_time,
                                          size: 14,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          _formatDate(log.createdAt),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Icon(
                                          log.platform == 'MOBILE'
                                              ? Icons.phone_android
                                              : Icons.computer,
                                          size: 14,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          log.platform,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                trailing: ElevatedButton(
                                  onPressed: () => _showLogDetails(log),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: color,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 8,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: const Text('View'),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.user,
      ),
    );
  }
}
