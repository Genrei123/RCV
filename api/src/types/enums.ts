export enum SecurityCode {
    NOT_AUTHORIZED = 'NOT_AUTHORIZED',
    INVALID_INPUT = 'INVALID_INPUT',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export enum ProductType {
    "Others",
    "Raw Product",
    "Processed Product",
    "Packaged Product",
}

export enum ProductSubClassification {
    "Gamecock Feeds",
    "Layer Feeds",
}

export enum Roles {
    "Unverified",
    "Agent",
    "System_Admin",
}

export enum ScanResult {
    "Authentic",
    "Tampered",
    "Expired",
    "Unregistered",
}

//Analytics
export enum ComplianceStatus {
    COMPLIANT = 'COMPLIANT',
    NON_COMPLIANT = 'NON_COMPLIANT',
    FRAUDULENT = 'FRAUDULENT',
}

export enum NonComplianceReason {
    NO_LTO_NUMBER = 'NO_LTO_NUMBER',
    NO_CFPR_NUMBER = 'NO_CFPR_NUMBER',
    EXPIRED_PRODUCT = 'EXPIRED_PRODUCT',
    COUNTERFEIT = 'COUNTERFEIT',
    MISLABELED = 'MISLABELED',
    OTHERS = 'OTHERS',
}
