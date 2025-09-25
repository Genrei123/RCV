import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'dart:convert';
import 'package:rcv_firebase/themes/app_colors.dart';

// =========================================================================
// AUDIT ENTRY DATA MODEL
// =========================================================================
class AuditEntry {
  final String type;
  final String action;
  final String date;
  final String details;
  final String? userId;

  AuditEntry({
    required this.type,
    required this.action,
    required this.date,
    required this.details,
    this.userId,
  });

  factory AuditEntry.fromJson(Map<String, dynamic> json) {
    return AuditEntry(
      type: json['type'] as String,
      action: json['action'] as String,
      date: json['date'] as String,
      details: json['details'] as String,
      userId: json['userId'] as String?,
    );
  }

  Color getTypeColor() {
    switch (type.toLowerCase()) {
      case 'logged in':
        return Colors.green.shade700;
      case 'logged out':
        return Colors.red.shade700;
      case 'uploaded':
        return Colors.blue.shade700;
      case 'pinned':
        return const Color(0xFF1A237E);
      case 'scanned':
        return Colors.teal.shade700;
      default:
        return Colors.grey.shade700;
    }
  }
}

// =========================================================================
// AUDIT DATA CONTROLLER
// =========================================================================
class AuditDataController {
  static Future<List<AuditEntry>> loadAuditData() async {
    try {
      final String jsonString = await rootBundle.loadString(
        'assets/audit_trail_data.json',
      );
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      final List<dynamic> auditLogList = jsonData['auditLog'] as List<dynamic>;

      return auditLogList
          .map((json) => AuditEntry.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Error loading audit data: $e');
      return [];
    }
  }

  static List<AuditEntry> filterByUserId(
    List<AuditEntry> entries,
    String? userId,
  ) {
    if (userId == null) return entries;
    return entries.where((entry) => entry.userId == userId).toList();
  }

  static List<AuditEntry> getRecentEntries(
    List<AuditEntry> entries, {
    int limit = 5,
  }) {
    return entries.take(limit).toList();
  }
}

// =========================================================================
// AUDIT TABLE WIDGET
// =========================================================================
class AuditTrailTable extends StatelessWidget {
  final List<AuditEntry> entries;
  final Function(AuditEntry) onDetailsPressed;
  final bool showEmpty;

  const AuditTrailTable({
    Key? key,
    required this.entries,
    required this.onDetailsPressed,
    this.showEmpty = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 5,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Table Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: const Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    'Type',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 11,
                    ),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    'Action',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 11,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Date',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 11,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      'Details',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Table Content or Empty State
          if (entries.isEmpty && showEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(8)),
              ),
              child: const Center(
                child: Text(
                  'No audit entries found',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            )
          else
            // Table Rows
            ...entries.map((entry) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: entries.indexOf(entry).isEven
                      ? Colors.white
                      : Colors.grey.shade50,
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade200),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: 3,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: entry.getTypeColor(),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          entry.type,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4.0),
                        child: Text(
                          entry.action,
                          style: const TextStyle(fontSize: 10),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4.0),
                        child: Text(
                          entry.date,
                          style: const TextStyle(fontSize: 10),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: IconButton(
                          icon: Icon(
                            Icons.arrow_forward_ios,
                            size: 12,
                            color: Colors.grey.shade600,
                          ),
                          onPressed: () => onDetailsPressed(entry),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
        ],
      ),
    );
  }
}

// =========================================================================
// AUDIT PAGINATION WIDGET
// =========================================================================
class AuditTrailPagination extends StatelessWidget {
  final int currentPage;
  final int totalPages;
  final int totalEntries;
  final int startIndex;
  final int endIndex;
  final VoidCallback? onFirstPage;
  final VoidCallback? onPreviousPage;
  final VoidCallback? onNextPage;
  final VoidCallback? onLastPage;

