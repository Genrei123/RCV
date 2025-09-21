import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:rcv_firebase/themes/app_colors.dart';
import 'package:rcv_firebase/components/qr_details.dart';


void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Scanned Item Demo',
      theme: ThemeData(
        primaryColor: AppColors.primary,
        hintColor: AppColors.secondary,
        fontFamily: 'Roboto',
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const ScannedItemDisplayPage(),
    );
  }
}

class ScannedItemDisplayPage extends StatefulWidget {
  const ScannedItemDisplayPage({super.key});

  @override
  State<ScannedItemDisplayPage> createState() => _ScannedItemDisplayPageState();
}

class _ScannedItemDisplayPageState extends State<ScannedItemDisplayPage> {
  ScannedItem? _scannedItem;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadScannedItemData();
  }

  Future<void> _loadScannedItemData() async {
    setState(() {
      _isLoading = true;
    });
    await Future.delayed(const Duration(milliseconds: 700));

    try {
      final String response =
          await rootBundle.loadString('assets/data/scanned_item.json');
      final data = json.decode(response);
      setState(() {
        _scannedItem = ScannedItem.fromJson(data);
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading scanned_item.json: $e');
      setState(() {
        _scannedItem = ScannedItem(
          companyName: 'Failed to Load Company',
          productName: 'Failed to Load Product',
          brandName: 'Failed to Load Brand',
          regNumber: 'ERR-000000000',
          productImage: 'assets/product_placeholder.png',
        );
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // No AppBar
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _scannedItem == null
              ? const Center(
                  child: Text(
                    'Failed to load scanned item data.',
                    style: TextStyle(color: AppColors.text),
                  ),
                )
              : ScannedItemDetails(
                  item: _scannedItem!,
                ),
    );
  }
}

