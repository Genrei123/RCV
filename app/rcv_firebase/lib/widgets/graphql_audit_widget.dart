import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../graphql/queries.dart';
import '../widgets/audit_table.dart'; // Your existing audit table components

class GraphQLAuditWidget extends StatefulWidget {
  final String? userId;
  final bool showPagination;
  final int entriesPerPage;
  final bool showRecentOnly;

  const GraphQLAuditWidget({
    Key? key,
    this.userId,
    this.showPagination = true,
    this.entriesPerPage = 10,
    this.showRecentOnly = false,
  }) : super(key: key);

  @override
  State<GraphQLAuditWidget> createState() => _GraphQLAuditWidgetState();
}

class _GraphQLAuditWidgetState extends State<GraphQLAuditWidget> {
  int currentPage = 1;

  @override
  Widget build(BuildContext context) {
    // Use Query widget from graphql_flutter
    return Query(
      options: QueryOptions(
        document: gql(GraphQLQueries.getAuditTrails),
        variables: {
          'filters': {if (widget.userId != null) 'userId': widget.userId},
          if (widget.showPagination) 'page': currentPage,
          if (widget.showPagination) 'limit': widget.entriesPerPage,
        },
        pollInterval: const Duration(
          seconds: 30,
        ), // Auto-refresh every 30 seconds
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder:
          (QueryResult result, {VoidCallback? refetch, FetchMore? fetchMore}) {
            // Handle loading state
            if (result.isLoading && result.data == null) {
              return _buildLoadingWidget();
            }

            // Handle error state
            if (result.hasException) {
              return _buildErrorWidget(result.exception!, refetch);
            }

            // Handle empty data
            if (result.data == null || result.data!['auditTrails'] == null) {
              return _buildEmptyWidget(refetch);
            }

            // Parse audit trails data
            final List<dynamic> auditTrailsJson =
                result.data!['auditTrails'] as List;
            final List<AuditEntry> auditTrails = auditTrailsJson
                .map((json) => AuditEntry.fromJson(json))
                .toList();

            // Filter recent entries if needed
            final List<AuditEntry> filteredAudits = widget.showRecentOnly
                ? auditTrails.take(5).toList()
                : auditTrails;

            if (filteredAudits.isEmpty) {
              return _buildEmptyWidget(refetch);
            }

            // Calculate total pages for pagination
            final int totalCount = widget.showPagination
                ? result.data!['auditTrailsCount'] ?? filteredAudits.length
                : filteredAudits.length;
            final int totalPages = (totalCount / widget.entriesPerPage).ceil();
            final int startIndex =
                (currentPage - 1) * widget.entriesPerPage + 1;
            final int endIndex = (startIndex + filteredAudits.length - 1).clamp(
              startIndex,
              totalCount,
            );

            return Column(
              children: [
                // Header with refresh and info
                _buildHeader(
                  filteredAudits.length,
                  totalCount,
                  refetch,
                  result.isLoading,
                ),

                // Audit table
                AuditTrailTable(
                  entries: filteredAudits,
                  onDetailsPressed: (entry) {
                    // Handle details view
                    _showAuditDetails(context, entry);
                  },
                ),

                // Pagination if enabled
                if (widget.showPagination && totalPages > 1)
                  _buildPagination(
                    totalPages,
                    totalCount,
                    startIndex,
                    endIndex,
                  ),

                // Loading indicator for background refreshes
                if (result.isLoading && result.data != null)
                  const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: LinearProgressIndicator(),
                  ),
              ],
            );
          },
    );
  }

  Widget _buildLoadingWidget() {
    return Card(
      child: Container(
        height: 200,
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading audit trails...'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget(
    OperationException exception,
    VoidCallback? refetch,
  ) {
    print('GraphQL Error: $exception');

    // Instead of showing error, fall back to existing CompleteAuditWidget
    return Column(
      children: [
        // Show warning but continue with fallback
        Container(
          margin: const EdgeInsets.only(bottom: 16.0),
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange.shade700, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GraphQL server unavailable - using local data',
                      style: TextStyle(
                        color: Colors.orange.shade700,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      'Start your backend server to enable real-time updates',
                      style: TextStyle(
                        color: Colors.orange.shade600,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: refetch,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.orange.shade700,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text('Retry', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ),

        // Fall back to existing CompleteAuditWidget
        CompleteAuditWidget(
          filterByUserId: widget.userId,
          showRecentOnly: widget.showRecentOnly,
          showPagination: widget.showPagination,
          entriesPerPage: widget.entriesPerPage,
        ),
      ],
    );
  }

  Widget _buildEmptyWidget(VoidCallback? refetch) {
    return Card(
      child: Container(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No audit trails found',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'There are currently no audit trails to display.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: refetch, child: const Text('Refresh')),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(
    int displayCount,
    int totalCount,
    VoidCallback? refetch,
    bool isLoading,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Showing $displayCount of $totalCount entries',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (widget.showRecentOnly)
                Text(
                  'Recent entries only',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.blue),
                ),
            ],
          ),
          Row(
            children: [
              if (isLoading)
                const Padding(
                  padding: EdgeInsets.only(right: 8.0),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: refetch,
                tooltip: 'Refresh audit trails',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPagination(
    int totalPages,
    int totalCount,
    int startIndex,
    int endIndex,
  ) {
    return AuditTrailPagination(
      currentPage: currentPage,
      totalPages: totalPages,
      totalEntries: totalCount,
      startIndex: startIndex,
      endIndex: endIndex,
      onFirstPage: currentPage > 1
          ? () => setState(() => currentPage = 1)
          : null,
      onPreviousPage: currentPage > 1
          ? () => setState(() => currentPage--)
          : null,
      onNextPage: currentPage < totalPages
          ? () => setState(() => currentPage++)
          : null,
      onLastPage: currentPage < totalPages
          ? () => setState(() => currentPage = totalPages)
          : null,
    );
  }

  void _showAuditDetails(BuildContext context, AuditEntry entry) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Audit Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Type: ${entry.type}'),
            const SizedBox(height: 8),
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
      ),
    );
  }
}

// Remove AuditEntry definition here and import from audit_table.dart
