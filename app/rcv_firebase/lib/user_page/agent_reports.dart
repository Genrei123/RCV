import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';
import '../services/api_service.dart';
import '../pages/report_detail_page.dart';

// Simple in-memory Report model (can be moved to models folder later)
class ReportItem {
  final String id;
  final String title;
  final String description;
  final DateTime createdAt;
  final ReportStatus status;
  final ReportCategory category;
  final String? productName;
  final String? brandName;
  final Map<String, dynamic> rawData; // Store the full report data

  ReportItem({
    required this.id,
    required this.title,
    required this.description,
    required this.createdAt,
    required this.status,
    required this.category,
    this.productName,
    this.brandName,
    required this.rawData,
  });

  factory ReportItem.fromJson(Map<String, dynamic> json) {
    // Map backend status to UI status
    ReportStatus reportStatus;
    final backendStatus = json['status']?.toString().toUpperCase();
    if (backendStatus == 'COMPLIANT') {
      reportStatus = ReportStatus.closed;
    } else if (backendStatus == 'NON_COMPLIANT' ||
        backendStatus == 'FRAUDULENT') {
      reportStatus = ReportStatus.open;
    } else {
      reportStatus = ReportStatus.inReview;
    }

    // Map backend status to category
    ReportCategory category;
    if (backendStatus == 'COMPLIANT') {
      category = ReportCategory.verified;
    } else if (backendStatus == 'NON_COMPLIANT' ||
        backendStatus == 'FRAUDULENT') {
      category = ReportCategory.notVerified;
    } else {
      category = ReportCategory.inReview;
    }

    // Build title and description
    final productName =
        json['scannedData']?['productName'] ?? 'Unknown Product';
    final brandName = json['scannedData']?['brandName'] ?? 'Unknown Brand';
    final title = '$productName - $brandName';
    final description =
        json['nonComplianceReason'] ?? 'Compliance report submitted';

    return ReportItem(
      id: json['_id'] ?? '',
      title: title,
      description: description,
      createdAt: DateTime.parse(json['createdAt']),
      status: reportStatus,
      category: category,
      productName: productName,
      brandName: brandName,
      rawData: json, // Store the complete report data
    );
  }
}

enum ReportStatus { open, inReview, closed }

// High-level user facing categories for filtering
enum ReportCategory { verified, notVerified, inReview }

extension ReportStatusX on ReportStatus {
  String get label {
    switch (this) {
      case ReportStatus.open:
        return 'OPEN';
      case ReportStatus.inReview:
        return 'IN REVIEW';
      case ReportStatus.closed:
        return 'CLOSED';
    }
  }

  Color get color {
    switch (this) {
      case ReportStatus.open:
        return Colors.orange.shade600;
      case ReportStatus.inReview:
        return Colors.blue.shade600;
      case ReportStatus.closed:
        return Colors.green.shade600;
    }
  }
}

class UserReportsPage extends StatefulWidget {
  const UserReportsPage({super.key});

  @override
  State<UserReportsPage> createState() => _UserReportsPageState();
}

class _UserReportsPageState extends State<UserReportsPage> {
  List<ReportItem> _reports = [];
  bool _loading = true;
  String? _error;
  ReportCategory? _activeFilter; // null = all
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await _apiService.getComplianceReports(
        page: 1,
        limit: 100,
      );

