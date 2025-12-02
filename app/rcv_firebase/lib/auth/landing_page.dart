import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/widgets/app_buttons.dart';
import 'package:rcv_firebase/services/remote_config_service.dart';
import 'package:rcv_firebase/widgets/app_disabled_screen.dart';
import 'package:rcv_firebase/services/auth_service.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _authService = AuthService();

  @override
  void initState() {
    super.initState();
    RemoteConfigService.addRealtimeListener(() {
      if (mounted) {
        setState(() {});
      }
    });
    _redirectIfLoggedIn();
  }

  Future<void> _redirectIfLoggedIn() async {
    final loggedIn = await _authService.isLoggedIn();
    if (!mounted) return;
    if (loggedIn) {
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/user-home',
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Remote  config checker if disabled
    if (RemoteConfigService.getDisableApplication()) {
      return const AppDisabledScreen();
    }

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
                child: SizedBox(
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
