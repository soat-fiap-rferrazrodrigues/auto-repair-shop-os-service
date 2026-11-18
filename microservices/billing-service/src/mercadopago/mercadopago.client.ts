import { createHmac, timingSafeEqual } from 'crypto';

export interface MercadoPagoConfig {
  accessToken: string;
  apiUrl: string;
  notificationUrl?: string;
  webhookSecret?: string;
}

export interface MpPreference {
  id: string;
  init_point: string;
}

export interface MpPayment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
}

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * Thin REST client for Mercado Pago (Checkout Pro + Payments API).
 * https://www.mercadopago.com.br/developers/pt/reference
 */
export class MercadoPagoClient {
  constructor(
    private readonly config: MercadoPagoConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  createPreference(input: {
    orderId: string;
    amount: number;
  }): Promise<MpPreference> {
    return this.request<MpPreference>('POST', '/checkout/preferences', {
      body: {
        items: [
          {
            id: input.orderId,
            title: `Ordem de serviço ${input.orderId}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: input.amount,
          },
        ],
        external_reference: input.orderId,
        notification_url: this.config.notificationUrl,
      },
      idempotencyKey: `preference-${input.orderId}`,
    });
  }

  getPayment(paymentId: string): Promise<MpPayment> {
    return this.request<MpPayment>(
      'GET',
      `/v1/payments/${encodeURIComponent(paymentId)}`,
    );
  }

  refund(paymentId: string, idempotencyKey: string): Promise<unknown> {
    return this.request(
      'POST',
      `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
      { body: {}, idempotencyKey },
    );
  }

  /**
   * Validates the `x-signature` header (ts=...,v1=...) of a webhook.
   * Manifest: `id:{data.id};request-id:{x-request-id};ts:{ts};`
   * Returns true when no secret is configured (local development only).
   */
  verifySignature(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    dataId: string,
  ): boolean {
    const secret = this.config.webhookSecret;
    if (!secret) return true;
    if (!xSignature) return false;

    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const [k, ...v] = p.trim().split('=');
        return [k, v.join('=')];
      }),
    );
    const { ts, v1 } = parts;
    if (!ts || !v1) return false;

    const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
    let manifest = `id:${id};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    manifest += `ts:${ts};`;

    const expected = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey;

    const res = await this.http(`${this.config.apiUrl}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    if (!res.ok) {
      throw new MercadoPagoError(
        `Mercado Pago ${method} ${path} failed: ${res.status} ${await res.text()}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  }
}
