class TabHistory {
  TabHistory._();
  static final TabHistory instance = TabHistory._();

  final List<int> _stack = <int>[];

  void visit(int index) {
    if (_stack.isEmpty || _stack.last != index) {
      _stack.add(index);
    }
  }

  bool get canGoBack => _stack.length > 1;

  int? popAndGetPrevious() {
    if (_stack.length > 1) {
      _stack.removeLast();
      return _stack.last;
    }
    return null;
  }

  void clear() => _stack.clear();
}
