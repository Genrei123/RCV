import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/gradient_header_app_bar.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/navigation_bar.dart';
import '../components/audit_table.dart'; // ✅ Import your audit table

class AuditTrailPage extends StatefulWidget {
  const AuditTrailPage({super.key});

  @override
  State<AuditTrailPage> createState() => _AuditTrailPageState();
}

class _AuditTrailPageState extends State<AuditTrailPage> {
  List<AuditEntry> _entries = [];
  int _currentPage = 1;
  final int _rowsPerPage = 5;

  @override
  void initState() {
    super.initState();
    _loadAuditData();
  }

  Future<void> _loadAuditData() async {
    final String response =
        await rootBundle.loadString('assets/data/audit_trail_data.json');
    final Map<String, dynamic> jsonData = jsonDecode(response);

    final List<dynamic> data = jsonData['auditLog']; // ✅ use auditLog array

    setState(() {
      _entries = data.map((e) => AuditEntry.fromJson(e)).toList();
    });
  }

  void _showDetails(AuditEntry entry) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(entry.type),
        content: Text(entry.details),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    int totalPages = (_entries.length / _rowsPerPage).ceil();
    int startIndex = (_currentPage - 1) * _rowsPerPage;
    int endIndex = (_currentPage * _rowsPerPage).clamp(0, _entries.length);

    List<AuditEntry> paginatedEntries =
        _entries.sublist(startIndex, endIndex);

    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: _entries.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                const SizedBox(height: 10),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        AuditTrailTable(
                          entries: paginatedEntries,
                          onDetailsPressed: _showDetails,
                        ),
                        AuditTrailPagination(
                          currentPage: _currentPage,
                          totalPages: totalPages,
                          totalEntries: _entries.length,
                          startIndex: startIndex,
                          endIndex: endIndex,
                          onFirstPage: _currentPage > 1
                              ? () => setState(() => _currentPage = 1)
                              : null,
                          onPreviousPage: _currentPage > 1
                              ? () => setState(() => _currentPage--)
                              : null,
                          onNextPage: _currentPage < totalPages
                              ? () => setState(() => _currentPage++)
                              : null,
                          onLastPage: _currentPage < totalPages
                              ? () => setState(() => _currentPage = totalPages)
                              : null,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 1,
        role: NavBarRole.user,
      ),
    );
  }
}
