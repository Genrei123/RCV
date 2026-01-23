import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import '../services/user_profile_service.dart';
import '../services/auth_service.dart';
import '../services/audit_log_service.dart';
import '../widgets/navigation_bar.dart';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_constants.dart';
import '../utils/tab_history.dart';
import '../services/draft_service.dart';
import 'compliance_report_page.dart';

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  Map<String, dynamic>? _userData;
  bool _isLoading = true;
  final AuthService _authService = AuthService();
  String? _localAvatarPath;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    setState(() => _isLoading = true);
    final userData = await UserProfileService.getUserProfile();
    if (!mounted) return;
    setState(() {
      _userData = userData;
      _isLoading = false;
    });
    await _loadLocalAvatar();
  }

  String _buildAvatarKey() {
    final id = _userData?['_id']?.toString() ?? _userData?['id']?.toString();
    final email = _userData?['email']?.toString();
    final userKey = (id != null && id.isNotEmpty)
        ? id
        : ((email != null && email.isNotEmpty) ? email : 'default');
    return 'profile_avatar_path_$userKey';
  }

  Future<void> _loadLocalAvatar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedPath = prefs.getString(_buildAvatarKey());
      if (savedPath != null && savedPath.isNotEmpty) {
        final f = File(savedPath);
        if (await f.exists()) {
          if (!mounted) return;
          setState(() => _localAvatarPath = savedPath);
        }
      }
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await AuditLogService.logLogout();
      await _authService.logout();
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    }
  }

  Future<void> _showDrafts() async {
    final drafts = await DraftService.getDrafts();
    
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'My Drafts',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            if (drafts.isEmpty)
              const Expanded(
                child: Center(
                  child: Text(
                    'No saved drafts',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: drafts.length,
                  itemBuilder: (context, index) {
                    final draft = drafts[index];
                    final savedAtStr = draft['savedAt']?.toString();
                    final date = savedAtStr != null ? DateTime.tryParse(savedAtStr) : null;
                    final productName = draft['scannedData']?['productName']?.toString() ?? 'Unknown Product';
                    final draftId = draft['id']?.toString() ?? 'draft_$index';
                    
                    return Dismissible(
                      key: Key(draftId),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        color: Colors.red,
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      confirmDismiss: (direction) async {
                        return await showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Delete Draft'),
                            content: const Text('Are you sure you want to delete this draft?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Delete', style: TextStyle(color: Colors.red)),
                              ),
                            ],
                          ),
                        );
                      },
                      onDismissed: (direction) async {
                        await DraftService.deleteDraft(draft['id']);
                        // Helper to refresh list? No simple way without state, 
                        // but next open will be fresh.
                      },
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: AppColors.primary,
                          child: Icon(Icons.description, color: Colors.white),
                        ),
                        title: Text(productName),
                        subtitle: Text(date != null 
                            ? 'Last saved: ${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}'
                            : 'Date unknown'),
                        onTap: () async {
                          Navigator.pop(context); // Close sheet
                          await _openDraft(draft);
                        },
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openDraft(Map<String, dynamic> draft) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ComplianceReportPage(
          scannedData: draft['scannedData'] ?? {},
          productSearchResult: draft['productSearchResult'] ?? {'found': false},
          initialStatus: draft['initialStatus']?.toString() ?? 'COMPLIANT',
          frontImageUrl: draft['frontImageUrl']?.toString(),
          backImageUrl: draft['backImageUrl']?.toString(),
          localFrontPath: draft['localFrontPath']?.toString(),
          localBackPath: draft['localBackPath']?.toString(),
          draftId: draft['id']?.toString(),
          initialReason: draft['initialReason']?.toString() ?? draft['selectedReason']?.toString(),
          initialNotes: draft['initialNotes']?.toString() ?? draft['notes']?.toString(),
          ocrBlobText: draft['ocrBlobText']?.toString(),
        ),
      ),
    );
    
    // If result is true (submitted), show success
  }

  String _getRoleDisplayName(String? role) {
    if (role == null) return 'User';
    switch (role.toString().toUpperCase()) {
      case 'ADMIN':
        return 'Administrator';
      case 'AGENT':
        return 'Agent';
      default:
        return 'User';
    }
  }

  Widget _buildInfoCard(IconData icon, String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 16, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          final prev = TabHistory.instance.popAndGetPrevious();
          if (prev != null &&
              prev >= 0 &&
              prev < AppBottomNavBar.routes.length) {
            Navigator.pushReplacementNamed(
              context,
              AppBottomNavBar.routes[prev],
            );
          } else {
            Navigator.maybePop(context);
          }
        },
        child: Scaffold(
          body: const SafeArea(
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
      );
    }

    if (_userData == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Failed to load profile',
                  style: TextStyle(fontSize: 18, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadUserProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Loaded state: gradient header + avatar/name/role + edit button + details + logout
    final String firstName = _userData!['firstName'] ?? '';
    final String? middleName = _userData!['middleName'];
    final String lastName = _userData!['lastName'] ?? '';
    final String? extName = _userData!['extName'];
    final String email = _userData!['email'] ?? '';
    final String location = _userData!['location'] ?? 'Not specified';
    final String role = _getRoleDisplayName(_userData!['role']);
    final String badgeId = _userData!['badgeId'] ?? 'N/A';

    String fullName = firstName;
    if (middleName != null && middleName.isNotEmpty) fullName += ' $middleName';
    fullName += ' $lastName';
    if (extName != null && extName.isNotEmpty) fullName += ' $extName';
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
        } else {
          Navigator.maybePop(context);
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                // Header gradient with watermark and title
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.only(top: 44, bottom: 20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary,
                        AppColors.primary.withValues(alpha: 0.9),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Stack(
                    alignment: Alignment.topCenter,
                    children: [
                      Opacity(
                        opacity: 0.08,
                        child: SvgPicture.asset(
                          'assets/landinglogo.svg',
                          width: MediaQuery.of(context).size.width * 1.8,
                          fit: BoxFit.contain,
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'User Profile',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 18),
                          // Avatar
                          Builder(
                            builder: (context) {
                              final String? avatarUrl = _userData?['avatarUrl'];
                              final bool hasRemote =
                                  avatarUrl != null && avatarUrl.isNotEmpty;
                              Widget avatarChild;
                              if (hasRemote) {
                                final String base = ApiConstants.baseUrl;
                                final String absolute =
                                    avatarUrl.startsWith('http')
                                    ? avatarUrl
                                    : (base +
                                          (avatarUrl.startsWith('/')
                                              ? avatarUrl
                                              : '/$avatarUrl'));
                                avatarChild = Image.network(
                                  absolute,
                                  width: 140,
                                  height: 140,
                                  fit: BoxFit.cover,
                                );
                              } else if (_localAvatarPath != null) {
                                avatarChild = Image.file(
                                  File(_localAvatarPath!),
                                  width: 124,
                                  height: 124,
                                  fit: BoxFit.cover,
                                );
                              } else {
                                avatarChild = SvgPicture.asset(
                                  'assets/landinglogo.svg',
                                  width: 124,
                                  height: 124,
                                  fit: BoxFit.cover,
                                );
                              }
                              return Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 136,
                                    height: 136,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.white,
                                    ),
                                  ),
                                  ClipOval(child: avatarChild),
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 16),
                          Text(
                            fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            role,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Edit profile button
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 48),
                            child: SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _showDrafts,
                                icon: const Icon(Icons.folder_open),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                label: const Text(
                                  'My Drafts',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          // Divider with label
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 48),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    height: 2,
                                    color: Colors.white.withValues(alpha: 0.6),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'Your Details',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Container(
                                    height: 2,
                                    color: Colors.white.withValues(alpha: 0.6),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Details directly under the divider
                          const SizedBox(height: 14),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Column(
                              children: [
                                _buildInfoCard(Icons.email_outlined, email),
                                const SizedBox(height: 10),
                                _buildInfoCard(
                                  Icons.location_on_outlined,
                                  location,
                                ),
                                const SizedBox(height: 10),
                                _buildInfoCard(Icons.badge_outlined, badgeId),
                              ],
                            ),
                          ),

                          // Logout button
                          const SizedBox(height: 14),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _handleLogout,
                                icon: const Icon(Icons.logout),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.error,
                                  foregroundColor: AppColors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                label: const Text(
                                  'Log out your account',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
