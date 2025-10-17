import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_fonts.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/navigation_bar.dart';
import '../widgets/app_buttons.dart';
import '../widgets/gradient_header_app_bar.dart';
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../widgets/custom_text_field.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class UserProfilePage extends StatefulWidget {
  final String role;
  const UserProfilePage({Key? key, required this.role}) : super(key: key);

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  bool isEditing = false;
  String avatarPath = 'assets/avatar.png';
  String? selectedImagePath; // For uploaded avatar
  final ImagePicker _picker = ImagePicker();

  // User data loaded from JSON
  Map<String, dynamic>? userData;

  // Form controllers
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final phoneController = TextEditingController();
  final dobController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

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
      nameController.text = userData?['fullName'] ?? '';
      emailController.text = userData?['email'] ?? '';
      phoneController.text = userData?['phoneNumber'] ?? '';
      dobController.text = userData?['dateOfBirth'] ?? '';
      avatarPath = userData?['avatarUrl'] ?? avatarPath;
    });
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    dobController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
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
                        setState(() {
                          selectedImagePath = image.path;
                        });
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
                        setState(() {
                          selectedImagePath = image.path;
                        });
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
    if (userData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Welcome back',
        user: (userData!['fullName'] ?? '').toString().split(' ').first,
        showBackButton: false, // Remove back button
        showBranding: true, // Show simplified branding
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              const SizedBox(height: 16),
              // Avatar
              GestureDetector(
                onTap: isEditing ? openImageCropModal : null,
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundImage: selectedImagePath != null
                          ? FileImage(File(selectedImagePath!))
                          : AssetImage(avatarPath) as ImageProvider,
                    ),
                    if (isEditing)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
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
                  ],
                ),
              ),
              if (!isEditing) ...[
                // Preview Mode
                const SizedBox(height: 16),
                Text(
                  userData!['fullName'] ?? '',
                  style: AppFonts.titleStyle.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                AppButtons(
                  text: 'Edit Profile',
                  size: 44,
                  textColor: Colors.white,
                  backgroundColor: app_colors.AppColors.primary,
                  borderColor: app_colors.AppColors.primary,
                  icon: const Icon(Icons.edit, color: Colors.white),
                  onPressed: () => setState(() => isEditing = true),
                  textStyle: AppFonts.labelStyle.copyWith(
                    fontSize: 16,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: app_colors.AppColors.neutral.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: app_colors.AppColors.neutral.withOpacity(0.25),
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
              ] else ...[
                // Edit Mode
                Padding(
                  padding: const EdgeInsets.only(top: 8.0, bottom: 8.0),
                  child: Text(
                    'Set up your personal status',
                    style: AppFonts.labelStyle.copyWith(
                      fontWeight: FontWeight.bold,
                      color: app_colors.AppColors.primary,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CustomTextField(
                        controller: nameController,
                        label: 'Full Name',
                        hint: 'Enter your name...',
                      ),
                      const SizedBox(height: 16),
                      CustomTextField(
                        controller: emailController,
                        label: 'Email Address',
                        hint: 'Enter your email...',
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              controller: phoneController,
                              label: 'Phone Number',
                              hint: 'Enter no.',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: CustomTextField(
                              controller: dobController,
                              label: 'Date of birth',
                              hint: 'MM/DD/YYYY',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      CustomTextField(
                        controller: passwordController,
                        label: 'Password',
                        hint: 'Enter your password',
                        obscure: true,
                      ),
                      const SizedBox(height: 16),
                      CustomTextField(
                        controller: confirmPasswordController,
                        label: 'Confirm Password',
                        hint: 'Enter your password',
                        obscure: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(
                            color: app_colors.AppColors.error,
                            width: 1.5,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        onPressed: () => setState(() => isEditing = false),
                        child: Text(
                          'Cancel',
                          style: AppFonts.labelStyle.copyWith(
                            color: app_colors.AppColors.error,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: app_colors.AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        onPressed: () {
                          setState(() => isEditing = false);
                        },
                        child: Text(
                          'Confirm',
                          style: AppFonts.labelStyle.copyWith(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
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
