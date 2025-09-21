import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:rcv_firebase/themes/app_colors.dart';
import 'package:rcv_firebase/components/audit_table.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'RCV Audit Trail Demo',
      theme: ThemeData(
        primaryColor: AppColors.primary,
        hintColor: AppColors.secondary,
        fontFamily: 'Roboto',
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const AuditTrailPlaceholderPage(),
    );
  }
}

class AuditTrailPlaceholderPage extends StatefulWidget {
  const AuditTrailPlaceholderPage({super.key});

  @override
  State<AuditTrailPlaceholderPage> createState() => _AuditTrailPlaceholderPageState();
}

class _AuditTrailPlaceholderPageState extends State<AuditTrailPlaceholderPage> {
  late Future<List<AuditEntry>> _auditLogFuture;
  int _currentPage = 1;
  final int _itemsPerPage = 10;
  List<AuditEntry> _allAuditEntries = [];

  @override
  void initState() {
    super.initState();
    _auditLogFuture = _loadAuditData().then((entries) {
      _allAuditEntries = entries;
      return entries;
    });
  }

  Future<List<AuditEntry>> _loadAuditData() async {
    try {
      final String response = await rootBundle.loadString('assets/data/audit_trail_data.json');
      final data = jsonDecode(response);
      if (data != null && data['auditLog'] is List) {
        return (data['auditLog'] as List)
            .map((item) => AuditEntry.fromJson(item))
            .toList();
      }
    } catch (e) {
      print('Error loading audit data: $e');
    }
    return [];
  }

  void _showDetailsModal(AuditEntry entry) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16.0),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Details',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.grey),
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildDetailRow('Type:', entry.type,
                    color: entry.getTypeColor()),
                _buildDetailRow('Action:', entry.action),
                _buildDetailRow('Date:', entry.date),
                _buildDetailRow('Full Details:', entry.details),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.black54,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: color ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<List<AuditEntry>>(
        future: _auditLogFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No audit log entries found. Please check assets/data/audit_trail_data.json'));
          } else {
            final totalEntries = _allAuditEntries.length;
            final totalPages = (totalEntries / _itemsPerPage).ceil();

            final startIndex = (_currentPage - 1) * _itemsPerPage;
            final endIndex = (_currentPage * _itemsPerPage).clamp(0, totalEntries);
            final currentEntries = _allAuditEntries.sublist(startIndex, endIndex);

            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AuditTrailTable(
                    entries: currentEntries,
                    onDetailsPressed: _showDetailsModal,
                  ),
                  const SizedBox(height: 10),
                  AuditTrailPagination(
                    currentPage: _currentPage,
                    totalPages: totalPages,
                    totalEntries: totalEntries,
                    startIndex: startIndex,
                    endIndex: endIndex,
                    onFirstPage: _currentPage > 1 ? () { setState(() { _currentPage = 1; }); } : null,
                    onPreviousPage: _currentPage > 1 ? () { setState(() { _currentPage--; }); } : null,
                    onNextPage: _currentPage < totalPages ? () { setState(() { _currentPage++; }); } : null,
                    onLastPage: _currentPage < totalPages ? () { setState(() { _currentPage = totalPages; }); } : null,
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          }
        },
      ),
    );
  }
}