import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:rcv_firebase/themes/app_colors.dart'; // Assuming AppColors is defined and accessible

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: MyHomePage(), // Use a StatefulWidget for navigation if state changes
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _selectedIndex = 4; // Set initial index to 4 for "Profile" based on your list

  // Define the content for each tab.
  // For this example, I'm making each a simple Text widget,
  // but you would replace these with your actual page widgets (e.g., HomePage(), AuditPage(), etc.)
  static final List<Widget> _widgetOptions = <Widget>[
    const Center(child: Text('Home Page Content', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold))),
    const Center(child: Text('Audit Page Content', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold))),
    const Center(child: Text('Central Action Content', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold))), // For the circle icon
    const Center(child: Text('Reports Page Content', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold))),
    // The original Profile Page content goes here for the 'Profile' tab
    Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, // ✅ keep text left
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
          const SizedBox(height: 12),
          const Text(
            "John B. Doe",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Text(
            "User",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.normal,
              color: Colors.black54,
            ),
          ),

          const SizedBox(height: 16),

          // Centered Edit Profile Button
          Center(
            child: SizedBox(
              width: 180,
              height: 40,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: () {
                  // TODO: Add edit profile action
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SvgPicture.string(
                      '''
                      <svg xmlns="http://www.w3.org/2000/svg"
                        width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-pencil">
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                      ''',
                      colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      "Edit Profile",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Gray container with Email & Location
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[200], // light gray background
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Email",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  "johnbdoe@gmail.com",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.normal,
                    color: Colors.black, // ✅ pure black
                  ),
                ),
                SizedBox(height: 12),
                Text(
                  "Location",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  "Caloocan City, Metro Manila",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.normal,
                    color: Colors.black, // ✅ pure black
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Centered Logout Button
          Center(
            child: SizedBox(
              width: 180,
              height: 40,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error, // ✅ error color
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: () {
                  // TODO: Add logout action
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SvgPicture.string(
                      '''
                      <svg xmlns="http://www.w3.org/2000/svg"
                        width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-log-out">
                        <path d="m16 17 5-5-5-5"/>
                        <path d="M21 12H9"/>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      </svg>
                      ''',
                      colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      "Logout",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  // Helper to dynamically change AppBar title based on selected tab
  String _getAppBarTitle(int index) {
    switch (index) {
      case 0:
        return 'Home';
      case 1:
        return 'Audit';
      case 2:
        return 'Action';
      case 3:
        return 'Reports';
      case 4:
        return 'Profile';
      default:
        return 'App';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _getAppBarTitle(_selectedIndex), // Dynamic app bar title
          style: const TextStyle(
            color: Colors.white,
          ),
        ),
        backgroundColor: AppColors.primary, // Assuming AppColors.primary is defined
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _widgetOptions.elementAt(_selectedIndex), // Display content based on selected tab
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.fact_check), // Icon for Audit
            label: 'Audit',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.circle), // Central Circle Icon
            label: 'Action', // You can change this label to fit the action
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart), // Icon for Reports
            label: 'Reports',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person), // Icon for Profile
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: AppColors.primary, // Color of the selected icon/label
        unselectedItemColor: Colors.grey,     // Color of unselected icons/labels
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed, // Important for more than 3 items
      ),
    );
  }
}