import { createHmac } from 'crypto';
import { MercadoPagoClient, MercadoPagoError } from './mercadopago.client';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

describe('MercadoPagoClient', () => {
  const http = jest.fn<Promise<Response>, [string, RequestInit]>();
  const client = new MercadoPagoClient(
    {
      accessToken: 'TOKEN',
      apiUrl: 'https://mp',
      notificationUrl: 'https://billing/payments/webhook',
      webhookSecret: 'secret',
    },
    http,
  );

  beforeEach(() => http.mockReset());

  it('createPreference posts items, external_reference and idempotency key', async () => {
    http.mockReturnValue(okJson({ id: 'pref', init_point: 'u' }));
    await expect(
      client.createPreference({ orderId: 'o1', amount: 100 }),
    ).resolves.toEqual({
      id: 'pref',
      init_point: 'u',
    });
    const [url, init] = http.mock.calls[0];
    expect(url).toBe('https://mp/checkout/preferences');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer TOKEN',
      'X-Idempotency-Key': 'preference-o1',
    });
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      external_reference: 'o1',
      notification_url: 'https://billing/payments/webhook',
      items: [{ unit_price: 100, quantity: 1, currency_id: 'BRL' }],
    });
  });

  it('getPayment issues GET without body', async () => {
    http.mockReturnValue(okJson({ id: 1 }));
    await client.getPayment('1');
    expect(http.mock.calls[0][0]).toBe('https://mp/v1/payments/1');
    expect(http.mock.calls[0][1].body).toBeUndefined();
  });

  it('refund posts to refunds endpoint', async () => {
    http.mockReturnValue(okJson({}));
    await client.refund('1', 'refund-o1');
    expect(http.mock.calls[0][0]).toBe('https://mp/v1/payments/1/refunds');
    expect(http.mock.calls[0][1].headers).toMatchObject({
      'X-Idempotency-Key': 'refund-o1',
    });
  });

  it('throws MercadoPagoError on non-2xx', async () => {
    http.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('unauthorized'),
    } as Response);
    const err = await client.getPayment('1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MercadoPagoError);
    expect((err as MercadoPagoError).status).toBe(401);
  });

  describe('verifySignature', () => {
    const sign = (manifest: string) =>
      createHmac('sha256', 'secret').update(manifest).digest('hex');

    it('accepts a valid signature', () => {
      const v1 = sign('id:abc123;request-id:req;ts:1700;');
      expect(client.verifySignature(`ts=1700,v1=${v1}`, 'req', 'ABC123')).toBe(
        true,
      );
    });

    it('accepts a valid signature without request id', () => {
      const v1 = sign('id:1;ts:1700;');
      expect(client.verifySignature(`ts=1700, v1=${v1}`, undefined, '1')).toBe(
        true,
      );
    });

    it.each([[undefined], ['ts=1700'], ['ts=1700,v1=deadbeef']])(
      'rejects invalid header %p',
      (header) => {
        expect(client.verifySignature(header, 'req', '1')).toBe(false);
      },
    );

    it('skips validation when no secret is configured', () => {
      const dev = new MercadoPagoClient({ accessToken: 't', apiUrl: 'u' });
      expect(dev.verifySignature(undefined, undefined, '1')).toBe(true);
    });
  });
});
