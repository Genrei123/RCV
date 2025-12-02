import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:rcv_firebase/themes/app_colors.dart';
import '../services/user_profile_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert' show base64Encode;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/crop_image_widget.dart';

class EditProfilePage extends StatefulWidget {
  final Map<String, dynamic> userData;

  const EditProfilePage({super.key, required this.userData});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _middleNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _extNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneNumberController;
  late TextEditingController _locationController;
  late TextEditingController _dateOfBirthController;

  // Password change fields
  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _isLoading = false;
  bool _showPasswordSection = false;
  final ImagePicker _picker = ImagePicker();
  String? _localAvatarPath;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(
      text: widget.userData['firstName'] ?? '',
    );
    _middleNameController = TextEditingController(
      text: widget.userData['middleName'] ?? '',
    );
    _lastNameController = TextEditingController(
      text: widget.userData['lastName'] ?? '',
    );
    _extNameController = TextEditingController(
      text: widget.userData['extName'] ?? '',
    );
    _emailController = TextEditingController(
      text: widget.userData['email'] ?? '',
    );
    _phoneNumberController = TextEditingController(
      text: widget.userData['phoneNumber'] ?? '',
    );
    _locationController = TextEditingController(
      text: widget.userData['location'] ?? '',
    );
    _dateOfBirthController = TextEditingController(
      text: widget.userData['dateOfBirth'] ?? '',
    );
    // Build a per-user storage key to avoid sharing avatars across accounts
    final userId = (widget.userData['_id'] ?? widget.userData['id'])
        ?.toString();
    final email = widget.userData['email']?.toString();
    final userKey = userId?.isNotEmpty == true
        ? userId
        : (email?.isNotEmpty == true ? email : 'default');
    _avatarLocalKey = 'profile_avatar_path_$userKey';
    _loadLocalAvatar();
    _phoneNumberController.addListener(_handlePhoneNumberFormat);
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _extNameController.dispose();
    _emailController.dispose();
    _phoneNumberController.dispose();
    _locationController.dispose();
    _dateOfBirthController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  late final String _avatarLocalKey;

