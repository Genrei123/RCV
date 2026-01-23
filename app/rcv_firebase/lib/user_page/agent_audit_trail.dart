import 'package:flutter/material.dart';
import '../widgets/title_logo_header_app_bar.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../services/remote_config_service.dart';
import '../services/audit_log_service.dart';

// Audit log model
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
      if (!mounted) return;
      setState(() => _isLoadingMore = true);
    } else {
      if (!mounted) return;
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

    if (!mounted) return;

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

  // Format date to readable string
  String _formatShortDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  void _showScanDetails(AuditLog log) {
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
                              '${log.actionType} Details',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'ID: ${log.id}',
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
                        _buildDetailRow(
                          'Date & Time',
                          _formatShortDate(log.createdAt),
                        ),
                        const Divider(height: 24),
                        _buildDetailRow('Platform', log.platform),
                        if (log.ipAddress != null) ...[
                          const Divider(height: 24),
                          _buildDetailRow('IP Address', log.ipAddress ?? 'N/A'),
                        ],
                        if (log.location != null) ...[
                          const Divider(height: 24),
                          _buildDetailRow(
                            'Location',
                            '${log.location?['address'] ?? 'N/A'}',
                          ),
                        ],
                        if (log.metadata != null && log.metadata!.isNotEmpty) ...[
                          const Divider(height: 24),
                          const Text(
                            'Additional Data:',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildFormattedMetadata(log.metadata ?? {}),
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

  Widget _buildFormattedMetadata(Map<String, dynamic> metadata) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: metadata.entries
            .map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${entry.key}:',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.value?.toString() ?? 'N/A',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ))
            .toList(),
      ),
    );
  }

  @override
Widget build(BuildContext context) {
    //Feature disable checker
    if (RemoteConfigService.isFeatureDisabled('disable_audit_page')) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        const TitleLogoHeaderAppBar(
          title: 'Audit Trail',
          showBackButton: false,
        ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _hasError
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 80, color: Colors.red[300]),
                          const SizedBox(height: 16),
                          Text(
                            'Failed to load audit logs',
                            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => _loadAuditLogs(),
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
                                'No audit records yet',
                                style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
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

                            // Load more when near the end
                            if (index == _auditLogs.length - 3) {
                              _loadAuditLogs(loadMore: true);
                            }

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
                                    color: _getColorForActionType(log.actionType)
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _getIconForActionType(log.actionType),
                                    color:
                                        _getColorForActionType(log.actionType),
                                    size: 28,
                                  ),
                                ),
                                title: Text(
                                  log.action,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    Text(
                                      log.actionType,
                                      style: TextStyle(
                                        color: _getColorForActionType(
                                            log.actionType),
                                        fontWeight: FontWeight.w500,
                                      ),
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
                                          _formatShortDate(log.createdAt),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (log.platform.isNotEmpty)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 2),
                                        child: Row(
                                          children: [
                                            Icon(
                                              Icons.devices,
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
                                      ),
                                  ],
                                ),
                                trailing: ElevatedButton(
                                  onPressed: () => _showScanDetails(log),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor:
                                        app_colors.AppColors.primary,
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
      ],
    );
  }
}