// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rcv_firebase/main.dart';

void main() {
  testWidgets('App initializes and shows MaterialApp', (WidgetTester tester) async {
    // Build our app with hasConnection=false to avoid Firebase initialization
    await tester.pumpWidget(const MyApp(hasConnection: false));

    // Wait for initial build
    await tester.pump();

    // Wait for any async operations and timers to complete
    await tester.pump(const Duration(seconds: 10));

    // Verify that MaterialApp is present
    expect(find.byType(MaterialApp), findsOneWidget);

    // Verify that the app title is set correctly
    final MaterialApp app = tester.widget(find.byType(MaterialApp));
    expect(app.title, 'RCV - Product Verification');
  });
}
