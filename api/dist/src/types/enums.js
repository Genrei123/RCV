"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanResult = exports.Roles = exports.ProductSubClassification = exports.ProductType = exports.SecurityCode = void 0;
var SecurityCode;
(function (SecurityCode) {
    SecurityCode["NOT_AUTHORIZED"] = "NOT_AUTHORIZED";
    SecurityCode["INVALID_INPUT"] = "INVALID_INPUT";
    SecurityCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    SecurityCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(SecurityCode || (exports.SecurityCode = SecurityCode = {}));
var ProductType;
(function (ProductType) {
    ProductType[ProductType["Others"] = 0] = "Others";
    ProductType[ProductType["Raw Product"] = 1] = "Raw Product";
    ProductType[ProductType["Processed Product"] = 2] = "Processed Product";
    ProductType[ProductType["Packaged Product"] = 3] = "Packaged Product";
})(ProductType || (exports.ProductType = ProductType = {}));
var ProductSubClassification;
(function (ProductSubClassification) {
    ProductSubClassification[ProductSubClassification["Gamecock Feeds"] = 0] = "Gamecock Feeds";
    ProductSubClassification[ProductSubClassification["Layer Feeds"] = 1] = "Layer Feeds";
})(ProductSubClassification || (exports.ProductSubClassification = ProductSubClassification = {}));
var Roles;
(function (Roles) {
    Roles[Roles["Unverified"] = 0] = "Unverified";
    Roles[Roles["Agent"] = 1] = "Agent";
    Roles[Roles["System_Admin"] = 2] = "System_Admin";
})(Roles || (exports.Roles = Roles = {}));
var ScanResult;
(function (ScanResult) {
    ScanResult[ScanResult["Authentic"] = 0] = "Authentic";
    ScanResult[ScanResult["Tampered"] = 1] = "Tampered";
    ScanResult[ScanResult["Expired"] = 2] = "Expired";
    ScanResult[ScanResult["Unregistered"] = 3] = "Unregistered";
})(ScanResult || (exports.ScanResult = ScanResult = {}));
//# sourceMappingURL=enums.js.map