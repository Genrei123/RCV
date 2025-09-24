import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

// Import all your pages
import 'auth/landingPage.dart';
import 'auth/login_page.dart';
import 'widgets/navigation_bar.dart' as nav_bar;
import 'auth/otp_verification_page.dart';
import 'auth/reset_password.dart';
import 'auth/reset_new_password_page.dart';
import 'auth/user_profile.dart';
import 'user_page/agent_homePage.dart';
import 'user_page/scanning_Page.dart';
import 'user_page/agent_auditTrail.dart';
import 'user_page/agent_Reports.dart';
import 'admin_page/admin_auditTrail.dart';
import 'admin_page/admin_reports.dart';
import 'admin_page/admin_homePage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RCV - Product Verification',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF005440)),
        primarySwatch: Colors.green,
      ),
      // Start with the landing page
      initialRoute: '/',
      routes: {
        //authentication
        '/': (context) => const LandingPage(),
        '/login': (context) => const LoginPage(),
        '/otp-verification': (context) => const OtpVerificationPage(),
        '/reset-password': (context) => ResetPasswordPage(),
        '/reset-new-password': (context) => const ResetNewPasswordPage(),
        '/user-profile': (context) => UserProfilePage(
          role: (appRole ?? nav_bar.NavBarRole.user).toString(),
        ),
        //Admin Pages
        '/admin-home': (context) => const HomePage(), // Admin HomePage
        '/admin-audit-trail': (context) => const AdminAuditTrail(),
        '/admin-reports': (context) => const AdminReportsPage(),
        //Agent Pages
        '/user-home': (context) => const UserHomePage(),
        '/main-app': (context) => const MyHomePage(title: 'RCV Home'),
        '/user-audit-trail': (context) => const AuditTrailPage(),
        '/user-reports': (context) => const UserReportsPage(),

        //Agent Web Pages

        //Scanning Page
        '/scanning': (context) => const QRScannerPage(),
      },
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;
  int _selectedIndex = 0;

  void _incrementCounter() {
    setState(() {
      // This call to setState tells the Flutter framework that something has
      // changed in this State, which causes it to rerun the build method below
      // so that the display can reflect the updated values. If we changed
      // _counter without calling setState(), then the build method would not be
      // called again, and so nothing would appear to happen.
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    // This method is rerun every time setState is called, for instance as done
    // by the _incrementCounter method above.
    //
    // The Flutter framework has been optimized to make rerunning build methods
    // fast, so that you can just rebuild anything that needs updating rather
    // than having to individually change instances of widgets.
    return Scaffold(
      appBar: AppBar(
        // TRY THIS: Try changing the color here to a specific color (to
        // Colors.amber, perhaps?) and trigger a hot reload to see the AppBar
        // change color while the other colors stay the same.
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Text(widget.title),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          // Column is also a layout widget. It takes a list of children and
          // arranges them vertically. By default, it sizes itself to fit its
          // children horizontally, and tries to be as tall as its parent.
          //
          // Column has various properties to control how it sizes itself and
          // how it positions its children. Here we use mainAxisAlignment to
          // center the children vertically; the main axis here is the vertical
          // axis because Columns are vertical (the cross axis would be
          // horizontal).
          //
          // TRY THIS: Invoke "debug painting" (choose the "Toggle Debug Paint"
          // action in the IDE, or press "p" in the console), to see the
          // wireframe for each widget.
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      //nav bar
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: app_colors.AppColors.primary,
        unselectedItemColor: app_colors.AppColors.muted,
        items: [
          BottomNavigationBarItem(
            icon: Icon(
              Icons.home,
              color: 0 == _selectedIndex
                  ? app_colors.AppColors.primary
                  : app_colors.AppColors.muted,
            ),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              Icons.history,
              color: 1 == _selectedIndex
                  ? app_colors.AppColors.primary
                  : app_colors.AppColors.muted,
            ),
            label: 'History',
          ),
          BottomNavigationBarItem(
            icon: Container(
              width: 66,
              height: 66,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: 2 == _selectedIndex
                    ? app_colors.AppColors.primary
                    : app_colors.AppColors.muted,
              ),
              padding: const EdgeInsets.all(12),
              child: Icon(
                LucideIcons.scan,
                color: 2 == _selectedIndex
                    ? Colors.white
                    : app_colors.AppColors.muted,
                size: 24,
              ),
            ),
            label: '',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              Icons.add,
              color: 3 == _selectedIndex
                  ? app_colors.AppColors.primary
                  : app_colors.AppColors.muted,
            ),
            label: 'Add',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              Icons.person,
              color: 4 == _selectedIndex
                  ? app_colors.AppColors.primary
                  : app_colors.AppColors.muted,
            ),
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
          // Handle navigation tap here
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