  Future<void> _loadLocalAvatar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedPath = prefs.getString(_avatarLocalKey);
      if (savedPath != null && savedPath.isNotEmpty) {
        final f = File(savedPath);
        if (await f.exists()) {
          if (!mounted) return;
          setState(() {
            _localAvatarPath = savedPath;
          });
        }
      }
    } catch (_) {}
  }

  void _openImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(20),
            height: 180,
            child: Row(
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
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Camera'),
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
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Gallery'),
                ),
              ],
            ),
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
        headerColor: AppColors.primary,
      );

      if (cropped != null) {
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
        if (prevPath != null && prevPath.isNotEmpty && prevPath != newPath) {
          final prevFile = File(prevPath);
          if (await prevFile.exists()) {
            try {
              await prevFile.delete();
            } catch (_) {}
          }
        }
        await prefs.setString(_avatarLocalKey, out.path);
        if (!mounted) return;
        setState(() {
          _localAvatarPath = out.path;
        });

        // Also upload to API so avatar is tied to the account
        final base64 = 'data:image/png;base64,${base64Encode(cropped)}';
        final upload = await UserProfileService.uploadProfileAvatar(base64);
        if (upload['success'] == true) {
          // Optionally, we could refresh profile data here
          // but Profile page will reload on return
          // ignore
        } else {
          // Show non-blocking error if upload failed
          // but keep local avatar so user still sees the change offline
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(upload['message'] ?? 'Failed to upload avatar'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Image error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleSaveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Update profile data
      final profileData = {
        'firstName': _firstNameController.text.trim(),
        'middleName': _middleNameController.text.trim().isEmpty
            ? null
            : _middleNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'extName': _extNameController.text.trim().isEmpty
            ? null
            : _extNameController.text.trim(),
        'email': _emailController.text.trim(),
        'phoneNumber': _phoneNumberController.text.trim(),
        'location': _locationController.text.trim(),
        'dateOfBirth': _dateOfBirthController.text.trim().isEmpty
            ? null
            : _dateOfBirthController.text.trim(),
      };

      final updateResult = await UserProfileService.updateProfile(profileData);

      if (!updateResult['success']) {
        throw Exception(updateResult['message'] ?? 'Failed to update profile');
      }

      // Handle password change if requested
      if (_showPasswordSection &&
          _currentPasswordController.text.isNotEmpty &&
          _newPasswordController.text.isNotEmpty) {
        final passwordResult = await UserProfileService.changePassword(
          _currentPasswordController.text,
          _newPasswordController.text,
        );

        if (!passwordResult['success']) {
          throw Exception(
            passwordResult['message'] ?? 'Failed to change password',
          );
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Error: ${e.toString().replaceAll('Exception: ', '')}',
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _handlePhoneNumberFormat() {
    final text = _phoneNumberController.text;
    // Filter to only plus and digits
    final filtered = text.replaceAll(RegExp(r'[^0-9+]'), '');
    String newText = filtered;
    if (newText.startsWith('09')) {
      if (newText.length > 11) {
        newText = newText.substring(0, 11);
      }
    } else if (newText.startsWith('+63')) {
      if (newText.length > 13) {
        newText = newText.substring(0, 13);
      }
    }
    if (newText != text) {
      _phoneNumberController.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newText.length),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
                    // Avatar selector
                    Center(
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          CircleAvatar(
                            radius: 48,
                            backgroundColor: Colors.grey.shade300,
                            backgroundImage: _localAvatarPath != null
                                ? FileImage(File(_localAvatarPath!))
                                : null,
                            child: _localAvatarPath == null
                                ? const Icon(
                                    Icons.person,
                                    size: 42,
                                    color: Colors.black54,
                                  )
                                : null,
                          ),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Material(
                              color: Colors.transparent,
                              shape: const CircleBorder(),
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: _openImageSourcePicker,
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2,
                                    ),
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
                    // Personal Information Section
                    const Text(
                      'Personal Information',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Names Row 1: First & Middle
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _firstNameController,
                            decoration: const InputDecoration(
                              labelText: 'First Name',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.person),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'First name is required';
                              }
                              final v = value.trim();
                              if (!RegExp(
                                r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+",
                              ).hasMatch(v)) {
                                return 'Letters only';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _middleNameController,
                            decoration: const InputDecoration(
                              labelText: 'Middle Name (Optional)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (value) {
                              if (value != null && value.trim().isNotEmpty) {
                                final v = value.trim();
                                if (!RegExp(
                                  r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+",
                                ).hasMatch(v)) {
                                  return 'Invalid';
                                }
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Names Row 2: Last & Extension
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _lastNameController,
                            decoration: const InputDecoration(
                              labelText: 'Last Name',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.person),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Last name is required';
                              }
                              final v = value.trim();
                              if (!RegExp(
                                r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+",
                              ).hasMatch(v)) {
                                return 'Letters only';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _extNameController,
                            decoration: const InputDecoration(
                              labelText: 'Name Extension (Optional)',
                              hintText: 'Jr., Sr., III, etc.',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.text_fields),
                            ),
                            validator: (value) {
                              if (value != null && value.trim().isNotEmpty) {
                                final v = value.trim();
                                if (!RegExp(
                                  r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+\.?$",
                                ).hasMatch(v)) {
                                  return 'Invalid';
                                }
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.email),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Email is required';
                        }
                        if (!RegExp(
                          r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                        ).hasMatch(value)) {
                          return 'Enter a valid email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _phoneNumberController,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.phone),
                      ),
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9+]')),
                      ],
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Phone number is required';
                        }
                        final v = value.trim();
                        if (!RegExp(r'^[0-9+]+$').hasMatch(v)) {
                          return 'Only + and numbers allowed';
                        }
                        if (v.startsWith('09')) {
                          if (v.length != 11) {
                            return 'Must be 11 digits starting with 09';
                          }
                        } else if (v.startsWith('+63')) {
                          if (v.length != 13) {
                            return 'Must be +63 followed by 10 digits';
                          }
                        } else {
                          return 'Start with 09 or +63';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _locationController,
                      decoration: const InputDecoration(
                        labelText: 'Location',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.location_on),
                      ),
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _dateOfBirthController,
                      decoration: const InputDecoration(
                        labelText: 'Date of Birth (Optional)',
                        hintText: 'YYYY-MM-DD',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.calendar_today),
                      ),
                      keyboardType: TextInputType.datetime,
                    ),
                    const SizedBox(height: 24),

                    // Password Change Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Change Password',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Switch(
                          value: _showPasswordSection,
                          onChanged: (value) {
                            setState(() => _showPasswordSection = value);
                            if (!value) {
                              _currentPasswordController.clear();
                              _newPasswordController.clear();
                              _confirmPasswordController.clear();
                            }
                          },
                          activeTrackColor: AppColors.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (_showPasswordSection) ...[
                      TextFormField(
                        controller: _currentPasswordController,
                        decoration: const InputDecoration(
                          labelText: 'Current Password',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.lock),
                        ),
                        obscureText: true,
                        validator: (value) {
                          if (_showPasswordSection &&
                              (value == null || value.isEmpty)) {
                            return 'Current password is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _newPasswordController,
                        decoration: const InputDecoration(
                          labelText: 'New Password',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                        obscureText: true,
                        validator: (value) {
                          if (_showPasswordSection &&
                              (value == null || value.isEmpty)) {
                            return 'New password is required';
                          }
                          if (_showPasswordSection && value!.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _confirmPasswordController,
                        decoration: const InputDecoration(
                          labelText: 'Confirm New Password',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                        obscureText: true,
                        validator: (value) {
                          if (_showPasswordSection &&
                              value != _newPasswordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _isLoading
                                ? null
                                : () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: BorderSide(color: AppColors.primary),
                            ),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(fontSize: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleSaveProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: const Text(
                              'Save Changes',
                              style: TextStyle(fontSize: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
