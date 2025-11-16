// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:apk/main.dart';

void main() {
  testWidgets('Buttons toggle between ON and OFF', (WidgetTester tester) async {
    await tester.pumpWidget(const ThreeButtonToggleApp());

    final firstButtonFinder = find.text('Button 1: OFF');

    expect(firstButtonFinder, findsOneWidget);

    await tester.tap(firstButtonFinder);
    await tester.pumpAndSettle();

    expect(find.text('Button 1: ON'), findsOneWidget);
    expect(firstButtonFinder, findsNothing);

    await tester.tap(find.text('Button 1: ON'));
    await tester.pumpAndSettle();

    expect(find.text('Button 1: OFF'), findsOneWidget);
  });
}
