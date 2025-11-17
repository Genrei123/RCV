import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import '../services/user_profile_service.dart';
import '../services/auth_service.dart';
import '../services/audit_log_service.dart';
import '../widgets/navigation_bar.dart';
import '../widgets/title_logo_header_app_bar.dart';
import 'edit_profile_page.dart';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_constants.dart';
import '../utils/tab_history.dart';

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

    setState(() {
      _userData = userData;
      _isLoading = false;
    });

    // After user data is loaded, refresh local avatar for this specific user
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
      // Log the logout action
      await AuditLogService.logLogout();

      // Perform logout
      await _authService.logout();

      // Navigate to login page
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    }
  }

  Future<void> _navigateToEditProfile() async {
    if (_userData == null) return;

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditProfilePage(userData: _userData!),
      ),
    );

    // Reload profile if edited
    if (result == true) {
      await _loadUserProfile();
      await _loadLocalAvatar();
    }
  }

  String _getRoleDisplayName(String? role) {
    if (role == null) return 'User';
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'Administrator';
      case 'AGENT':
        return 'Agent';
      case 'USER':
      default:
        return 'User';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return WillPopScope(
        onWillPop: () async {
          // Navigate back to previous tab if available
          final prev = TabHistory.instance.popAndGetPrevious();
          if (prev != null &&
              prev >= 0 &&
              prev < AppBottomNavBar.routes.length) {
            Navigator.pushReplacementNamed(
              context,
              AppBottomNavBar.routes[prev],
            );
            return false;
          }
          return true;
        },
        child: Scaffold(
          appBar: const TitleLogoHeaderAppBar(
            title: 'User Profile',
            showBackButton: false,
          ),
          body: const Center(child: CircularProgressIndicator()),
          bottomNavigationBar: AppBottomNavBar(
            selectedIndex: 4, // Profile tab
            role: NavBarRole.user,
          ),
        ),
      );
    }

    if (_userData == null) {
      return Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'User Profile',
          showBackButton: false,
        ),
        body: Center(
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
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: 4, // Profile tab
          role: NavBarRole.user,
        ),
      );
    }

    final String firstName = _userData!['firstName'] ?? '';
    final String? middleName = _userData!['middleName'];
    final String lastName = _userData!['lastName'] ?? '';
    final String? extName = _userData!['extName'];
    final String email = _userData!['email'] ?? '';
    final String location = _userData!['location'] ?? 'Not specified';
    final String role = _getRoleDisplayName(_userData!['role']);
    final String badgeId = _userData!['badgeId'] ?? 'N/A';

    // Build full name
    String fullName = firstName;
    if (middleName != null && middleName.isNotEmpty) {
      fullName += ' $middleName';
    }
    fullName += ' $lastName';
    if (extName != null && extName.isNotEmpty) {
      fullName += ' $extName';
    }

    return WillPopScope(
      onWillPop: () async {
        final prev = TabHistory.instance.popAndGetPrevious();
        if (prev != null && prev >= 0 && prev < AppBottomNavBar.routes.length) {
          Navigator.pushReplacementNamed(context, AppBottomNavBar.routes[prev]);
          return false;
        }
        return true;
      },
      child: Scaffold(
        appBar: const TitleLogoHeaderAppBar(
          title: 'User Profile',
          showBackButton: false,
        ),
        body: RefreshIndicator(
          onRefresh: _loadUserProfile,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar with border
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Builder(
                        builder: (context) {
                          final String? avatarUrl = _userData?['avatarUrl'];
                          final bool hasRemote =
                              avatarUrl != null && avatarUrl.isNotEmpty;
                          if (hasRemote) {
                            // If backend serves under /api/v1/uploads too, we can prefix with base URL
                            final String base =
                                ApiConstants.baseUrl; // ends with /api/v1
                            final String absolute = avatarUrl.startsWith('http')
                                ? avatarUrl
                                : (base +
                                      (avatarUrl.startsWith('/')
                                          ? avatarUrl
                                          : '/$avatarUrl'));
                            return ClipOval(
                              child: Image.network(
                                absolute,
                                width: 128,
                                height: 128,
                                fit: BoxFit.cover,
                              ),
                            );
                          } else if (_localAvatarPath != null) {
                            return ClipOval(
                              child: Image.file(
                                File(_localAvatarPath!),
                                width: 128,
                                height: 128,
                                fit: BoxFit.cover,
                              ),
                            );
                          } else {
                            return ClipOval(
                              child: SvgPicture.asset(
                                "assets/landinglogo.svg",
                                width: 128,
                                height: 128,
                                fit: BoxFit.cover,
                              ),
                            );
                          }
                        },
                      ),
                      Container(
                        width: 128,
                        height: 128,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.primary,
                            width: 4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Name
                Center(
                  child: Text(
                    fullName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 4),

                // Role
                Center(
                  child: Text(
                    role,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.normal,
                      color: Colors.black54,
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Edit Profile Button
                Center(
                  child: SizedBox(
                    width: 200,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: _navigateToEditProfile,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SvgPicture.string(
                            '''
                          <svg xmlns="http://www.w3.org/2000/svg"
                            width="20" height="20" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round"
                            class="lucide lucide-pencil">
                            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                            <path d="m15 5 4 4"/>
                          </svg>
                          ''',
                            colorFilter: const ColorFilter.mode(
                              Colors.white,
                              BlendMode.srcIn,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "Edit Profile",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Profile Details Container
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Email",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.normal,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Location",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        location,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.normal,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Badge ID",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        badgeId,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.normal,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Logout Button
                Center(
                  child: SizedBox(
                    width: 200,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: _handleLogout,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SvgPicture.string(
                            '''
                          <svg xmlns="http://www.w3.org/2000/svg"
                            width="20" height="20" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round"
                            class="lucide lucide-log-out">
                            <path d="m16 17 5-5-5-5"/>
                            <path d="M21 12H9"/>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          </svg>
                          ''',
                            colorFilter: const ColorFilter.mode(
                              Colors.white,
                              BlendMode.srcIn,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "Logout",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: AppBottomNavBar(
          selectedIndex: 4, // Profile tab
          role: NavBarRole.user,
        ),
      ),
    );
  }
}
