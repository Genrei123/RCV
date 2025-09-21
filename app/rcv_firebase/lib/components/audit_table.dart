// lib/components/audit_table.dart
import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart'; // Ensure this path is correct

// =========================================================================
// AUDIT ENTRY DATA MODEL (Copied for self-containment in this component)
// You might want to define this in a shared models/data.dart file
// if used in many places. For now, it's here to make the component runnable.
// =========================================================================
class AuditEntry {
  final String type;
  final String action;
  final String date;
  final String details;

  AuditEntry({
    required this.type,
    required this.action,
    required this.date,
    required this.details,
  });

  factory AuditEntry.fromJson(Map<String, dynamic> json) {
    return AuditEntry(
      type: json['type'] as String,
      action: json['action'] as String,
      date: json['date'] as String,
      details: json['details'] as String,
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
// AUDIT TRAIL TABLE WIDGET
// =========================================================================
class AuditTrailTable extends StatelessWidget {
  final List<AuditEntry> entries;
  final Function(AuditEntry) onDetailsPressed;

  const AuditTrailTable({
    Key? key,
    required this.entries,
    required this.onDetailsPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      // Margin and outer decoration (shadow, rounded corners) for the whole table block
      margin: const EdgeInsets.symmetric(horizontal: 16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        // Only top corners are rounded here, as the pagination will handle bottom
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
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: const Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text('Type',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 11)),
                ),
                Expanded(
                  flex: 4,
                  child: Text('Action',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 11)),
                ),
                Expanded(
                  flex: 3,
                  child: Text('Date',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 11)),
                ),
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Text('Details',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            fontSize: 11)),
                  ),
                ),
              ],
            ),
          ),
          // Table Rows
          ...entries.map((entry) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: entries.indexOf(entry).isEven ? Colors.white : Colors.grey.shade50,
                border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 3,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(
                        color: entry.getTypeColor(),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        entry.type,
                        style: const TextStyle(color: Colors.white, fontSize: 9),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: Text(entry.action,
                          style: const TextStyle(fontSize: 10)),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: Text(entry.date,
                          style: const TextStyle(fontSize: 10)),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: IconButton(
                        icon: Icon(Icons.arrow_forward_ios,
                            size: 12, color: Colors.grey.shade600),
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
// AUDIT TRAIL PAGINATION WIDGET
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
      margin: const EdgeInsets.symmetric(horizontal: 16.0),
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
              '${startIndex + 1}-${endIndex} of $totalEntries Results',
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
                      fontSize: 10),
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