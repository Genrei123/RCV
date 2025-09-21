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