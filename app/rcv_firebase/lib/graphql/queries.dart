// GraphQL Queries for Audit Trail functionality

class GraphQLQueries {
  // Get all audit trails with optional filters
  static const String getAuditTrails = '''
    query GetAuditTrails(\$filters: AuditTrailFilters, \$page: Int, \$limit: Int) {
      auditTrails(filters: \$filters, page: \$page, limit: \$limit) {
        id
        userId
        action
        type
        details
        timestamp
        ipAddress
        user {
          _id
          firstName
          lastName
          fullName
        }
      }
    }
  ''';

  // Get paginated audit trails
  static const String getPaginatedAuditTrails = '''
    query GetPaginatedAuditTrails(\$userId: String, \$page: Int, \$limit: Int) {
      auditTrails(userId: \$userId, page: \$page, limit: \$limit) {
        id
        userId
        action
        timestamp
        details
      }
      auditTrailsCount(userId: \$userId)
    }
  ''';

  // Get user information
  static const String getUser = '''
    query GetUser(\$id: String!) {
      user(id: \$id) {
        id
        name
        email
      }
    }
  ''';
}

class GraphQLMutations {
  // Create new audit trail
  static const String createAuditTrail = '''
    mutation CreateAuditTrail(\$input: CreateAuditTrailInput!) {
      createAuditTrail(input: \$input) {
        id
        userId
        action
        timestamp
        details
      }
    }
  ''';
}

// Input types for mutations
class GraphQLInputs {
  static Map<String, dynamic> createAuditTrailInput({
    required String userId,
    required String action,
    required String type,
    String? details,
    String? ipAddress,
    String? userAgent,
    String? location,
  }) {
    return {
      'userId': userId,
      'action': action,
      'type': type,
      'details': details,
      'ipAddress': ipAddress,
      'userAgent': userAgent,
      'location': location,
    };
  }
}
