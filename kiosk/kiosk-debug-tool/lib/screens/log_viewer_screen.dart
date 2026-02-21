import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/kiosk_log.dart';
import '../services/kiosk_service.dart';
import '../theme/app_theme.dart';

/// Real-time log viewer for kiosk debugging.
/// Shows all print() output, errors, OCR scans, API calls etc.
/// streamed from Firebase in real-time.
class LogViewerScreen extends StatefulWidget {
  const LogViewerScreen({super.key});

  @override
  State<LogViewerScreen> createState() => _LogViewerScreenState();
}

class _LogViewerScreenState extends State<LogViewerScreen> {
  final ScrollController _scrollController = ScrollController();
  final bool _autoScroll = true;
  String _searchQuery = '';

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Color _getLevelColor(String level) {
    switch (level) {
      case 'error':
        return AppTheme.errorRed;
      case 'warning':
        return AppTheme.warningOrange;
      case 'debug':
        return Colors.grey;
      default:
        return AppTheme.primaryGreen;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'ocr':
        return Icons.document_scanner;
      case 'scan':
        return Icons.qr_code_scanner;
      case 'api':
        return Icons.cloud;
      case 'system':
        return Icons.memory;
      case 'gpio':
        return Icons.lightbulb;
      case 'command':
        return Icons.terminal;
      default:
        return Icons.info_outline;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'ocr':
        return Colors.purple;
      case 'scan':
        return Colors.blue;
      case 'api':
        return Colors.teal;
      case 'system':
        return Colors.orange;
      case 'gpio':
        return Colors.amber;
      case 'command':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<KioskService>(
      builder: (context, kiosk, _) {
        final logs = _searchQuery.isEmpty
            ? kiosk.logs
            : kiosk.logs
                .where((l) =>
                    l.message.toLowerCase().contains(_searchQuery.toLowerCase()))
                .toList();

        return Column(
          children: [
            // ── Filter bar ──
            _buildFilterBar(kiosk),
            
            // ── Search bar ──
            _buildSearchBar(),
            
            // ── Stats bar ──
            _buildStatsBar(kiosk),
            
            // ── Log list ──
            Expanded(
              child: logs.isEmpty
                  ? _buildEmptyState(kiosk)
                  : _buildLogList(logs),
            ),
          ],
        );
      },
    );
  }

  Widget _buildFilterBar(KioskService kiosk) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: Row(
        children: [
          // Filter chips
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _filterChip('All', 'all', kiosk),
                  const SizedBox(width: 6),
                  _filterChip('Errors', 'error', kiosk, color: AppTheme.errorRed),
                  const SizedBox(width: 6),
                  _filterChip('Warnings', 'warning', kiosk, color: AppTheme.warningOrange),
                  const SizedBox(width: 6),
                  _filterChip('OCR', 'ocr', kiosk, color: Colors.purple),
                  const SizedBox(width: 6),
                  _filterChip('Scans', 'scan', kiosk, color: Colors.blue),
                  const SizedBox(width: 6),
                  _filterChip('API', 'api', kiosk, color: Colors.teal),
                  const SizedBox(width: 6),
                  _filterChip('System', 'system', kiosk, color: Colors.orange),
                  const SizedBox(width: 6),
                  _filterChip('Commands', 'command', kiosk, color: Colors.indigo),
                ],
              ),
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Pause/Resume button
          IconButton(
            icon: Icon(
              kiosk.isLogsPaused ? Icons.play_arrow : Icons.pause,
              color: kiosk.isLogsPaused ? AppTheme.errorRed : AppTheme.primaryGreen,
            ),
            tooltip: kiosk.isLogsPaused ? 'Resume' : 'Pause',
            onPressed: kiosk.toggleLogsPaused,
            iconSize: 20,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
          
          // Clear logs button
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.grey),
            tooltip: 'Clear logs',
            onPressed: () => _confirmClearLogs(context, kiosk),
            iconSize: 20,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String filter, KioskService kiosk, {Color? color}) {
    final isSelected = kiosk.logFilter == filter;
    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: isSelected ? Colors.white : (color ?? Colors.grey.shade700),
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      onSelected: (_) => kiosk.setLogFilter(filter),
      selectedColor: color ?? AppTheme.primaryGreen,
      backgroundColor: Colors.white,
      side: BorderSide(color: color?.withOpacity(0.3) ?? Colors.grey.shade300),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Search logs...',
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () => setState(() => _searchQuery = ''),
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          isDense: true,
        ),
        style: const TextStyle(fontSize: 14),
        onChanged: (value) => setState(() => _searchQuery = value),
      ),
    );
  }

  Widget _buildStatsBar(KioskService kiosk) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.fiber_manual_record,
              size: 8,
              color: kiosk.isLogsPaused ? AppTheme.errorRed : AppTheme.successGreen),
          const SizedBox(width: 6),
          Text(
            kiosk.isLogsPaused ? 'PAUSED' : 'LIVE',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: kiosk.isLogsPaused ? AppTheme.errorRed : AppTheme.successGreen,
            ),
          ),
          const SizedBox(width: 16),
          Text(
            '${kiosk.logCount} logs',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          ),
          if (kiosk.errorLogCount > 0) ...[
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.errorRed.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${kiosk.errorLogCount} errors',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.errorRed,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
          if (kiosk.warningLogCount > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.warningOrange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${kiosk.warningLogCount} warnings',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.warningOrange,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
          const Spacer(),
          if (_autoScroll)
            const Icon(Icons.vertical_align_bottom, size: 14, color: Colors.grey),
        ],
      ),
    );
  }

  Widget _buildEmptyState(KioskService kiosk) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            kiosk.selectedKioskId == null
                ? 'Select a kiosk to view logs'
                : 'No logs yet',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Logs will appear here in real-time',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade400,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogList(List<KioskLog> logs) {
    return ListView.builder(
      controller: _scrollController,
      reverse: true, // Latest logs at bottom (but scroll starts at top since list is reversed)
      itemCount: logs.length,
      padding: const EdgeInsets.symmetric(vertical: 4),
      itemBuilder: (context, index) {
        final log = logs[index];
        return _buildLogEntry(log);
      },
    );
  }

  Widget _buildLogEntry(KioskLog log) {
    final levelColor = _getLevelColor(log.level);
    final categoryIcon = _getCategoryIcon(log.category);
    final categoryColor = _getCategoryColor(log.category);

    return InkWell(
      onTap: log.data != null ? () => _showLogDetail(log) : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: levelColor, width: 3),
            bottom: BorderSide(color: Colors.grey.shade100),
          ),
          color: log.level == 'error'
              ? AppTheme.errorRed.withOpacity(0.03)
              : log.level == 'warning'
                  ? AppTheme.warningOrange.withOpacity(0.03)
                  : Colors.transparent,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Timestamp
            SizedBox(
              width: 58,
              child: Text(
                _formatTime(log.timestamp),
                style: TextStyle(
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: Colors.grey.shade500,
                ),
              ),
            ),
            
            // Category icon
            Padding(
              padding: const EdgeInsets.only(right: 6, top: 1),
              child: Icon(categoryIcon, size: 14, color: categoryColor),
            ),
            
            // Level badge
            Container(
              width: 38,
              padding: const EdgeInsets.symmetric(vertical: 1),
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: levelColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                log.levelLabel,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: levelColor,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            
            // Message
            Expanded(
              child: Text(
                log.message,
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: log.level == 'error'
                      ? AppTheme.errorRed
                      : log.level == 'warning'
                          ? Colors.orange.shade800
                          : Colors.black87,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            
            // Category label
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: categoryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                log.categoryLabel,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: categoryColor,
                ),
              ),
            ),

            // Extra data indicator
            if (log.data != null)
              const Padding(
                padding: EdgeInsets.only(left: 4),
                child: Icon(Icons.data_object, size: 12, color: Colors.grey),
              ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}:'
        '${time.second.toString().padLeft(2, '0')}';
  }

  void _showLogDetail(KioskLog log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(_getCategoryIcon(log.category), color: _getCategoryColor(log.category)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${log.levelLabel} - ${log.categoryLabel}',
                style: const TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                log.message,
                style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
              ),
              if (log.data != null) ...[
                const SizedBox(height: 16),
                const Text(
                  'Extra Data:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    log.data.toString(),
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: Colors.grey.shade800,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Text(
                'Time: ${log.localTime}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _confirmClearLogs(BuildContext context, KioskService kiosk) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Logs'),
        content: const Text('This will delete all logs for this kiosk from Firebase. Continue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              kiosk.clearLogs();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorRed,
              foregroundColor: Colors.white,
            ),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}
