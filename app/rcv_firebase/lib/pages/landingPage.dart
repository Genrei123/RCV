import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart'; // ✅ import for SVG support
import 'package:rcv_firebase/themes/app_colors.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text(
            "Profile Page",
            style: TextStyle(
              color: Colors.white,
            ),
          ),
          backgroundColor: AppColors.primary,
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Align(
            alignment: Alignment.topLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, // ✅ left aligned
              children: [
                // Avatar with border
                Stack(
                  alignment: Alignment.center,
                  children: [
                    ClipOval(
                      child: SvgPicture.asset(
                        "assets/landinglogo.svg",
                        width: 128,
                        height: 128,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Container(
                      width: 128,
                      height: 128,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.primary,
                          width: 4,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12), // spacing under avatar
                const Text(
                  "John B. Doe",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold, // ✅ bold
                  ),
                ),
                const Text(
                  "User",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.normal, // ✅ regular
                    color: Colors.black54, // lighter gray look
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
