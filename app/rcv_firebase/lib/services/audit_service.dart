import 'package:graphql_flutter/graphql_flutter.dart';
import '../graphql/queries.dart';
import '../graphql/graphql_client.dart';

class AuditService {
  static final GraphQLClient _client = GraphQLConfig.client;

  // Create audit trail entry
  static Future<void> createAuditTrail({
    required String userId,
    required String action,
    required String type,
    String? details,
    String? location,
  }) async {
    try {
      final MutationOptions options = MutationOptions(
        document: gql(GraphQLMutations.createAuditTrail),
        variables: {
          'input': GraphQLInputs.createAuditTrailInput(
            userId: userId,
            action: action,
            type: type,
            details: details,
            location: location,
          ),
        },
      );

      final QueryResult result = await _client.mutate(options);

      if (result.hasException) {
        print('Error creating audit trail: ${result.exception}');
        // Don't throw - audit trail creation should not break the main flow
      }
    } catch (e) {
      print('Unexpected error creating audit trail: $e');
      // Silent fail - audit logging should not impact user experience
    }
  }

  // Predefined audit actions for common operations
  static Future<void> logLogin(String userId) async {
    await createAuditTrail(
      userId: userId,
      action: 'User Login',
      type: 'Authentication',
      details: 'User successfully logged in',
    );
  }

  static Future<void> logLogout(String userId) async {
    await createAuditTrail(
      userId: userId,
      action: 'User Logout',
      type: 'Authentication',
      details: 'User logged out',
    );
  }

  static Future<void> logScan(String userId, String productId) async {
    await createAuditTrail(
      userId: userId,
      action: 'Product Scan',
      type: 'Verification',
      details: 'Scanned product: $productId',
    );
  }

  static Future<void> logReportGeneration(
    String userId,
    String reportType,
  ) async {
    await createAuditTrail(
      userId: userId,
      action: 'Report Generated',
      type: 'Reporting',
      details: 'Generated $reportType report',
    );
  }

  static Future<void> logDataAccess(String userId, String dataType) async {
    await createAuditTrail(
      userId: userId,
      action: 'Data Access',
      type: 'Data',
      details: 'Accessed $dataType data',
    );
  }

  static Future<void> logUserManagement(
    String adminUserId,
    String targetUserId,
    String action,
  ) async {
    await createAuditTrail(
      userId: adminUserId,
      action: 'User Management',
      type: 'Administration',
      details: '$action user: $targetUserId',
    );
  }

  static Future<void> logSystemConfig(
    String userId,
    String configType,
    String change,
  ) async {
    await createAuditTrail(
      userId: userId,
      action: 'System Configuration',
      type: 'Administration',
      details: 'Changed $configType: $change',
    );
  }
}
