"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageParams = parsePageParams;
exports.buildLinks = buildLinks;
exports.buildPaginationMeta = buildPaginationMeta;
function parsePageParams(req, defaultLimit = 10, maxLimit = 100) {
    const rawPage = Array.isArray(req.query.page)
        ? req.query.page[0]
        : req.query.page;
    const rawLimit = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
    let page = Number(rawPage) || 1;
    let limit = Number(rawLimit) || defaultLimit;
    if (Number.isNaN(page) || page < 1)
        page = 1;
    if (Number.isNaN(limit) || limit < 1)
        limit = defaultLimit;
    if (limit > maxLimit)
        limit = maxLimit;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function basePath(req) {
    // prefer baseUrl+path (relative) so links are relative to API root
    return `${req.baseUrl || ""}${req.path || ""}`;
}
function buildLinks(req, page, limit, totalPages) {
    const path = basePath(req);
    const first = `${path}?page=1&limit=${limit}`;
    const last = `${path}?page=${totalPages}&limit=${limit}`;
    const prev = page > 1 ? `${path}?page=${Math.max(1, page - 1)}&limit=${limit}` : null;
    const next = page < totalPages
        ? `${path}?page=${Math.min(totalPages, page + 1)}&limit=${limit}`
        : null;
    return { first, prev, next, last };
}
function buildPaginationMeta(page, limit, totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        total_items: totalItems,
        has_next: page < totalPages,
        has_previous: page > 1,
    };
}
//# sourceMappingURL=pagination.js.map