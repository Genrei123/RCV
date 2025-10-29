import 'package:flutter/material.dart';

class AppStatusWrapper extends StatelessWidget {
  final Widget child;
  
  const AppStatusWrapper({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return child;
  }
}