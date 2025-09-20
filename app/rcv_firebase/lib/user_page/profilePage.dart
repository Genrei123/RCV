import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/app_buttons.dart';
import '../widgets/navigation_bar.dart';
import '../services/profile_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({Key? key}) : super(key: key);

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dateOfBirthController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;
  bool _hasChanges = false;
  
  Map<String, dynamic> _profileData = {};

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);
    try {
      _profileData = await ProfileService.loadProfileData();
      _fullNameController.text = _profileData['fullName'] ?? '';
      _emailController.text = _profileData['email'] ?? '';
      _phoneController.text = _profileData['phoneNumber'] ?? '';
      _dateOfBirthController.text = _profileData['dateOfBirth'] ?? '';
      _passwordController.text = _profileData['password'] ?? '';
      _confirmPasswordController.text = _profileData['confirmPassword'] ?? '';
    } catch (e) {
      print('Error loading profile data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final profileData = {
        'fullName': _fullNameController.text,
        'email': _emailController.text,
        'phoneNumber': _phoneController.text,
        'dateOfBirth': _dateOfBirthController.text,
        'password': _passwordController.text,
        'confirmPassword': _confirmPasswordController.text,
      };

      final success = await ProfileService.saveProfileData(profileData);
      if (success) {
        setState(() => _hasChanges = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved successfully!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save profile. Please try again.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _onFieldChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      _dateOfBirthController.text = picked.toIso8601String().split('T')[0];
      _onFieldChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GradientHeaderAppBar(
        greeting: 'Profile',
        user: 'Edit your information',
        onBack: () => Navigator.of(context).pop(),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile Picture Section
                    Center(
                      child: Stack(
                        children: [
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: app_colors.AppColors.muted,
                              border: Border.all(
                                color: app_colors.AppColors.primary,
                                width: 3,
                              ),
                            ),
                            child: const Icon(
                              LucideIcons.user,
                              size: 60,
                              color: Colors.grey,
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: app_colors.AppColors.primary,
                              ),
                              child: IconButton(
                                icon: const Icon(
                                  LucideIcons.camera,
                                  color: Colors.white,
                                  size: 18,
                                ),
                                onPressed: () {
                                  // TODO: Implement image picker
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Image picker coming soon!')),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Form Fields
                    _buildTextField(
                      controller: _fullNameController,
                      label: 'Full Name',
                      icon: LucideIcons.user,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your full name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      controller: _emailController,
                      label: 'Email',
                      icon: LucideIcons.mail,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your email';
                        }
                        if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                          return 'Please enter a valid email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      icon: LucideIcons.phone,
                      keyboardType: TextInputType.phone,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your phone number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      controller: _dateOfBirthController,
                      label: 'Date of Birth',
                      icon: LucideIcons.calendar,
                      readOnly: true,
                      onTap: _selectDate,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please select your date of birth';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      controller: _passwordController,
                      label: 'Password',
                      icon: LucideIcons.lock,
                      obscureText: !_isPasswordVisible,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isPasswordVisible ? LucideIcons.eyeOff : LucideIcons.eye,
                        ),
                        onPressed: () {
                          setState(() => _isPasswordVisible = !_isPasswordVisible);
                        },
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        if (value.length < 6) {
                          return 'Password must be at least 6 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    _buildTextField(
                      controller: _confirmPasswordController,
                      label: 'Confirm Password',
                      icon: LucideIcons.lock,
                      obscureText: !_isConfirmPasswordVisible,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isConfirmPasswordVisible ? LucideIcons.eyeOff : LucideIcons.eye,
                        ),
                        onPressed: () {
                          setState(() => _isConfirmPasswordVisible = !_isConfirmPasswordVisible);
                        },
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please confirm your password';
                        }
                        if (value != _passwordController.text) {
                          return 'Passwords do not match';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),

                    // Save Button
                    AppButtons.main(
                      text: 'Save Changes',
                      size: 50,
                      textColor: Colors.white,
                      color: app_colors.AppColors.primary,
                      icon: const Icon(LucideIcons.save, color: Colors.white),
                      onPressed: _hasChanges ? _saveProfile : null,
                    ),
                    const SizedBox(height: 16),

                    // Clear Data Button
                    AppButtons.outline(
                      text: 'Clear All Data',
                      size: 50,
                      textColor: app_colors.AppColors.error,
                      outlineColor: app_colors.AppColors.error,
                      icon: const Icon(LucideIcons.trash2, color: app_colors.AppColors.error),
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Clear All Data'),
                            content: const Text('Are you sure you want to clear all profile data? This action cannot be undone.'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(context).pop(),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  Navigator.of(context).pop();
                                  await ProfileService.clearProfileData();
                                  _loadProfileData();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Profile data cleared')),
                                  );
                                },
                                child: const Text('Clear', style: TextStyle(color: Colors.red)),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 4,
        role: NavBarRole.user,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    bool readOnly = false,
    Widget? suffixIcon,
    VoidCallback? onTap,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      readOnly: readOnly,
      onTap: onTap,
      onChanged: (_) => _onFieldChanged(),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: app_colors.AppColors.primary),
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: app_colors.AppColors.primary, width: 2),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dateOfBirthController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }
}
