// lib/pages/audit_trail.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:rcv_firebase/themes/app_colors.dart';
// import 'package:qr_flutter/qr_flutter.dart'; // Removed as QR table is removed

// =========================================================================
// AUDIT ENTRY DATA MODEL
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
// CUSTOM NAVBAR COMPONENT
// =========================================================================
class CustomNavbar extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onItemTapped;

  const CustomNavbar({
    Key? key,
    required this.selectedIndex,
    required this.onItemTapped,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      items: <BottomNavigationBarItem>[
        const BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined),
          activeIcon: Icon(Icons.home),
          label: 'Home',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.fact_check_outlined),
          activeIcon: Icon(Icons.fact_check),
          label: 'Audit',
        ),
        BottomNavigationBarItem(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 30),
          ),
          label: '',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.bar_chart_outlined),
          activeIcon: Icon(Icons.bar_chart),
          label: 'Reports',
        ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.person_outlined),
          activeIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
      currentIndex: selectedIndex,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: Colors.grey.shade600,
      showUnselectedLabels: true,
      onTap: onItemTapped,
      type: BottomNavigationBarType.fixed,
      backgroundColor: Colors.white,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
    );
  }
}

// =========================================================================
// MAIN ENTRY POINT FOR THIS STANDALONE FILE
// =========================================================================
void main() {
  runApp(const AuditTrailAppWrapper());
}

class AuditTrailAppWrapper extends StatelessWidget {
  const AuditTrailAppWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'RCV Audit Trail',
      theme: ThemeData(
        primaryColor: AppColors.primary,
        hintColor: AppColors.secondary,
        fontFamily: 'Roboto',
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const AuditTrailMainPage(),
    );
  }
}

// =========================================================================
// AUDIT TRAIL MAIN PAGE UI
// =========================================================================
class AuditTrailMainPage extends StatefulWidget {
  const AuditTrailMainPage({super.key});

  @override
  State<AuditTrailMainPage> createState() => _AuditTrailMainPageState();
}

class _AuditTrailMainPageState extends State<AuditTrailMainPage> {
  int _selectedIndex = 1;

  late Future<List<AuditEntry>> _auditLogFuture;
  int _currentPage = 1;
  final int _itemsPerPage = 10;

  @override
  void initState() {
    super.initState();
    _auditLogFuture = _loadAuditData();
  }

