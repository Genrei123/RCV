import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class GradientHeaderAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  final String greeting;
  final String user;
  final VoidCallback? onBack;

  const GradientHeaderAppBar({
    Key? key,
    this.greeting = 'Welcome back',
    this.user = 'user',
    this.onBack,
  }) : super(key: key);

  @override
  Size get preferredSize => const Size.fromHeight(100);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF00A47D), app_colors.AppColors.primary],
        ),
      ),
      padding: const EdgeInsets.only(top: 36, left: 16, right: 16, bottom: 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              color: app_colors.AppColors.neutral,
            ),
            onPressed: onBack ?? () => Navigator.of(context).maybePop(),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  greeting,
                  style: TextStyle(
                    color: app_colors.AppColors.neutral,
                    fontSize: 16,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  user,
                  style: TextStyle(
                    color: app_colors.AppColors.neutral,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
