import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class AdminAccountsTable extends StatelessWidget {
  final List<Map<String, dynamic>> users;
  final Function(Map<String, dynamic>, Offset)? onActionTap;

  const AdminAccountsTable({
    super.key,
    required this.users,
    this.onActionTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          _buildTableHeader(),
          _buildTableBody(),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: app_colors.AppColors.primary,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(8),
          topRight: Radius.circular(8),
        ),
      ),
      child: Row(
        children: [
          Expanded(flex: 3, child: Text('Email', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11))),
          Expanded(flex: 2, child: Text('Role', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11))),
          Expanded(flex: 1, child: Text('Action', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.center)),
        ],
      ),
    );
  }

  Widget _buildTableBody() {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(8),
            bottomRight: Radius.circular(8),
          ),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: ListView.builder(
          itemCount: users.length,
          itemBuilder: (context, index) {
            final user = users[index];
            final isLast = index == users.length - 1;
            return _buildUserRow(user, isLast, context);
          },
        ),
      ),
    );
  }

  Widget _buildUserRow(Map<String, dynamic> user, bool isLast, BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        border: isLast ? null : Border(
          bottom: BorderSide(color: Colors.grey.shade100),
        ),
      ),
      child: Row(
        children: [
          // User Info (Name & Email with Avatar)
          Expanded(
            flex: 3,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 10,
                  backgroundColor: user['color'],
                  child: _buildAvatarContent(user['avatar']),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user['email'],
                        style: TextStyle(fontWeight: FontWeight.w500, fontSize: 10),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        user['name'],
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 9),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Role
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: user['role'] == 'Admin' ? app_colors.AppColors.accent : app_colors.AppColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                user['role'],
                style: TextStyle(color: Colors.white, fontSize: 8),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          // Actions
          Expanded(
            flex: 1,
            child: Builder(
              builder: (BuildContext buttonContext) {
                return GestureDetector(
                  onTap: () {
                    try {
                      final RenderBox renderBox = buttonContext.findRenderObject() as RenderBox;
                      final position = renderBox.localToGlobal(Offset.zero);
                      onActionTap?.call(user, position);
                    } catch (e) {
                      debugPrint('Error getting position: $e');
                      onActionTap?.call(user, Offset.zero);
                    }
                  },
                  child: Icon(LucideIcons.moreHorizontal, size: 14, color: Colors.grey),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarContent(dynamic avatar) {
    if (avatar is String && avatar.contains('assets/')) {
      // It's an image path
      return ClipOval(
        child: Image.asset(
          avatar,
          width: 20,
          height: 20,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            // Fallback to first letter of name if image fails to load
            return Text(
              avatar.split('/').last.substring(0, 1).toUpperCase(),
              style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
            );
          },
        ),
      );
    } else {
      // It's a text avatar (single letter)
      return Text(
        avatar.toString().substring(0, 1).toUpperCase(),
        style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
      );
    }
  }
}
