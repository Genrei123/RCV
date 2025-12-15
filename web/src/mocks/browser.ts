// @ts-nocheck
// MSW worker for dev; excluded from app tsconfig so CI builds won't include this file.
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
