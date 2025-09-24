import 'package:flutter/material.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../widgets/app_buttons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

// =========================================================================
// AUDIT ENTRY DATA MODEL
// =========================================================================
class AuditEntry {
  final String type;
  final String action;
  final String date;
  final String details;
  final String? userId; // Add user identifier

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
      userId: json['userId'] as String?, // Parse user ID
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
// RECENT AUDITS TABLE WIDGET (Simplified version)
// =========================================================================
class RecentAuditsTable extends StatelessWidget {
  final List<AuditEntry> entries;
  final Function(AuditEntry) onDetailsPressed;

  const RecentAuditsTable({
    Key? key,
    required this.entries,
    required this.onDetailsPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
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
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: app_colors.AppColors.primary,
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
                      fontSize: 12,
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
                      fontSize: 12,
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
                      fontSize: 12,
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
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Table Rows
          ...entries.map((entry) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: entries.indexOf(entry).isEven
                    ? Colors.white
                    : Colors.grey.shade50,
                border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 3,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: entry.getTypeColor(),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        entry.type,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0),
                      child: Text(
                        entry.action,
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0),
                      child: Text(
                        entry.date,
                        style: const TextStyle(fontSize: 11),
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
                          size: 14,
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

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(home: const HomePage());
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _counter = 0;
  Map<String, dynamic>? userData;
  List<AuditEntry> recentAudits = [];

  @override
  void initState() {
    super.initState();
    loadUserData();
  }

  Future<void> loadUserData() async {
    final String jsonString = await rootBundle.loadString('assets/users.json');
    final List<dynamic> dataList = json.decode(jsonString);
    // For demonstration, use the first user in the list
    final Map<String, dynamic> data = dataList.isNotEmpty
        ? dataList[0] as Map<String, dynamic>
        : {};
    setState(() {
      userData = data;
    });

    // Load audit data after user data is available
    await loadAuditData();
  }

  Future<void> loadAuditData() async {
    try {
      final String jsonString = await rootBundle.loadString(
        'assets/audit_entry.json',
      );
      final List<dynamic> dataList = json.decode(jsonString);
      final List<AuditEntry> allAudits = dataList
          .map((json) => AuditEntry.fromJson(json as Map<String, dynamic>))
          .toList();

      // Filter audits for the current user based on their ID
      final String? currentUserId = userData?['id'] as String?;
      final List<AuditEntry> userAudits = allAudits
          .where((audit) => audit.userId == currentUserId)
          .take(5) // Take only the first 5 entries for recent audits
          .toList();

      setState(() {
        recentAudits = userAudits;
      });
    } catch (e) {
      // Handle error - set empty list
      setState(() {
        recentAudits = [];
      });
    }
  }

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (userData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: (userData!['name'] ?? '').toString().split(' ').first,
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Text(
                  'Home',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Montserrat', // Use your app font here
                  ),
                ),
              ),
              AppButtons.main(
                text: 'Locations',
                subTitle: 'Tag the location',
                size: 80,
                textColor: app_colors.AppColors.white,
                color: app_colors.AppColors.primary,
                icon: Icon(
                  Icons.location_on,
                  color: app_colors.AppColors.white,
                ),
                onPressed: () {
                  // Navigate to location page
                },
              ),
              Padding(
                padding: const EdgeInsets.only(top: 16.0, bottom: 16.0),
                child: AppButtons.main(
                  text: 'Accounts',
                  subTitle: 'Manage User Accounts',
                  size: 80,
                  textColor: app_colors.AppColors.white,
                  color: app_colors.AppColors.primary,
                  icon: Icon(Icons.person, color: app_colors.AppColors.white),
                  onPressed: () {
                    // Navigate to location page
                  },
                ),
              ),

              // Your Recent Audits Section
              Padding(
                padding: const EdgeInsets.only(top: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header with lines on both sides
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(height: 1, color: Colors.black),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16.0),
                            child: Text(
                              'Your Recent Audits',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Container(height: 1, color: Colors.black),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Audit Table - Always show header
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20.0),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
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
                          // Table Header - Always show
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: const BoxDecoration(
                              color: app_colors.AppColors.primary,
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(8),
                              ),
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
                                      fontSize: 12,
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
                                      fontSize: 12,
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
                                      fontSize: 12,
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
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Table Content or Empty State
                          if (recentAudits.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(32),
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.vertical(
                                  bottom: Radius.circular(8),
                                ),
                              ),
                              child: const Center(
                                child: Text(
                                  'No recent audits found',
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
                            ...recentAudits.map((entry) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: recentAudits.indexOf(entry).isEven
                                      ? Colors.white
                                      : Colors.grey.shade50,
                                  border: Border(
                                    bottom: BorderSide(
                                      color: Colors.grey.shade200,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Expanded(
                                      flex: 3,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: entry.getTypeColor(),
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          entry.type,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 4,
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8.0,
                                        ),
                                        child: Text(
                                          entry.action,
                                          style: const TextStyle(fontSize: 11),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 3,
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8.0,
                                        ),
                                        child: Text(
                                          entry.date,
                                          style: const TextStyle(fontSize: 11),
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
                                            size: 14,
                                            color: Colors.grey.shade600,
                                          ),
                                          onPressed: () {
                                            ScaffoldMessenger.of(
                                              context,
                                            ).showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                  'Details: ${entry.details}',
                                                ),
                                              ),
                                            );
                                          },
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
                    ),

                    // Results count (only show if there are audits)
                    if (recentAudits.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 20.0),
                        padding: const EdgeInsets.all(12.0),
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
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '1-${recentAudits.length} of ${recentAudits.length} Results',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      //nav bar
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 0,
        role: NavBarRole.admin,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
