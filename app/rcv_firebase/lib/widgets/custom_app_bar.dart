import 'package:flutter/material.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String greeting;
  final String userRole;
  final Widget? trailing;
  const CustomAppBar({
    super.key,
    required this.greeting,
    required this.userRole,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return AppBar(
      automaticallyImplyLeading: false,
      title: Stack(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      userRole,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              // Logo on the right
              Padding(
                padding: const EdgeInsets.only(left: 12.0),
                child: Image.asset(
                  'assets/RCV.png',
                  width: 36,
                  height: 36,
                  fit: BoxFit.contain,
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          // Custom back button aligned vertically center with text
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
