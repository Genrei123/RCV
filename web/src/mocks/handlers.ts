// @ts-nocheck
// Dev-only MSW mock handlers. Type checking is disabled and this folder is
// excluded from the app tsconfig so CI/production builds won't fail if `msw`
// isn't installed as a dependency.
import { rest } from 'msw';

// Sample in-memory store for mocked data
const companies = [
  {
    _id: 'c-agrimate',
    name: 'AGRIMATE INC.',
    licenseNumber: 'LTO-000004',
    address: '123 Farm Road'
  }
];

const products: any[] = [];

export const handlers = [
  // Get companies (paged)
  rest.get(/\/company\/companies(\?.*)?$/, (req, res, ctx) => {
    const url = req.url;
    // optional search handling
    const search = url.searchParams.get('search') || '';
    const filtered = companies.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.licenseNumber.toLowerCase().includes(search.toLowerCase())
    );
    return res(
      ctx.status(200),
      ctx.json({ companies: filtered, pagination: { total: filtered.length } })
    );
  }),

  // Create company
  rest.post(/\/company\/companies$/, async (req, res, ctx) => {
    const body = await req.json();
    // simple uniqueness check on licenseNumber
    const exists = companies.find(
      (c) => c.licenseNumber && body.licenseNumber && c.licenseNumber === body.licenseNumber
    );
    if (exists) {
      return res(
        ctx.status(400),
        ctx.json({ message: 'License number already exists' })
      );
    }

    const company = {
      _id: `c-mock-${Date.now()}`,
      name: body.name || 'Unnamed',
      address: body.address || '',
      licenseNumber: body.licenseNumber || ''
    };
    companies.push(company);
    return res(ctx.status(201), ctx.json({ message: 'Company created', company }));
  }),

  // Create product
  rest.post(/\/product\/products$/, async (req, res, ctx) => {
    const body = await req.json();

    // Basic validation mock: require companyId and LTONumber
    if (!body.companyId || !body.LTONumber) {
      return res(ctx.status(400), ctx.json({ message: 'Missing required fields' }));
    }

    const product = {
      _id: `p-mock-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString()
    };
    products.push(product);

    // Simulate registeredBy user info
    const registeredBy = { _id: 'u-mock-1', name: 'Mock User', email: 'mock@example.com' };

    return res(
      ctx.status(201),
      ctx.json({ success: true, message: 'Product created', product, registeredBy })
    );
  }),

  // Get product by id (optional)
  rest.get(/\/product\/products\/[^/]+$/, (req, res, ctx) => {
    const path = req.url.pathname;
    const id = path.split('/').pop();
    const product = products.find((p) => p._id === id);
    if (!product) return res(ctx.status(404), ctx.json({ message: 'Not found' }));
    return res(ctx.status(200), ctx.json({ product }));
  })
];
