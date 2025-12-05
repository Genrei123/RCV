import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

/// A gradient header app bar that shows a page title on the left
/// and a large, faint logo watermark on the right.
class TitleLogoHeaderAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  final String title;
  final bool showBackButton;
  final VoidCallback? onBack;
  final double height;
  final double horizontalPadding;

  const TitleLogoHeaderAppBar({
    super.key,
    required this.title,
    this.showBackButton = true,
    this.onBack,
    this.height = 120,
    this.horizontalPadding = 24, // slightly increased left/right margin
  });

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      clipBehavior: Clip.none,
      padding: EdgeInsets.only(
        top: 36, // status bar spacing
        left: horizontalPadding,
        right: horizontalPadding,
      ),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF00A47D), app_colors.AppColors.primary],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Large watermark logo that overlaps lower half
          Positioned(
            right: -10,
            bottom: -50, // push half outside to overlap body
            child: Opacity(
              opacity: 0.18,
              child: SvgPicture.asset(
                'assets/landinglogo.svg',
                width: 200,
                height: 200,
                colorFilter: ColorFilter.mode(
                  app_colors.AppColors.neutral,
                  BlendMode.srcIn,
                ),
              ),
            ),
          ),
          // Title row anchored to bottom-left
          Positioned.fill(
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (showBackButton)
                    IconButton(
                      padding: const EdgeInsets.only(
                        left: 0,
                        right: 8,
                        bottom: 4,
                      ),
                      icon: Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: app_colors.AppColors.neutral,
                      ),
                      onPressed:
                          onBack ?? () => Navigator.of(context).maybePop(),
                    ),
                  if (showBackButton) const SizedBox(width: 4),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom:
                            14, // increased bottom margin for more breathing space
                      ),
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: app_colors.AppColors.neutral,
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          letterSpacing: .2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
