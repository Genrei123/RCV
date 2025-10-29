import type { Request } from "express";

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginationLinks {
  first: string;
  prev: string | null;
  next: string | null;
  last: string;
}

export function parsePageParams(
  req: Request,
  defaultLimit = 10,
  maxLimit = 100
) {
  const rawPage = Array.isArray(req.query.page)
    ? req.query.page[0]
    : req.query.page;
  const rawLimit = Array.isArray(req.query.limit)
    ? req.query.limit[0]
    : req.query.limit;
  let page = Number(rawPage) || 1;
  let limit = Number(rawLimit) || defaultLimit;
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function basePath(req: Request) {
  // prefer baseUrl+path (relative) so links are relative to API root
  return `${req.baseUrl || ""}${req.path || ""}`;
}

export function buildLinks(
  req: Request,
  page: number,
  limit: number,
  totalPages: number
) {
  const path = basePath(req);
  const first = `${path}?page=1&limit=${limit}`;
  const last = `${path}?page=${totalPages}&limit=${limit}`;
  const prev =
    page > 1 ? `${path}?page=${Math.max(1, page - 1)}&limit=${limit}` : null;
  const next =
    page < totalPages
      ? `${path}?page=${Math.min(totalPages, page + 1)}&limit=${limit}`
      : null;
  return { first, prev, next, last } as PaginationLinks;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
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
