import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';

// Simple in-memory Report model (can be moved to models folder later)
class ReportItem {
  final String id;
  final String title;
  final String description;
  final DateTime createdAt;
  final ReportStatus status;
  final ReportCategory category;

  ReportItem({
    required this.id,
    required this.title,
    required this.description,
    required this.createdAt,
    required this.status,
    required this.category,
  });
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
final List<ReportItem> _reports = [];
  final bool _loading = false; // UI-only mode: no fetching
  String? _error;
  ReportCategory? _activeFilter; // null = all
  // UI-only mode: removed data fetching and mapping functions

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
                : ListView.separated(
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
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text(r.title),
                              content: Text(r.description),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('Close'),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
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
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inbox, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text('No reports yet', style: AppFonts.titleStyle),
          const SizedBox(height: 8),
          Text(
            _error ?? 'Any reports you generate will appear here.',
            style: AppFonts.contentStyle,
            textAlign: TextAlign.center,
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
                      Icon(iconData, size: 18, color: chipColor),
                      const SizedBox(width: 6),
                      Text(
                        labelText,
                        style: AppFonts.labelStyle.copyWith(
                          fontWeight: FontWeight.w600,
                          color: chipColor,
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
