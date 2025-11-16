import 'package:flutter/material.dart';

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
    this.showBackButton = false,
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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF00A47D), Color(0xFF007A5A)],
        ),
        boxShadow: [
          BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Watermark logo on the right, consistent placement
          Positioned(
            right: 12,
            top: 8,
            child: IgnorePointer(
              child: Opacity(
                opacity: 0.16,
                child: Image.asset(
                  'assets/RCV.png',
                  width: 140,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
          // Bottom white divider to match the concept screenshot
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(height: 6, color: Colors.white),
          ),
          // Title row anchored to bottom-left
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.only(
                top: 36,
                left: horizontalPadding,
                right: horizontalPadding,
                bottom: 8,
              ),
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
                          bottom: 2,
                        ),
                        icon: const Icon(
                          Icons.arrow_back_ios_new_rounded,
                          color: Colors.white,
                        ),
                        onPressed:
                            onBack ?? () => Navigator.of(context).maybePop(),
                      ),
                    if (showBackButton) const SizedBox(width: 4),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
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
          ),
        ],
      ),
    );
  }
}
