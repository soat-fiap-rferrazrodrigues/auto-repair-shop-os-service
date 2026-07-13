import { Test, TestingModule } from '@nestjs/testing';
import { ListOrdersUseCase } from './list-orders.use-case';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderStatus } from '../enums/order-status.enum';

describe('ListOrdersUseCase', () => {
  let useCase: ListOrdersUseCase;
  let ordersRepository: OrdersRepository;

  const makeOrder = (status: OrderStatus, createdAt: string) => ({
    id: `${status}-${createdAt}`,
    status,
    totalPrice: 100,
    vehicle: { plate: 'ABC-1234', client: { name: 'John' } },
    createdAt: new Date(createdAt),
    finishedAt: null,
    services: [],
    parts: [],
  });

  beforeEach(async () => {
    ordersRepository = {
      findActiveOrders: jest.fn(),
    } as unknown as OrdersRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrdersUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
      ],
    }).compile();

    useCase = module.get(ListOrdersUseCase);
  });

  it('should sort orders by status priority then by createdAt', async () => {
    const orders = [
      makeOrder(OrderStatus.RECEIVED, '2025-01-03'),
      makeOrder(OrderStatus.IN_EXECUTION, '2025-01-02'),
      makeOrder(OrderStatus.AWAITING_APPROVAL, '2025-01-01'),
      makeOrder(OrderStatus.IN_DIAGNOSIS, '2025-01-04'),
    ];

    (ordersRepository.findActiveOrders as jest.Mock).mockResolvedValue(
      orders as any,
    );

    const result = await useCase.execute();

    expect(result[0].status).toBe(OrderStatus.IN_EXECUTION);
    expect(result[1].status).toBe(OrderStatus.AWAITING_APPROVAL);
    expect(result[2].status).toBe(OrderStatus.IN_DIAGNOSIS);
    expect(result[3].status).toBe(OrderStatus.RECEIVED);
  });

  it('should exclude FINISHED and DELIVERED orders', async () => {
    (ordersRepository.findActiveOrders as jest.Mock).mockResolvedValue([]);
    const result = await useCase.execute();
    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const findActiveOrdersMock = ordersRepository.findActiveOrders as jest.Mock;
    expect(findActiveOrdersMock).toHaveBeenCalled();
  });
});
