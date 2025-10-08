import 'package:flutter/material.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import 'package:flutter_svg/flutter_svg.dart';

class GradientHeaderAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  final String greeting;
  final String user;
  final VoidCallback? onBack;
  final bool showBackButton;
  final bool showBranding; // New parameter for showing simplified branding

  const GradientHeaderAppBar({
    super.key,
    this.greeting = 'Welcome back',
    this.user = 'user',
    this.onBack,
    this.showBackButton = true,
    this.showBranding = false, // Default to false for backward compatibility
  });

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
          if (showBackButton) ...[
            IconButton(
              icon: Icon(
                Icons.arrow_back_ios_new_rounded,
                color: app_colors.AppColors.neutral,
              ),
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: showBranding
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SvgPicture.asset(
                              'assets/landinglogo.svg',
                              width: 40,
                              height: 40,
                              colorFilter: ColorFilter.mode(
                                app_colors.AppColors.neutral,
                                BlendMode.srcIn,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'RCV - Verification System',
                              style: TextStyle(
                                color: app_colors.AppColors.neutral,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (greeting.isNotEmpty)
                        Text(
                          greeting,
                          style: TextStyle(
                            color: app_colors.AppColors.neutral,
                            fontSize: 16,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      if (greeting.isNotEmpty) const SizedBox(height: 2),
                      if (user.isNotEmpty)
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
