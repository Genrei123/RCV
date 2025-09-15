import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/widgets/app_buttons.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF00A47D), app_colors.AppColors.primary],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Center(
                child: SvgPicture.asset(
                  "assets/landinglogo.svg",
                  width: 270,
                  height: 270,
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 24.0),
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.5,
                  height: 48,
                  child: AppButtons(
                    text: 'Continue',
                    size: 48,
                    textColor: app_colors.AppColors.primary,
                    backgroundColor: app_colors.AppColors.white,
                    borderColor: app_colors.AppColors.primary,
                    icon: Icon(
                      LucideIcons.play,
                      color: app_colors.AppColors.primary,
                      size: 28,
                    ),
                    onPressed: () {
                      Navigator.pushNamed(context, '/login');
                    },
                  ),
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