  const AuditTrailPagination({
    Key? key,
    required this.currentPage,
    required this.totalPages,
    required this.totalEntries,
    required this.startIndex,
    required this.endIndex,
    this.onFirstPage,
    this.onPreviousPage,
    this.onNextPage,
    this.onLastPage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              '${startIndex + 1}-$endIndex of $totalEntries Results',
              style: const TextStyle(fontSize: 10, color: Colors.grey),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.skip_previous, size: 16),
                onPressed: onFirstPage,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_left, size: 16),
                onPressed: onPreviousPage,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$currentPage',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, size: 16),
                onPressed: onNextPage,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              IconButton(
                icon: const Icon(Icons.skip_next, size: 16),
                onPressed: onLastPage,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =========================================================================
// COMPLETE AUDIT WIDGET (Combines table and pagination)
// =========================================================================
class CompleteAuditWidget extends StatefulWidget {
  final String? filterByUserId;
  final bool showRecentOnly;
  final int entriesPerPage;
  final bool showPagination;

  const CompleteAuditWidget({
    Key? key,
    this.filterByUserId,
    this.showRecentOnly = false,
    this.entriesPerPage = 10,
    this.showPagination = true,
  }) : super(key: key);

  @override
  State<CompleteAuditWidget> createState() => _CompleteAuditWidgetState();
}

class _CompleteAuditWidgetState extends State<CompleteAuditWidget> {
  List<AuditEntry> allEntries = [];
  List<AuditEntry> filteredEntries = [];
  List<AuditEntry> displayedEntries = [];
  int currentPage = 1;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAuditData();
  }

  Future<void> _loadAuditData() async {
    setState(() => isLoading = true);

    final entries = await AuditDataController.loadAuditData();

    setState(() {
      allEntries = entries;
      _updateFilteredEntries();
      isLoading = false;
    });
  }

  void _updateFilteredEntries() {
    List<AuditEntry> filtered = allEntries;

    // Filter by user ID if specified
    if (widget.filterByUserId != null) {
      filtered = AuditDataController.filterByUserId(
        filtered,
        widget.filterByUserId,
      );
    }

    // Get recent entries if specified
    if (widget.showRecentOnly) {
      filtered = AuditDataController.getRecentEntries(filtered);
    }

    setState(() {
      filteredEntries = filtered;
      currentPage = 1; // Reset to first page when filter changes
      _updateDisplayedEntries();
    });
  }

  void _updateDisplayedEntries() {
    if (!widget.showPagination) {
      setState(() {
        displayedEntries = filteredEntries;
      });
      return;
    }

    int startIndex = (currentPage - 1) * widget.entriesPerPage;
    int endIndex = startIndex + widget.entriesPerPage;
    if (endIndex > filteredEntries.length) endIndex = filteredEntries.length;

    setState(() {
      displayedEntries = filteredEntries.sublist(startIndex, endIndex);
    });
  }

  void _goToFirstPage() {
    setState(() => currentPage = 1);
    _updateDisplayedEntries();
  }

  void _goToPreviousPage() {
    if (currentPage > 1) {
      setState(() => currentPage--);
      _updateDisplayedEntries();
    }
  }

  void _goToNextPage() {
    int totalPages = (filteredEntries.length / widget.entriesPerPage).ceil();
    if (currentPage < totalPages) {
      setState(() => currentPage++);
      _updateDisplayedEntries();
    }
  }

  void _goToLastPage() {
    int totalPages = (filteredEntries.length / widget.entriesPerPage).ceil();
    setState(() => currentPage = totalPages);
    _updateDisplayedEntries();
  }

  void _showEntryDetails(AuditEntry entry) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('${entry.type} Details'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Action: ${entry.action}'),
              const SizedBox(height: 8),
              Text('Date: ${entry.date}'),
              const SizedBox(height: 8),
              Text('Details: ${entry.details}'),
              if (entry.userId != null) ...[
                const SizedBox(height: 8),
                Text('User ID: ${entry.userId}'),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    int totalPages = widget.showPagination
        ? (filteredEntries.length / widget.entriesPerPage).ceil()
        : 1;
    int startIndex = widget.showPagination
        ? (currentPage - 1) * widget.entriesPerPage
        : 0;
    int endIndex = widget.showPagination
        ? startIndex + displayedEntries.length
        : filteredEntries.length;

    return Column(
      children: [
        AuditTrailTable(
          entries: displayedEntries,
          onDetailsPressed: _showEntryDetails,
          showEmpty: true,
        ),
        if (widget.showPagination && filteredEntries.isNotEmpty) ...[
          const SizedBox(height: 8),
          AuditTrailPagination(
            currentPage: currentPage,
            totalPages: totalPages,
            totalEntries: filteredEntries.length,
            startIndex: startIndex,
            endIndex: endIndex,
            onFirstPage: currentPage > 1 ? _goToFirstPage : null,
            onPreviousPage: currentPage > 1 ? _goToPreviousPage : null,
            onNextPage: currentPage < totalPages ? _goToNextPage : null,
            onLastPage: currentPage < totalPages ? _goToLastPage : null,
          ),
        ] else if (!widget.showPagination && filteredEntries.isNotEmpty)
          // Show simple results count for non-paginated version
          Container(
            padding: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(8),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  spreadRadius: 1,
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Text(
              '1-${filteredEntries.length} of ${filteredEntries.length} Results',
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
      ],
    );
  }
}
