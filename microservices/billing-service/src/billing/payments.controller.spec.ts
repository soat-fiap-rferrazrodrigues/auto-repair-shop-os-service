import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const billing = {
    findPayment: jest.fn(),
    handlePaymentNotification: jest.fn(),
  };
  const mp = { verifySignature: jest.fn() };
  const controller = new PaymentsController(billing as never, mp as never);

  beforeEach(() => jest.resetAllMocks());

  it('returns the checkout info', async () => {
    billing.findPayment.mockResolvedValue({
      orderId: 'o1',
      status: 'PENDING',
      amount: '100.00',
      checkoutUrl: 'u',
    });
    await expect(controller.find('o1')).resolves.toEqual({
      orderId: 'o1',
      status: 'PENDING',
      amount: 100,
      checkoutUrl: 'u',
    });
  });

  it('404 when payment does not exist', async () => {
    billing.findPayment.mockResolvedValue(null);
    await expect(controller.find('o1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('processes signed payment notifications', async () => {
    mp.verifySignature.mockReturnValue(true);
    await controller.webhook(
      { type: 'payment', data: { id: 123 } },
      undefined,
      'sig',
      'req',
    );
    expect(mp.verifySignature).toHaveBeenCalledWith('sig', 'req', '123');
    expect(billing.handlePaymentNotification).toHaveBeenCalledWith('123');
  });

  it('prefers data.id query param and derives type from action', async () => {
    mp.verifySignature.mockReturnValue(true);
    await controller.webhook({ action: 'payment.updated' }, '9', 'sig', 'req');
    expect(billing.handlePaymentNotification).toHaveBeenCalledWith('9');
  });

  it('rejects invalid signatures', async () => {
    mp.verifySignature.mockReturnValue(false);
    await expect(
      controller.webhook(
        { type: 'payment', data: { id: 1 } },
        undefined,
        'x',
        'y',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(billing.handlePaymentNotification).not.toHaveBeenCalled();
  });

  it.each([
    [{ type: 'merchant_order', data: { id: 1 } }],
    [{ type: 'payment' }],
    [{}],
  ])('acknowledges and ignores other notifications %#', async (body) => {
    await expect(
      controller.webhook(body, undefined, undefined, undefined),
    ).resolves.toEqual({
      received: true,
    });
    expect(billing.handlePaymentNotification).not.toHaveBeenCalled();
  });
});
