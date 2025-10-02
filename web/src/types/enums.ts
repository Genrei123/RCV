export const SecurityCode = {
    NOT_AUTHORIZED: 'NOT_AUTHORIZED',
    INVALID_INPUT: 'INVALID_INPUT',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export const ProductType = {
    Others: 0,
    RawProduct: 1,
    ProcessedProduct: 2,
    PackagedProduct: 3,
} as const;

export const ProductSubClassification = {
    GamecockFeeds: 0,
    LayerFeeds: 1,
} as const;

export const Roles = {
    Unverified: 0,
    Agent: 1,
    System_Admin: 2,
} as const;

export const ScanResult = {
    Authentic: 0,
    Tampered: 1,
    Expired: 2,
    Unregistered: 3,
} as const;

export type SecurityCode = typeof SecurityCode[keyof typeof SecurityCode];
export type ProductType = typeof ProductType[keyof typeof ProductType];
export type ProductSubClassification = typeof ProductSubClassification[keyof typeof ProductSubClassification];
export type Roles = typeof Roles[keyof typeof Roles];
export type ScanResult = typeof ScanResult[keyof typeof ScanResult];
