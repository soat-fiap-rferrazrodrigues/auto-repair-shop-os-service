import { OrderMapper } from './order.mapper';
import { ServiceOrder } from '../entities/service-order.entity';
import { OrderStatus } from '../enums/order-status.enum';

const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
  ({
    id: 'order-1',
    status: OrderStatus.RECEIVED,
    totalPrice: 250,
    createdAt: new Date('2026-01-01'),
    approvedAt: null,
    startedAt: null,
    finishedAt: null,
    deliveredAt: null,
    vehicle: {
      plate: 'ABC1D23',
      brand: 'Toyota',
      model: 'Corolla',
      client: { name: 'John Doe' },
    },
    services: [{ service: { name: 'Oil Change' }, price: 150 }],
    parts: [{ part: { name: 'Oil Filter' }, quantity: 1, unitPrice: 45.9 }],
    ...overrides,
  }) as unknown as ServiceOrder;

describe('OrderMapper', () => {
  describe('toTrackResponse', () => {
    it('should map an order to a track response', () => {
      const order = buildOrder();
      const result = OrderMapper.toTrackResponse(order);

      expect(result.id).toBe('order-1');
      expect(result.status).toBe(OrderStatus.RECEIVED);
      expect(result.vehicle).toEqual({
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
      });
      expect(result.totalPrice).toBe(250);
      expect(result.services).toEqual([{ name: 'Oil Change', price: 150 }]);
      expect(result.parts).toEqual([
        { name: 'Oil Filter', quantity: 1, unitPrice: 45.9 },
      ]);
      expect(result.approvedAt).toBeNull();
      expect(result.startedAt).toBeNull();
      expect(result.finishedAt).toBeNull();
      expect(result.deliveredAt).toBeNull();
    });

    it('should include timestamps when set', () => {
      const startedAt = new Date('2026-01-02');
      const finishedAt = new Date('2026-01-03');
      const order = buildOrder({
        startedAt,
        finishedAt,
        status: OrderStatus.FINISHED,
      });
      const result = OrderMapper.toTrackResponse(order);
      expect(result.startedAt).toEqual(startedAt);
      expect(result.finishedAt).toEqual(finishedAt);
    });
  });

  describe('toListItem', () => {
    it('should map an order to a list item', () => {
      const order = buildOrder();
      const result = OrderMapper.toListItem(order);

      expect(result.id).toBe('order-1');
      expect(result.status).toBe(OrderStatus.RECEIVED);
      expect(result.totalPrice).toBe(250);
      expect(result.vehiclePlate).toBe('ABC1D23');
      expect(result.clientName).toBe('John Doe');
      expect(result.finishedAt).toBeNull();
    });

    it('should handle orders without vehicle or client gracefully', () => {
      const order = buildOrder({ vehicle: undefined });
      const result = OrderMapper.toListItem(order);
      expect(result.vehiclePlate).toBeUndefined();
      expect(result.clientName).toBeUndefined();
    });
  });

  describe('toList', () => {
    it('should map an array of orders to list items', () => {
      const orders = [buildOrder(), buildOrder({ id: 'order-2' })];
      const result = OrderMapper.toList(orders);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    it('should return empty array when given empty input', () => {
      expect(OrderMapper.toList([])).toEqual([]);
    });
  });
});
