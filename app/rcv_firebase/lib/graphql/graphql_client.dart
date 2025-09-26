import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class GraphQLConfig {
  static const String _baseUrl = kDebugMode
      ? 'http://localhost:3000/graphql' // Your local API
      : 'https://your-production-api.com/graphql'; // Production

  static GraphQLClient get client {
    final HttpLink httpLink = HttpLink(_baseUrl);

    // Add authentication if needed
    final AuthLink authLink = AuthLink(
      getToken: () async {
        // Get token from your auth service if needed
        return '';
      },
    );

    // Combine links
    final Link link = authLink.concat(httpLink);

    return GraphQLClient(
      link: link,
      cache: GraphQLCache(store: InMemoryStore()),
    );
  }
}

// GraphQL wrapper widget for the app
class GraphQLWrapper extends StatelessWidget {
  final Widget child;

  const GraphQLWrapper({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GraphQLProvider(
      client: ValueNotifier(GraphQLConfig.client),
      child: child,
    );
  }
}
