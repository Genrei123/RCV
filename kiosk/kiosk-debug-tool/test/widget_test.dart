import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kiosk_debug_tool/main.dart';

void main() {
  testWidgets('App loads with login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const KioskDebugApp());

    // Verify login screen elements
    expect(find.text('RCV Kiosk Debug Tool'), findsOneWidget);
    expect(find.text('Administrator Access Only'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Login'), findsOneWidget);
  });

  testWidgets('Login button is interactive', (WidgetTester tester) async {
    await tester.pumpWidget(const KioskDebugApp());

    final loginButton = find.text('Login');
    expect(loginButton, findsOneWidget);

    // Button should be enabled
    final button = tester.widget<ElevatedButton>(
      find.byType(ElevatedButton).first,
    );
    expect(button.onPressed, isNotNull);
  });

  testWidgets('Email field validates input', (WidgetTester tester) async {
    await tester.pumpWidget(const KioskDebugApp());

    // Find email field and enter invalid email
    final emailField = find.byType(TextFormField).first;
    await tester.enterText(emailField, 'invalid-email');
    
    // Tap login to trigger validation
    await tester.tap(find.text('Login'));
    await tester.pump();

    // Should show validation error
    expect(find.text('Please enter a valid email'), findsOneWidget);
  });
}
