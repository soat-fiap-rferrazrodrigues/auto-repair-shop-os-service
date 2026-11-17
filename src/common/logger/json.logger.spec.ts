import { JsonLogger } from './json.logger';
import { withCorrelation } from './correlation-context';

describe('JsonLogger', () => {
  let out: jest.SpyInstance;
  let err: jest.SpyInstance;
  const logger = new JsonLogger('Ctx');

  const last = (spy: jest.SpyInstance): Record<string, unknown> => {
    const calls = spy.mock.calls as [string][];
    return JSON.parse(calls[calls.length - 1][0]) as Record<string, unknown>;
  };

  beforeEach(() => {
    out = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    err = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['log', 'info'],
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
  ] as const)('%s writes level %s to stdout', (method, level) => {
    logger[method]('hello', 'Other');
    expect(last(out)).toMatchObject({
      level,
      message: 'hello',
      context: 'Other',
    });
  });

  it('error goes to stderr with stack and correlation id', () => {
    withCorrelation('abc', () => logger.error(new Error('boom'), 'trace-here'));
    expect(last(err)).toMatchObject({
      level: 'error',
      message: 'boom',
      stack: 'trace-here',
      correlation_id: 'abc',
      context: 'Ctx',
    });
  });

  it('falls back to orderId found in the message', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    logger.log(`saga event=X orderId=${id}`);
    expect(last(out).correlation_id).toBe(id);
    logger.log('no id');
    expect(last(out)).not.toHaveProperty('correlation_id');
  });

  it('stringifies objects and falls back for circular values', () => {
    logger.log({ a: 1 });
    expect(last(out).message).toBe('{"a":1}');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    logger.log(circular);
    expect(last(out).message).toBe('[object Object]');
  });
});
