import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderUseCase } from './create-order.use-case';
import { OrdersRepository } from '../repositories/orders.repository';
import { ServicesService } from '../../services/services.service';
import { PartsService } from '../../parts/parts.service';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { OrderStatus } from '../enums/order-status.enum';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let ordersRepository: OrdersRepository;
  let servicesService: ServicesService;
  let partsService: PartsService;
  let vehiclesService: VehiclesService;

  beforeEach(async () => {
    ordersRepository = {
      create: jest.fn().mockImplementation((data: object) => data),
      save: jest
        .fn()
        .mockImplementation((o) => Promise.resolve({ id: 'new-id', ...o })),
    } as unknown as OrdersRepository;
    servicesService = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', price: 100 }),
    } as unknown as ServicesService;
    partsService = {
      findOne: jest.fn().mockResolvedValue({ id: 'p1', unitPrice: 50 }),
    } as unknown as PartsService;
    vehiclesService = {
      findOne: jest.fn().mockResolvedValue({ id: 'v1' }),
    } as unknown as VehiclesService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: ServicesService, useValue: servicesService },
        { provide: PartsService, useValue: partsService },
        { provide: VehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    useCase = module.get(CreateOrderUseCase);
  });

  it('should create an order with correct total price', async () => {
    const dto = {
      vehicleId: 'v1',
      services: [{ serviceId: 's1' }],
      parts: [{ partId: 'p1', quantity: 3 }],
    };

    const result = await useCase.execute(dto);

    expect(result.id).toBe('new-id');
    expect(result.status).toBe(OrderStatus.RECEIVED);
    expect(result.totalPrice).toBe(250); // 100 + 50*3
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vehiclesService.findOne).toHaveBeenCalledWith('v1');
  });

  it('should create an order without parts', async () => {
    const dto = {
      vehicleId: 'v1',
      services: [{ serviceId: 's1' }],
    };

    const result = await useCase.execute(dto);
    expect(result.totalPrice).toBe(100);
  });
});
