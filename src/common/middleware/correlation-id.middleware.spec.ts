import type { NextFunction, Request, Response } from 'express';
import {
  CORRELATION_ID_HEADER,
  CorrelatedRequest,
  CorrelationIdMiddleware,
} from './correlation-id.middleware';
import { currentCorrelationId } from '../logger/correlation-context';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  const run = (headers: Record<string, unknown>) => {
    const req = { headers } as unknown as Request;
    const setHeader = jest.fn();
    const next: NextFunction = jest.fn();
    middleware.use(req, { setHeader } as unknown as Response, next);
    return { req: req as CorrelatedRequest, setHeader, next };
  };

  it('reuses an incoming id', () => {
    const { req, setHeader, next } = run({ [CORRELATION_ID_HEADER]: 'r-1' });
    expect(req.correlationId).toBe('r-1');
    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'r-1');
    expect(next).toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ [CORRELATION_ID_HEADER]: '' }],
    [{ [CORRELATION_ID_HEADER]: ['a'] }],
  ])('generates a uuid when header is missing/invalid (%j)', (headers) => {
    const { req } = run(headers);
    expect(req.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('exposes the id to the async context only while handling', () => {
    let seen: string | undefined;
    middleware.use(
      { headers: { [CORRELATION_ID_HEADER]: 'r-2' } } as unknown as Request,
      { setHeader: jest.fn() } as unknown as Response,
      () => {
        seen = currentCorrelationId();
      },
    );
    expect(seen).toBe('r-2');
    expect(currentCorrelationId()).toBeUndefined();
  });
});
