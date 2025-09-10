import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:rcv_firebase/themes/app_colors.dart' as app_colors;

class UserHomePage extends StatefulWidget {
  const UserHomePage({Key? key}) : super(key: key);

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const HomeContent(),
    const HistoryPage(),
    const ScanPage(),
    const AddPage(),
    const ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: app_colors.AppColors.primary,
        title: const Text(
          'RCV Home',
          style: TextStyle(color: Colors.white),
        ),
        elevation: 0,
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: app_colors.AppColors.primary,
        unselectedItemColor: Colors.grey,
        currentIndex: _selectedIndex,
        onTap: (index) {
          if (index == 2) {
            // Navigate to QR Scanner page
            Navigator.pushNamed(context, '/qr-scanner');
          } else {
            setState(() {
              _selectedIndex = index;
            });
          }
        },
        items: [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
          BottomNavigationBarItem(
            icon: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: app_colors.AppColors.primary,
              ),
              child: Icon(
                LucideIcons.scan,
                color: Colors.white,
                size: 24,
              ),
            ),
            label: 'Scan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add),
            label: 'Add',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// Home Content Widget
class HomeContent extends StatelessWidget {
  const HomeContent({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Welcome Back',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: Icon(
                LucideIcons.scan,
                color: app_colors.AppColors.primary,
              ),
              title: const Text('Scan Product'),
              subtitle: const Text('Verify product authenticity'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.pushNamed(context, '/qr-scanner');
              },
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: Icon(
                Icons.history,
                color: app_colors.AppColors.primary,
              ),
              title: const Text('Scan History'),
              subtitle: const Text('View your previous scans'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                // Navigate to history
              },
            ),
          ),
        ],
      ),
    );
  }
}

// Placeholder pages for navigation
class HistoryPage extends StatelessWidget {
  const HistoryPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Scan History',
        style: TextStyle(fontSize: 24),
      ),
    );
  }
}

class ScanPage extends StatelessWidget {
  const ScanPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'QR Scanner',
        style: TextStyle(fontSize: 24),
      ),
    );
  }
}

class AddPage extends StatelessWidget {
  const AddPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Add Content',
        style: TextStyle(fontSize: 24),
      ),
    );
  }
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 50,
            child: Icon(Icons.person, size: 50),
          ),
          const SizedBox(height: 16),
          const Text(
            'User Profile',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () {
              // Navigate to settings
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Logout'),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () {
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/',
                (route) => false,
              );
            },
          ),
        ],
      ),
    );
  }
}
