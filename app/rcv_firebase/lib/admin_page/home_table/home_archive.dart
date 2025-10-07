import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:lucide_icons/lucide_icons.dart';
import '../../widgets/gradient_header_app_bar.dart';
import '../../widgets/navigation_bar.dart';
import '../../widgets/admin_accounts_table.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class HomeArchivedPage extends StatefulWidget {
  const HomeArchivedPage({Key? key}) : super(key: key);

  @override
  State<HomeArchivedPage> createState() => _HomeArchivedPageState();
}

class _HomeArchivedPageState extends State<HomeArchivedPage> {
  List<Map<String, dynamic>> users = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      // Load the JSON file from assets
      final String response = await rootBundle.loadString('assets/admin_accounts_data.json');
      final Map<String, dynamic> data = json.decode(response);
      
      // Convert the JSON data to the format expected by the widget
      final List<dynamic> usersJson = data['users'];
      
      final userData = usersJson.map((user) {
        return {
          'name': user['name'] as String,
          'email': user['email'] as String,
          'role': user['role'] as String,
          'status': user['status'] as String,
          'avatar': user['avatar'] as String,
        };
      }).toList();
      
      setState(() {
        users = userData;
        isLoading = false;
      });
    } catch (e) {
      print('Error loading user data: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  void _showActionsModal(BuildContext context, Map<String, dynamic> user, Offset position) {
    try {
      final double topPosition = position.dy > 0 ? position.dy + 20 : 300;
      final double leftPosition = position.dx > 100 ? position.dx - 120 : MediaQuery.of(context).size.width - 150;
      
      showMenu(
        context: context,
        position: RelativeRect.fromLTRB(
          leftPosition, // Position relative to the clicked three dots
          topPosition, // Position below the specific three dots
          20,
          0,
        ),
        items: [
          PopupMenuItem(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            height: 32,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.unarchive_outlined,
                  color: app_colors.AppColors.darkAccent,
                  size: 14,
                ),
                const SizedBox(width: 6),
                Text(
                  'Undo Archive',
                  style: TextStyle(
                    color: app_colors.AppColors.darkAccent,
                    fontWeight: FontWeight.w500,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
            value: 'undo_archive',
          ),
        ],
      ).then((value) {
        if (value == 'undo_archive') {
          _showUndoArchiveConfirmationDialog(context, user);
        }
      });
    } catch (e) {
      print('Error showing modal: $e');
      // Fallback: show a simple dialog
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Actions'),
          content: Text('Undo Archive'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  void _showUndoArchiveConfirmationDialog(BuildContext context, Map<String, dynamic> user) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.6), // Dark overlay background
      builder: (BuildContext context) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.8, // Match table width
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header with close button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Undo Archived?',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Icon(
                        Icons.close,
                        color: app_colors.AppColors.error,
                        size: 20,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Description
                Text(
                  'This account will be unarchived',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 20),
                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: app_colors.AppColors.darkAccent),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                            color: app_colors.AppColors.darkAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          // Handle unarchive logic here
                          print('Unarchiving user: ${user['name']}');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: app_colors.AppColors.success,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          elevation: 0,
                        ),
                        child: Text(
                          'Unarchive',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: '',
        user: 'Archived Accounts',
        onBack: () => Navigator.pop(context),
        showBackButton: true,
      ),
      body: isLoading 
        ? Center(child: CircularProgressIndicator(color: app_colors.AppColors.primary))
        : Column(
            children: [
              // Header Section with Total Users and Buttons
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.white,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Total Users
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: app_colors.AppColors.primary, width: 1.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.group,
                              color: app_colors.AppColors.primary,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Total Users\n${users.length}',
                              style: TextStyle(fontSize: 11, color: Colors.black, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Search, Filter, Member, and Pending buttons
                    Row(
                      children: [
                        // Search Bar
                        Expanded(
                          flex: 3,
                          child: SizedBox(
                            height: 28,
                            child: TextField(
                              decoration: InputDecoration(
                                hintText: 'Search...',
                                hintStyle: TextStyle(fontSize: 11),
                                prefixIcon: Icon(LucideIcons.search, size: 14),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: app_colors.AppColors.primary),
                                ),
                                contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              ),
                              style: TextStyle(fontSize: 11),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Filter Button
                        SizedBox(
                          height: 28,
                          child: OutlinedButton.icon(
                            onPressed: () {},
                            icon: Icon(LucideIcons.filter, size: 12, color: Colors.black87),
                            label: Text('Filter', style: TextStyle(color: Colors.black87, fontSize: 10)),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: Colors.white,
                              side: BorderSide(color: app_colors.AppColors.primary, width: 1.5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: EdgeInsets.symmetric(horizontal: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Member Button (was Archive)
                        SizedBox(
                          height: 28,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/home-accounts');
                            },
                            child: Text('Member', style: TextStyle(color: Colors.white, fontSize: 10)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: app_colors.AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: EdgeInsets.symmetric(horizontal: 10),
                              elevation: 0,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Pending Button (was Archive)
                        SizedBox(
                          height: 28,
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/home-pending');
                            },
                            child: Text('Pending', style: TextStyle(color: Colors.black, fontSize: 10)),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: Colors.white,
                              side: BorderSide(color: app_colors.AppColors.primary, width: 1.5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: EdgeInsets.symmetric(horizontal: 8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Table Section
              Expanded(
                child: AdminAccountsTable(
                  users: users,
                  onActionTap: (user, position) => _showActionsModal(context, user, position),
                ),
              ),
              // Pagination Section
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('1 to ${users.length} of ${users.length} Results', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {},
                          icon: Icon(LucideIcons.chevronLeft, size: 12),
                          padding: EdgeInsets.zero,
                          constraints: BoxConstraints(minWidth: 20, minHeight: 20),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: app_colors.AppColors.primary,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text('1', style: TextStyle(color: Colors.white, fontSize: 9)),
                        ),
                        IconButton(
                          onPressed: () {},
                          icon: Icon(LucideIcons.chevronRight, size: 12),
                          padding: EdgeInsets.zero,
                          constraints: BoxConstraints(minWidth: 20, minHeight: 20),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 0,
        role: NavBarRole.admin,
      ),
    );
  }
}
