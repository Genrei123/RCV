import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/profile_service.dart';
import '../widgets/gradient_header_app_bar.dart';
import '../widgets/navigation_bar.dart';

class AdminProfilePage extends StatefulWidget {
  const AdminProfilePage({super.key});

  @override
  State<AdminProfilePage> createState() => _AdminProfilePageState();
}

class _AdminProfilePageState extends State<AdminProfilePage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _dobController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  String _selectedRole = 'User';
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isEditing = false;
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    try {
      final Map<String, dynamic> profileData = await ProfileService.loadProfileData();
      
      setState(() {
        _fullNameController.text = profileData['fullName'] ?? '';
        _emailController.text = profileData['email'] ?? '';
        _phoneController.text = profileData['phoneNumber'] ?? '';
        _dobController.text = profileData['dateOfBirth'] ?? '';
        _passwordController.text = profileData['password'] ?? '';
        _confirmPasswordController.text = profileData['confirmPassword'] ?? '';
        _selectedRole = profileData['role'] ?? 'User';
        
        // Load profile image if path exists
        final String? imagePath = profileData['profileImagePath'];
        if (imagePath != null && imagePath.isNotEmpty) {
          _selectedImage = File(imagePath);
        }
      });
    } catch (e) {
      print('Error loading profile data: $e');
    }
  }

  Future<void> _pickDateOfBirth() async {
    final DateTime now = DateTime.now();
    final DateTime firstDate = DateTime(now.year - 100);
    final DateTime lastDate = now;
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 18, now.month, now.day),
      firstDate: firstDate,
      lastDate: lastDate,
    );
    if (picked != null) {
      _dobController.text = '${_getMonthName(picked.month)} ${picked.day}, ${picked.year}';
      setState(() {});
    }
  }

  String _getMonthName(int month) {
    const months = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  void _toggleEdit() {
    setState(() {
      _isEditing = !_isEditing;
    });
  }

  void _cancelEdit() {
    // Reload the original data to discard changes
    _loadProfileData();
    setState(() {
      _isEditing = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Changes cancelled'),
        backgroundColor: Colors.grey,
      ),
    );
  }

  Future<void> _saveChanges() async {
    if (_formKey.currentState?.validate() ?? false) {
      try {
        final Map<String, dynamic> profileData = {
          'fullName': _fullNameController.text,
          'email': _emailController.text,
          'phoneNumber': _phoneController.text,
          'dateOfBirth': _dobController.text,
          'role': _selectedRole,
          'password': _passwordController.text,
          'confirmPassword': _confirmPasswordController.text,
          'profileImagePath': _selectedImage?.path ?? '',
        };

        final bool success = await ProfileService.saveProfileData(profileData);
        
        if (success) {
          setState(() {
            _isEditing = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Update Requested, Wait for approval'),
              backgroundColor: Colors.orange,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to save profile data'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving profile: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 300,
        maxHeight: 300,
        imageQuality: 80,
      );
      
      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error picking image: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: GradientHeaderAppBar(
        greeting: '',
        user: 'Admin Profile',
        showBackButton: false,
      ),
      body: Column(
        children: [
          // Profile picture section
          SafeArea(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Row(
                children: [
                  // Profile picture with border and + button
                  Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Color(0xFF00A86B),
                            width: 3,
                          ),
                        ),
                        child: CircleAvatar(
                          radius: 35,
                          backgroundColor: Colors.white,
                          child: CircleAvatar(
                            radius: 32,
                            backgroundImage: _selectedImage != null 
                                ? FileImage(_selectedImage!) 
                                : AssetImage('assets/profile.jpg') as ImageProvider,
                            onBackgroundImageError: (_, __) {},
                            child: _selectedImage == null 
                                ? Icon(
                                    Icons.person,
                                    size: 40,
                                    color: Colors.grey[400],
                                  )
                                : null,
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: _pickImageFromGallery,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: Color(0xFF00A86B),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              Icons.add,
                              color: Colors.white,
                              size: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(width: 16),
                  // Text content
                  Expanded(
                    child: Text(
                      'Set up your personal status',
                      style: TextStyle(
                        color: Color(0xFF00A86B),
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Form content
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(20),
              child: Container(
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      // Full Name and Role Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildFormField(
                              label: 'Full Name',
                              controller: _fullNameController,
                              readOnly: !_isEditing,
                              validator: (value) => (value == null || value.trim().isEmpty) ? 'Please enter your name' : null,
                            ),
                          ),
                          SizedBox(width: 16),
                          Expanded(
                            child: _buildFormField(
                              label: 'Role',
                              controller: TextEditingController(text: _selectedRole),
                              readOnly: true, // Role is never editable
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 20),
                      
                      // Email Address
                      _buildFormField(
                        label: 'Email Address',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        readOnly: !_isEditing,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Please enter your email';
                          final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                          return emailRegex.hasMatch(value.trim()) ? null : 'Enter a valid email';
                        },
                      ),
                      SizedBox(height: 20),
                      
                      // Phone Number and Date of Birth Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildFormField(
                              label: 'Phone Number',
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              readOnly: !_isEditing,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) return 'Please enter your phone number';
                                final onlyDigits = value.replaceAll(RegExp(r'[^0-9]'), '');
                                return onlyDigits.length < 8 ? 'Enter a valid phone number' : null;
                              },
                            ),
                          ),
                          SizedBox(width: 16),
                          Expanded(
                            child: _buildFormField(
                              label: 'Date of birth',
                              controller: _dobController,
                              readOnly: true,
                              onTap: _isEditing ? _pickDateOfBirth : null,
                              validator: (value) => (value == null || value.trim().isEmpty) ? 'Please select your date of birth' : null,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 20),
                      
                      // Password
                      _buildFormField(
                        label: 'Password',
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        readOnly: !_isEditing,
                        suffixIcon: _isEditing ? IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ) : null,
                        validator: (value) => (value == null || value.length < 6) ? 'Password must be at least 6 characters' : null,
                      ),
                      SizedBox(height: 20),
                      
                      // Confirm Password
                      _buildFormField(
                        label: 'Confirm Password',
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        readOnly: !_isEditing,
                        suffixIcon: _isEditing ? IconButton(
                          icon: Icon(_obscureConfirmPassword ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                        ) : null,
                        validator: (value) => (value != _passwordController.text) ? 'Passwords do not match' : null,
                      ),
                      SizedBox(height: 32),
                      
                      // Edit/Save/Cancel Buttons
                      _isEditing 
                        ? Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _cancelEdit,
                                  style: OutlinedButton.styleFrom(
                                    padding: EdgeInsets.symmetric(vertical: 16),
                                    side: BorderSide(color: Colors.grey[300]!),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: Text(
                                    'Cancel',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.w500,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                              SizedBox(width: 16),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _saveChanges,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Color(0xFF00A86B),
                                    padding: EdgeInsets.symmetric(vertical: 16),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  icon: Icon(
                                    Icons.save,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                  label: Text(
                                    'Save Changes',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _toggleEdit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Color(0xFF00A86B),
                                padding: EdgeInsets.symmetric(vertical: 16),
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              icon: Icon(
                                Icons.edit,
                                color: Colors.white,
                                size: 20,
                              ),
                              label: Text(
                                'Edit Profile',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: AppBottomNavBar(
        selectedIndex: 4,
        role: NavBarRole.admin,
      ),
    );
  }

  Widget _buildFormField({
    required String label,
    required TextEditingController controller,
    TextInputType? keyboardType,
    bool obscureText = false,
    bool readOnly = false,
    Widget? suffixIcon,
    VoidCallback? onTap,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          readOnly: readOnly,
          onTap: onTap,
          validator: validator,
          style: TextStyle(
            fontSize: 14,
            color: Colors.black87,
          ),
          decoration: InputDecoration(
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Color(0xFF00A86B), width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.red),
            ),
            suffixIcon: suffixIcon,
            fillColor: Colors.white,
            filled: true,
          ),
        ),
      ],
    );
  }

}