      if (result['success'] == true) {
        final List<dynamic> data = result['data'] ?? [];

        setState(() {
          _reports = data.map((json) => ReportItem.fromJson(json)).toList();
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load reports';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: ${e.toString()}';
        _loading = false;
      });
    }
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    const months = [
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
      'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TitleLogoHeaderAppBar(
        title: 'User Reports',
        showBackButton: false,
      ),
      body: Column(
        children: [
          _buildCategoryFilters(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filteredReports().isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: _fetchReports,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      itemCount: _filteredReports().length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final r = _filteredReports()[index];
                        return _ReportCard(
                          report: r,
                          relativeTime: _relativeTime(r.createdAt),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    ReportDetailPage(reportData: r.rawData),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNavBar(
        selectedIndex: 3,
        role: NavBarRole.user,
      ),
    );
  }

  Widget _buildEmptyState() {
    return RefreshIndicator(
      onRefresh: _fetchReports,
      child: ListView(
        children: [
          SizedBox(height: 100),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.inbox,
                  size: 64,
                  color: _error != null
                      ? Colors.red.shade400
                      : Colors.grey.shade400,
                ),
                const SizedBox(height: 16),
                Text(
                  _error != null ? 'Error Loading Reports' : 'No reports yet',
                  style: AppFonts.titleStyle.copyWith(
                    color: _error != null ? Colors.red : null,
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    _error ?? 'Any reports you generate will appear here.',
                    style: AppFonts.contentStyle,
                    textAlign: TextAlign.center,
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _fetchReports,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<ReportItem> _filteredReports() {
    if (_activeFilter == null) return _reports;
    return _reports.where((r) => r.category == _activeFilter).toList();
  }

  Widget _buildCategoryFilters() {
    // New simplified filters: All, Verified, Not Verified
    final filters = [null, ReportCategory.verified, ReportCategory.notVerified];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: filters.map((c) {
          final bool isAll = c == null;
          final active = _activeFilter == c || (isAll && _activeFilter == null);
          final Color chipColor = isAll
              ? Colors.blue.shade600
              : _categoryColor(c);
          final Color fillColor = chipColor.withValues(alpha: 0.15);
          final IconData iconData = isAll ? Icons.all_inbox : _categoryIcon(c);
          final String labelText = isAll ? 'All' : _categoryLabel(c);
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: GestureDetector(
                onTap: () => setState(() {
                  _activeFilter = active ? null : c; // null represents All
                }),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 12,
                  ),
                  decoration: BoxDecoration(
                    color: active ? fillColor : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: active ? chipColor : Colors.grey.shade300,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(iconData, size: 16, color: chipColor),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          labelText,
                          style: AppFonts.labelStyle.copyWith(
                            fontWeight: FontWeight.w600,
                            color: chipColor,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Color _categoryColor(ReportCategory c) {
    switch (c) {
      case ReportCategory.verified:
        return Colors.green.shade600;
      case ReportCategory.notVerified:
        return Colors.red.shade600;
      case ReportCategory.inReview:
        return Colors.amber.shade700;
    }
  }

  IconData _categoryIcon(ReportCategory c) {
    switch (c) {
      case ReportCategory.verified:
        return Icons.check_circle;
      case ReportCategory.notVerified:
        return Icons.cancel;
      case ReportCategory.inReview:
        return Icons.help;
    }
  }

  String _categoryLabel(ReportCategory c) {
    switch (c) {
      case ReportCategory.verified:
        return 'Verified';
      case ReportCategory.notVerified:
        return 'Not Verified';
      case ReportCategory.inReview:
        return 'In Review';
    }
  }
}

class _ReportCard extends StatelessWidget {
  final ReportItem report;
  final String relativeTime;
  final VoidCallback onTap;

  const _ReportCard({
    required this.report,
    required this.relativeTime,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color catColor = _externalCategoryColor(report.category);
    final IconData catIcon = _externalCategoryIcon(report.category);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: catColor.withValues(alpha: 0.15),
              child: Icon(catIcon, color: catColor),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          report.title,
                          style: AppFonts.titleStyle.copyWith(fontSize: 16),
                        ),
                      ),
                      _StatusChip(status: report.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    report.description,
                    style: AppFonts.contentStyle.copyWith(
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    relativeTime,
                    style: AppFonts.labelStyle.copyWith(
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Access parent's category color/icon helpers via duplication (simpler than lifting state)
  Color _externalCategoryColor(ReportCategory c) {
    switch (c) {
      case ReportCategory.verified:
        return Colors.green.shade600;
      case ReportCategory.notVerified:
        return Colors.red.shade600;
      case ReportCategory.inReview:
        return Colors.amber.shade700;
    }
  }

  IconData _externalCategoryIcon(ReportCategory c) {
    switch (c) {
      case ReportCategory.verified:
        return Icons.check_circle;
      case ReportCategory.notVerified:
        return Icons.cancel;
      case ReportCategory.inReview:
        return Icons.help;
    }
  }
}

class _StatusChip extends StatelessWidget {
  final ReportStatus status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: AppFonts.labelStyle.copyWith(
          fontWeight: FontWeight.bold,
          color: status.color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