  Future<List<AuditEntry>> _loadAuditData() async {
    final String response =
        await rootBundle.loadString('assets/data/audit_trail_data.json');
    final data = jsonDecode(response);
    if (data != null && data['auditLog'] is List) {
      return (data['auditLog'] as List)
          .map((item) => AuditEntry.fromJson(item))
          .toList();
    }
    return [];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  // New function to show the modal with details
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

  // Helper function to build a single detail row
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
    String currentTabTitle;
    switch (_selectedIndex) {
      case 0:
        currentTabTitle = 'Home';
        break;
      case 1:
        currentTabTitle = 'Audit';
        break;
      case 2:
        currentTabTitle = 'Action';
        break;
      case 3:
        currentTabTitle = 'Reports';
        break;
      case 4:
        currentTabTitle = 'Profile';
        break;
      default:
        currentTabTitle = 'Audit';
    }

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Custom Header Section
            Container(
              height: 150,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.secondary.withOpacity(0.8)
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: -20,
                    right: -20,
                    child: Icon(Icons.check_circle_outline,
                        size: 150, color: Colors.white.withOpacity(0.3)),
                  ),
                  const Padding(
                    padding: EdgeInsets.only(left: 20, top: 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome Back',
                          style: TextStyle(color: Colors.white, fontSize: 16),
                        ),
                        SizedBox(height: 5),
                        Text(
                          'User',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Tab Indicator (The grey bar with "Home" / "Audit" text)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              color: Colors.grey.shade200,
              alignment: Alignment.centerLeft,
              child: Text(
                currentTabTitle,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87),
              ),
            ),

            // Conditionally show content based on selected tab
            if (_selectedIndex == 1) ...[
              // Locations Card
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Card(
                  color: AppColors.primary,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 4,
                  child: const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Locations',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold)),
                              SizedBox(height: 4),
                              Text('Tag the location',
                                  style: TextStyle(
                                      color: Colors.white70, fontSize: 14)),
                            ],
                          ),
                        ),
                        Icon(Icons.location_on, color: Colors.white, size: 40),
                      ],
                    ),
                  ),
                ),
              ),

              // Today's Audit section title
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Text(
                  "Today's Audit",
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87),
                ),
              ),

              // Audit Trail Table
              FutureBuilder<List<AuditEntry>>(
                future: _auditLogFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  } else if (snapshot.hasError) {
                    return Center(child: Text('Error: ${snapshot.error}'));
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(
                        child: Text('No audit log entries found.'));
                  } else {
                    final allEntries = snapshot.data!;
                    final totalEntries = allEntries.length;
                    final totalPages = (totalEntries / _itemsPerPage).ceil();

                    final startIndex = (_currentPage - 1) * _itemsPerPage;
                    final endIndex =
                        (_currentPage * _itemsPerPage).clamp(0, totalEntries);
                    final currentEntries =
                        allEntries.sublist(startIndex, endIndex);

                    return Column(
                      children: [
                        // Table Header
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16.0),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(8)),
                          ),
                          child: const Row(
                            children: [
                              Expanded(
                                  flex: 3, // Increased flex for 'Type'
                                  child: Text('Type',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          fontSize: 11))), // Reduced font size for header
                              Expanded(
                                  flex: 4, // Adjusted flex for 'Action'
                                  child: Text('Action',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          fontSize: 11))), // Reduced font size for header
                              Expanded(
                                  flex: 3, // Adjusted flex for 'Date'
                                  child: Text('Date',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                          fontSize: 11))), // Reduced font size for header
                              Expanded(
                                  flex: 2,
                                  child: Align(
                                      alignment: Alignment.centerRight,
                                      child: Text('Details',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                              fontSize: 11)))), // Reduced font size for header
                            ],
                          ),
                        ),
                        // Table Rows
                        ...currentEntries.map((entry) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16.0),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: currentEntries.indexOf(entry).isEven
                                  ? Colors.white
                                  : Colors.grey.shade50,
                              border: Border(
                                  bottom:
                                      BorderSide(color: Colors.grey.shade200)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center, // Align items vertically
                              children: [
                                Expanded(
                                  flex: 3, // Increased flex for 'Type'
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 4, vertical: 2), // Reduced padding
                                    decoration: BoxDecoration(
                                      color: entry.getTypeColor(),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      entry.type,
                                      style: const TextStyle(
                                          color: Colors.white, fontSize: 9), // Further reduced font size
                                      textAlign: TextAlign.center, // Center text in badge
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 4, // Adjusted flex for 'Action'
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                                    child: Text(entry.action,
                                        style: const TextStyle(fontSize: 10), // Reduced font size
                                        // Removed overflow ellipsis
                                        ),
                                  ),
                                ),
                                Expanded(
                                  flex: 3, // Adjusted flex for 'Date'
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                                    child: Text(entry.date,
                                        style: const TextStyle(fontSize: 10), // Reduced font size
                                        // Removed overflow ellipsis
                                        ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Align(
                                    alignment: Alignment.centerRight,
                                    child: IconButton(
                                      icon: Icon(Icons.arrow_forward_ios,
                                          size: 12, // Further smaller icon
                                          color: Colors.grey.shade600),
                                      onPressed: () => _showDetailsModal(entry),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),

                        // Pagination Controls
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16.0),
                          padding: const EdgeInsets.all(8.0), // Further reduced padding for pagination
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: const BorderRadius.vertical(
                                bottom: Radius.circular(8)),
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
                              Flexible( // Use Flexible to prevent overlap on results text
                                child: Text(
                                  '${startIndex + 1}-${endIndex} of $totalEntries Results', // More compact text
                                  style: const TextStyle(
                                      fontSize: 10, color: Colors.grey), // Match smaller table font
                                  overflow: TextOverflow.ellipsis, // Allow ellipsis for results if very long
                                ),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min, // Ensure row only takes needed space
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.skip_previous,
                                        size: 16), // Smaller icon
                                    onPressed: _currentPage > 1
                                        ? () {
                                            setState(() {
                                              _currentPage = 1;
                                            });
                                          }
                                        : null,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.chevron_left,
                                        size: 16), // Smaller icon
                                    onPressed: _currentPage > 1
                                        ? () {
                                            setState(() {
                                              _currentPage--;
                                            });
                                          }
                                        : null,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 7, vertical: 2), // Smaller padding
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '$_currentPage',
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10), // Match smaller table font
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.chevron_right,
                                        size: 16), // Smaller icon
                                    onPressed: _currentPage < totalPages
                                        ? () {
                                            setState(() {
                                              _currentPage++;
                                            });
                                          }
                                        : null,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.skip_next,
                                        size: 16), // Smaller icon
                                    onPressed: _currentPage < totalPages
                                        ? () {
                                            setState(() {
                                              _currentPage = totalPages;
                                            });
                                          }
                                        : null,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    );
                  }
                },
              ),
            ] else ...[
              // Placeholder content for other tabs if they are selected
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Center(
                  child: Text(
                    '$currentTabTitle Page Content',
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: CustomNavbar(
        selectedIndex: _selectedIndex,
        onItemTapped: _onItemTapped,
      ),
    );
  }
}