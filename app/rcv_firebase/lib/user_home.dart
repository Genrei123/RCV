import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import '../components/audit_table.dart'; // ✅ Import your audit table

class UserHomePage extends StatefulWidget {
  const UserHomePage({super.key});

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  final int _selectedIndex = 0;

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

    final List<dynamic> data = jsonData['auditLog'];

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
        _entries.isNotEmpty ? _entries.sublist(startIndex, endIndex) : [];

    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: 'Agent user',
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Centered "Home" title
            Center(
              child: Text(
                'Home',
                style: AppFonts.titleStyle.copyWith(
                  color: AppColors.text,
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Locations button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Left text
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Locations",
                        style: AppFonts.titleStyle.copyWith(
                          color: AppColors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "Tag the location",
                        style: AppFonts.subtitleStyle.copyWith(
                          color: AppColors.white,
                        ),
                      ),
                    ],
                  ),
                  // Right icon
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.white.withOpacity(0.2)),
                    ),
                    child: Center(
                      child: Icon(
                        LucideIcons.mapPin,
                        color: AppColors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Divider with "Today's Audit"
            Row(
              children: [
                const Expanded(child: Divider(thickness: 1)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Text(
                    "Today's Audit",
                    style: AppFonts.subtitleStyle.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                ),
                const Expanded(child: Divider(thickness: 1)),
              ],
            ),

            const SizedBox(height: 12),

            // Table
            Expanded(
              child: _entries.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
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
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: _selectedIndex,
        role: NavBarRole.user,
      ),
    );
  }
}

// ✅ Preview (can be removed if you already run from main.dart)
void main() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: UserHomePage(),
  ));
}
