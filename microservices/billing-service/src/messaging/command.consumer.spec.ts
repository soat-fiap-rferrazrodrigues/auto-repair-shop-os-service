import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { CommandConsumer } from './command.consumer';

describe('CommandConsumer', () => {
  const send = jest.fn<Promise<unknown>, [unknown]>();
  const billing = {
    generateBudget: jest.fn(),
    createPayment: jest.fn(),
    refundPayment: jest.fn(),
  };
  const consumer = new CommandConsumer(
    { send } as never,
    'q',
    billing as never,
  );

  beforeEach(() => jest.resetAllMocks());

  describe('parse', () => {
    it('reads type from the SNS envelope attributes', () => {
      const Body = JSON.stringify({
        Type: 'Notification',
        Message: JSON.stringify({ orderId: 'o1', items: [], total: 0 }),
        MessageAttributes: {
          type: { Type: 'String', Value: 'billing.GenerateBudget' },
        },
      });
      expect(CommandConsumer.parse({ Body })).toEqual({
        type: 'billing.GenerateBudget',
        orderId: 'o1',
        items: [],
        total: 0,
      });
    });

    it('reads type from SQS attributes on raw delivery', () => {
      expect(
        CommandConsumer.parse({
          Body: '{"orderId":"o1"}',
          MessageAttributes: {
            type: { DataType: 'String', StringValue: 'billing.CreatePayment' },
          },
        }),
      ).toEqual({ type: 'billing.CreatePayment', orderId: 'o1' });
    });

    it('reads type from body', () => {
      expect(
        CommandConsumer.parse({
          Body: '{"type":"billing.RefundPayment","orderId":"o1"}',
        }).type,
      ).toBe('billing.RefundPayment');
    });

    it('rejects unknown commands and missing orderId', () => {
      expect(() =>
        CommandConsumer.parse({ Body: '{"type":"x","orderId":"o"}' }),
      ).toThrow();
      expect(() =>
        CommandConsumer.parse({ Body: '{"type":"billing.CreatePayment"}' }),
      ).toThrow();
      expect(() => CommandConsumer.parse({})).toThrow();
    });
  });

  it.each([
    ['billing.GenerateBudget', 'generateBudget'],
    ['billing.CreatePayment', 'createPayment'],
    ['billing.RefundPayment', 'refundPayment'],
  ] as const)('dispatches %s and deletes the message', async (type, method) => {
    send.mockResolvedValueOnce({
      Messages: [
        { Body: JSON.stringify({ type, orderId: 'o1' }), ReceiptHandle: 'r' },
      ],
    });
    await consumer.poll();
    expect(send.mock.calls[0][0]).toBeInstanceOf(ReceiveMessageCommand);
    expect(billing[method]).toHaveBeenCalled();
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteMessageCommand);
  });

  it('keeps the message when the handler fails', async () => {
    billing.refundPayment.mockRejectedValueOnce(new Error('mp down'));
    await consumer.process({
      Body: '{"type":"billing.RefundPayment","orderId":"o1"}',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps poison messages', async () => {
    await consumer.process({ Body: 'nope' });
    expect(send).not.toHaveBeenCalled();
  });

  it('poll with empty response does nothing', async () => {
    send.mockResolvedValueOnce({});
    await consumer.poll();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('loop survives errors and stops on shutdown', async () => {
    jest.useFakeTimers();
    send.mockRejectedValueOnce(new Error('net')).mockImplementation(() => {
      consumer.onApplicationShutdown();
      return Promise.resolve({});
    });
    consumer.start();
    consumer.start();
    await jest.advanceTimersByTimeAsync(1000);
    jest.useRealTimers();
    expect(send.mock.calls.length).toBe(2);
  });
});
