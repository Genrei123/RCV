import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/navigation_bar.dart';
import '../widgets/app_buttons.dart';
import '../widgets/title_logo_header_app_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/crop_image_widget.dart';
import '../services/remote_config_service.dart';
import '../widgets/feature_disabled_screen.dart';

class UserProfilePage extends StatefulWidget {
  final String role;
  const UserProfilePage({super.key, required this.role});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  String avatarPath = 'assets/avatar.png';
  String? selectedImagePath; // For uploaded avatar
  final ImagePicker _picker = ImagePicker();

  // User data loaded from JSON
  Map<String, dynamic>? userData;

  @override
  void initState() {
    super.initState();
    loadUserData();
    _loadLocalAvatar();
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
      avatarPath = userData?['avatarUrl'] ?? avatarPath;
    });
  }

  void openImageCropModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          height: 200,
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(
                'Choose Avatar Source',
                style: AppFonts.titleStyle.copyWith(fontSize: 18),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton.icon(
                    onPressed: () async {
                      Navigator.pop(context);
                      final XFile? image = await _picker.pickImage(
                        source: ImageSource.camera,
                      );
                      if (image != null) {
                        await _showAvatarCropDialog(image.path);
                      }
                    },
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Camera'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: app_colors.AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () async {
                      Navigator.pop(context);
                      final XFile? image = await _picker.pickImage(
                        source: ImageSource.gallery,
                      );
                      if (image != null) {
                        await _showAvatarCropDialog(image.path);
                      }
                    },
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Gallery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: app_colors.AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showAvatarCropDialog(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) return;
      final Uint8List bytes = await file.readAsBytes();
      if (!mounted) return;

      final Uint8List? cropped = await showImageCropperDialog(
        context,
        imageBytes: bytes,
        title: 'Crop Avatar',
        withCircleUi: true,
        aspectRatio: 1,
        headerColor: app_colors.AppColors.primary,
      );

      if (cropped != null) {
        // Persist cropped avatar to app documents directory (unique filename)
        final docsDir = await getApplicationDocumentsDirectory();
        final avatarDir = Directory('${docsDir.path}/avatars');
        if (!await avatarDir.exists()) {
          await avatarDir.create(recursive: true);
        }
        final prefs = await SharedPreferences.getInstance();
        final prevPath = prefs.getString(_avatarLocalKey);
        final newPath =
            '${avatarDir.path}/profile_avatar_${DateTime.now().millisecondsSinceEpoch}.png';
        final out = File(newPath);
        await out.writeAsBytes(cropped, flush: true);
        // Clean up previous saved avatar if different
        if (prevPath != null && prevPath.isNotEmpty && prevPath != newPath) {
          final prevFile = File(prevPath);
          if (await prevFile.exists()) {
            try {
              await prevFile.delete();
            } catch (_) {}
          }
        }
        // Save new path to local storage so it persists across sessions
        await prefs.setString(_avatarLocalKey, out.path);
        if (!mounted) return;
        setState(() {
          selectedImagePath = out.path;
        });
      }
    } catch (e) {
      // ignore: avoid_print
      print('Crop dialog error: $e');
    }
  }

  static const String _avatarLocalKey = 'profile_avatar_path';

  Future<void> _loadLocalAvatar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedPath = prefs.getString(_avatarLocalKey);
      if (savedPath != null && savedPath.isNotEmpty) {
        final f = File(savedPath);
        if (await f.exists()) {
          if (!mounted) return;
          setState(() {
            selectedImagePath = savedPath;
          });
        }
      }
    } catch (e) {
      // ignore: avoid_print
      print('Load local avatar error: $e');
    }
  }

  // Note: Avatar removal flow can be added if needed (e.g., long-press to reset).

  void _logout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: app_colors.AppColors.error,
              foregroundColor: app_colors.AppColors.white,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    //Feature disable checker
    if (RemoteConfigService.isFeatureDisabled('disable_profile_page')) {
      return FeatureDisabledScreen(
        featureName: 'Profile',
        icon: Icons.person,
        selectedNavIndex: 4,
        navBarRole: NavBarRole.user,
      );
    }

    if (userData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: const TitleLogoHeaderAppBar(
        title: 'User Profile',
        showBackButton: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              const SizedBox(height: 16),
              // Avatar
              GestureDetector(
                onTap: openImageCropModal,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Builder(
                      builder: (context) {
                        // Decide what to display: file image, asset image, or placeholder icon
                        final bool hasLocalFile = selectedImagePath != null;
                        final bool hasCustomAsset =
                            avatarPath.startsWith('assets/') &&
                            avatarPath != 'assets/avatar.png';
                        ImageProvider? bgImage;
                        if (hasLocalFile) {
                          bgImage = FileImage(File(selectedImagePath!));
                        } else if (hasCustomAsset) {
                          bgImage = AssetImage(avatarPath);
                        } else {
                          bgImage = null; // use placeholder icon
                        }
                        return CircleAvatar(
                          radius: 48,
                          backgroundColor: app_colors.AppColors.neutral
                              .withValues(alpha: 0.2),
                          backgroundImage: bgImage,
                          child: bgImage == null
                              ? Icon(
                                  Icons.person,
                                  size: 42,
                                  color: app_colors.AppColors.darkNeutral,
                                )
                              : null,
                        );
                      },
                    ),
                    // Always show a camera icon on the right side for quick access
                    Positioned(
                      right: -8,
                      top: 0,
                      bottom: 0,
                      child: Material(
                        color: Colors.transparent,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: openImageCropModal,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: app_colors.AppColors.primary,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                userData!['fullName'] ?? '',
                style: AppFonts.titleStyle.copyWith(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Tap the camera icon to change your profile picture',
                style: AppFonts.labelStyle.copyWith(
                  fontSize: 12,
                  color: app_colors.AppColors.darkNeutral,
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: app_colors.AppColors.neutral.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: app_colors.AppColors.neutral.withValues(alpha: 0.25),
                      blurRadius: 8,
                      spreadRadius: 2,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(
                    color: app_colors.AppColors.primary,
                    width: 1.5,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Location',
                      style: AppFonts.labelStyle.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      userData!['location'] ?? '',
                      style: AppFonts.contentStyle.copyWith(fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Date of Birth',
                      style: AppFonts.labelStyle.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      userData!['dateOfBirth'] ?? '',
                      style: AppFonts.contentStyle.copyWith(fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Email',
                      style: AppFonts.labelStyle.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      userData!['email'] ?? '',
                      style: AppFonts.contentStyle.copyWith(fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Phone Number',
                      style: AppFonts.labelStyle.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      userData!['phoneNumber'] ?? '',
                      style: AppFonts.contentStyle.copyWith(fontSize: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppButtons(
                text: 'Log Out',
                size: 44,
                textColor: Colors.white,
                backgroundColor: Colors.redAccent,
                borderColor: Colors.redAccent,
                icon: const Icon(Icons.logout, color: Colors.white),
                onPressed: _logout,
                textStyle: AppFonts.labelStyle.copyWith(
                  fontSize: 16,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 4,
        role: _getNavBarRole(userData!['role']),
      ),
    );
  }

  NavBarRole _getNavBarRole(String? role) {
    switch (role) {
      case 'admin':
        return NavBarRole.admin;
      case 'user':
        return NavBarRole.user;
      default:
        return NavBarRole.user;
    }
  }
}
