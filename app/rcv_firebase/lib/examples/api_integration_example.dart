// lib/examples/api_integration_example.dart
// Example showing how to integrate the API services with Flutter widgets
// This demonstrates practical usage patterns for your team

import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/product_service.dart';
// import '../services/scan_service.dart'; // Used in verification history
import '../models/api_models.dart';

/// Example login screen showing authentication integration
class LoginExample extends StatefulWidget {
  const LoginExample({Key? key}) : super(key: key);

  @override
  State<LoginExample> createState() => _LoginExampleState();
}

class _LoginExampleState extends State<LoginExample> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await AuthService.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      // Navigate to home screen
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } else {
      setState(() {
        _errorMessage = result.message ?? 'Login failed';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(8),
                color: Colors.red.shade100,
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red.shade700),
                ),
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text('Login'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Example products list showing product service integration
class ProductsListExample extends StatefulWidget {
  const ProductsListExample({Key? key}) : super(key: key);

  @override
  State<ProductsListExample> createState() => _ProductsListExampleState();
}

class _ProductsListExampleState extends State<ProductsListExample> {
  List<Product> _products = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels == 
        _scrollController.position.maxScrollExtent && 
        !_isLoading && 
        _hasMore) {
      _loadMoreProducts();
    }
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await ProductService.getProducts(
      page: 1,
      limit: 20,
      status: ProductStatus.active,
    );

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      setState(() {
        _products = result.data ?? [];
        _currentPage = 1;
        _hasMore = (result.data?.length ?? 0) == 20;
      });
    } else {
      setState(() {
        _errorMessage = result.message ?? 'Failed to load products';
      });
    }
  }

  Future<void> _loadMoreProducts() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    final result = await ProductService.getProducts(
      page: _currentPage + 1,
      limit: 20,
      status: ProductStatus.active,
    );

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      setState(() {
        _products.addAll(result.data ?? []);
        _currentPage++;
        _hasMore = (result.data?.length ?? 0) == 20;
      });
    }
  }

  Future<void> _searchProducts(String query) async {
    if (query.isEmpty) {
      _loadProducts();
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await ProductService.searchProducts(
      query: query,
      page: 1,
      limit: 20,
    );

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      setState(() {
        _products = result.data ?? [];
        _hasMore = false; // Disable pagination for search
      });
    } else {
      setState(() {
        _errorMessage = result.message ?? 'Search failed';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: Colors.red.shade100,
              child: Text(
                _errorMessage!,
                style: TextStyle(color: Colors.red.shade700),
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadProducts,
              child: ListView.builder(
                controller: _scrollController,
                itemCount: _products.length + (_hasMore ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _products.length) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }

                  final product = _products[index];
                  return ListTile(
                    leading: product.imageUrl != null
                        ? Image.network(
                            product.imageUrl!,
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(Icons.image),
                          )
                        : const Icon(Icons.inventory),
                    title: Text(product.name),
                    subtitle: Text('${product.sku} - \$${product.price}'),
                    trailing: Chip(
                      label: Text(product.status.toString().split('.').last),
                      backgroundColor: _getStatusColor(product.status),
                    ),
                    onTap: () => _showProductDetails(product),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(ProductStatus status) {
    switch (status) {
      case ProductStatus.active:
        return Colors.green.shade100;
      case ProductStatus.inactive:
        return Colors.grey.shade100;
      case ProductStatus.discontinued:
        return Colors.red.shade100;
    }
  }

  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Search Products'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: 'Enter product name or SKU',
            ),
            onSubmitted: (value) {
              Navigator.pop(context);
              _searchProducts(value);
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _searchProducts(controller.text);
              },
              child: const Text('Search'),
            ),
          ],
        );
      },
    );
  }

  void _showProductDetails(Product product) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailsExample(product: product),
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}

/// Example product details screen
class ProductDetailsExample extends StatefulWidget {
  final Product product;

  const ProductDetailsExample({Key? key, required this.product}) : super(key: key);

  @override
  State<ProductDetailsExample> createState() => _ProductDetailsExampleState();
}

class _ProductDetailsExampleState extends State<ProductDetailsExample> {
  List<Scan> _verificationHistory = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadVerificationHistory();
  }

  Future<void> _loadVerificationHistory() async {
    setState(() {
      _isLoading = true;
    });

    final result = await ProductService.getProductVerificationHistory(
      widget.product.id,
      limit: 10,
    );

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      setState(() {
        _verificationHistory = result.data ?? [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => _showQRScanner(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            if (widget.product.imageUrl != null)
              Center(
                child: Image.network(
                  widget.product.imageUrl!,
                  height: 200,
                  width: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 200),
                ),
              ),
            const SizedBox(height: 16),
            
            // Product Info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Product Information',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow('Name', widget.product.name),
                    _buildInfoRow('SKU', widget.product.sku),
                    _buildInfoRow('Price', '\$${widget.product.price}'),
                    _buildInfoRow('Status', widget.product.status.toString().split('.').last),
                    _buildInfoRow('Description', widget.product.description),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Verification History
            Text(
              'Verification History',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_verificationHistory.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No verification history available'),
                ),
              )
            else
              ..._verificationHistory.map((scan) => Card(
                child: ListTile(
                  leading: Icon(
                    _getScanIcon(scan.result),
                    color: _getScanColor(scan.result),
                  ),
                  title: Text(scan.result.toString().split('.').last.toUpperCase()),
                  subtitle: Text(
                    'Verified at ${scan.location.city}, ${scan.location.country}\n'
                    '${scan.timestamp.toString()}',
                  ),
                  trailing: scan.inspector != null
                      ? Text('By: ${scan.inspector!.fullName}')
                      : null,
                ),
              )).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  IconData _getScanIcon(ScanResult result) {
    switch (result) {
      case ScanResult.verified:
        return Icons.check_circle;
      case ScanResult.failed:
        return Icons.error;
      case ScanResult.suspicious:
        return Icons.warning;
      case ScanResult.pending:
        return Icons.hourglass_empty;
    }
  }

  Color _getScanColor(ScanResult result) {
    switch (result) {
      case ScanResult.verified:
        return Colors.green;
      case ScanResult.failed:
        return Colors.red;
      case ScanResult.suspicious:
        return Colors.orange;
      case ScanResult.pending:
        return Colors.grey;
    }
  }

  void _showQRScanner() {
    // TODO: Implement QR scanner
    // You can use packages like qr_code_scanner or mobile_scanner
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('QR Scanner'),
        content: const Text('QR Scanner implementation goes here.\n\nUse packages like:\n- qr_code_scanner\n- mobile_scanner\n- qr_flutter'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

/// Example authentication check widget
class AuthCheckExample extends StatelessWidget {
  final Widget child;

  const AuthCheckExample({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: AuthService.isAuthenticated(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.data == true) {
          return child;
        } else {
          return const LoginExample();
        }
      },
    );
  }
}

/// Example usage in main app
class ApiIntegrationApp extends StatelessWidget {
  const ApiIntegrationApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RCV API Integration',
      theme: ThemeData(
        primarySwatch: Colors.green,
        primaryColor: const Color(0xFF005440),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF005440),
        ),
      ),
      home: const AuthCheckExample(
        child: ProductsListExample(),
      ),
      routes: {
        '/login': (context) => const LoginExample(),
        '/products': (context) => const ProductsListExample(),
      },
    );
  }
}