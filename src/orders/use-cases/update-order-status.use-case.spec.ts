import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateOrderStatusUseCase } from './update-order-status.use-case';
import { OrdersRepository } from '../repositories/orders.repository';
import { PartsService } from '../../parts/parts.service';
import { OrderStatus } from '../enums/order-status.enum';

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;
  let ordersRepository: OrdersRepository;
  let partsService: PartsService;

  const mockOrder = {
    id: 'order-1',
    status: OrderStatus.RECEIVED,
    parts: [{ partId: 'part-1', quantity: 2 }],
    vehicle: { clientId: 'client-1' },
  };

  beforeEach(async () => {
    ordersRepository = {
      findById: jest.fn(),
      save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
    } as unknown as OrdersRepository;
    partsService = {
      decreaseStock: jest.fn().mockResolvedValue(undefined),
    } as unknown as PartsService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrderStatusUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: PartsService, useValue: partsService },
      ],
    }).compile();

    useCase = module.get(UpdateOrderStatusUseCase);
  });

  it('should throw NotFoundException if order not found', async () => {
    (ordersRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      useCase.execute('bad-id', { status: OrderStatus.IN_DIAGNOSIS }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should transition RECEIVED → IN_DIAGNOSIS', async () => {
    (ordersRepository.findById as jest.Mock).mockResolvedValue({
      ...mockOrder,
    } as any);
    const result = await useCase.execute('order-1', {
      status: OrderStatus.IN_DIAGNOSIS,
    });
    expect(result.status).toBe(OrderStatus.IN_DIAGNOSIS);
  });

  it('should reject invalid transition RECEIVED → FINISHED', async () => {
    (ordersRepository.findById as jest.Mock).mockResolvedValue({
      ...mockOrder,
    } as any);
    await expect(
      useCase.execute('order-1', { status: OrderStatus.FINISHED }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should decrease stock on IN_EXECUTION transition', async () => {
    const awaitingOrder = {
      ...mockOrder,
      status: OrderStatus.AWAITING_APPROVAL,
    };
    (ordersRepository.findById as jest.Mock).mockResolvedValue(
      awaitingOrder as any,
    );
    await useCase.execute('order-1', { status: OrderStatus.IN_EXECUTION });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(partsService.decreaseStock as jest.Mock).toHaveBeenCalledWith(
      'part-1',
      2,
    );
  });

  it('should set finishedAt on FINISHED transition', async () => {
    const executingOrder = {
      ...mockOrder,
      status: OrderStatus.IN_EXECUTION,
      parts: [],
    };
    (ordersRepository.findById as jest.Mock).mockResolvedValue(
      executingOrder as any,
    );
    const result = await useCase.execute('order-1', {
      status: OrderStatus.FINISHED,
    });
    expect(result.finishedAt).toBeInstanceOf(Date);
  });
});
