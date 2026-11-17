import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { SagaEventConsumer } from './saga-event.consumer';

describe('SagaEventConsumer', () => {
  const send = jest.fn<Promise<unknown>, [unknown]>();
  const handle = jest.fn();
  const consumer = new SagaEventConsumer({ send } as never, 'q', {
    handle,
  } as never);

  beforeEach(() => jest.resetAllMocks());

  describe('parse', () => {
    it('parses raw delivery', () => {
      expect(
        SagaEventConsumer.parse('{"type":"BudgetApproved","orderId":"o1"}'),
      ).toEqual({ type: 'BudgetApproved', orderId: 'o1' });
    });

    it('parses SNS envelope with type attribute', () => {
      const body = JSON.stringify({
        Type: 'Notification',
        Message: JSON.stringify({ orderId: 'o1', paymentId: 'p' }),
        MessageAttributes: { type: { Value: 'PaymentConfirmed' } },
      });
      expect(SagaEventConsumer.parse(body)).toEqual({
        type: 'PaymentConfirmed',
        orderId: 'o1',
        paymentId: 'p',
      });
    });

    it('rejects unknown type and missing orderId', () => {
      expect(() => SagaEventConsumer.parse('{"type":"Foo"}')).toThrow();
      expect(() =>
        SagaEventConsumer.parse('{"type":"BudgetApproved"}'),
      ).toThrow();
    });
  });

  it('handles and deletes valid messages', async () => {
    send.mockResolvedValueOnce({
      Messages: [
        {
          Body: '{"type":"BudgetApproved","orderId":"o1"}',
          ReceiptHandle: 'r',
        },
      ],
    });
    await consumer.poll();
    expect(send.mock.calls[0][0]).toBeInstanceOf(ReceiveMessageCommand);
    expect(handle).toHaveBeenCalledWith({
      type: 'BudgetApproved',
      orderId: 'o1',
    });
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteMessageCommand);
  });

  it('keeps message when handler fails (redelivery/DLQ)', async () => {
    handle.mockRejectedValueOnce(new Error('boom'));
    await consumer.process({
      Body: '{"type":"BudgetApproved","orderId":"o1"}',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps poison messages without calling handler', async () => {
    await consumer.process({ Body: 'not-json' });
    expect(handle).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('start loops until shutdown and survives poll errors', async () => {
    jest.useFakeTimers();
    send.mockRejectedValueOnce(new Error('net')).mockImplementation(() => {
      consumer.onApplicationShutdown();
      return Promise.resolve({});
    });
    consumer.start();
    consumer.start();
    await jest.advanceTimersByTimeAsync(1000);
    jest.useRealTimers();
    expect(send.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
