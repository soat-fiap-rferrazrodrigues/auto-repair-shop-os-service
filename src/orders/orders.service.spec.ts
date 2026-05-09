import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { ServiceOrder } from './entities/service-order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { ServicesService } from '../services/services.service';
import { PartsService } from '../parts/parts.service';
import { VehiclesService } from '../vehicles/vehicles.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockOrder: Partial<ServiceOrder> = {
    id: 'order-1',
    vehicleId: 'vehicle-1',
    status: OrderStatus.RECEIVED,
    totalPrice: 195.9,
    services: [],
    parts: [],
    createdAt: new Date(),
  };

  const mockOrdersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockServicesService = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'svc-1', name: 'Oil change', price: 150 }),
  };

  const mockPartsService = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'part-1', name: 'Filtro', unitPrice: 45.9 }),
    decreaseStock: jest.fn().mockResolvedValue(undefined),
  };

  const mockVehiclesService = {
    findOne: jest.fn().mockResolvedValue({ id: 'vehicle-1', plate: 'ABC1D23' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: mockOrdersRepository },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: PartsService, useValue: mockPartsService },
        { provide: VehiclesService, useValue: mockVehiclesService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order with services and parts', async () => {
      mockOrdersRepository.create.mockReturnValue(mockOrder);
      mockOrdersRepository.save.mockResolvedValue(mockOrder);

      const result = await service.create({
        vehicleId: 'vehicle-1',
        services: [{ serviceId: 'svc-1' }],
        parts: [{ partId: 'part-1', quantity: 1 }],
      });

      expect(result).toEqual(mockOrder);
      expect(mockVehiclesService.findOne).toHaveBeenCalledWith('vehicle-1');
      expect(mockServicesService.findOne).toHaveBeenCalledWith('svc-1');
      expect(mockPartsService.findOne).toHaveBeenCalledWith('part-1');
    });

    it('should create an order without parts', async () => {
      mockOrdersRepository.create.mockReturnValue(mockOrder);
      mockOrdersRepository.save.mockResolvedValue(mockOrder);

      const result = await service.create({
        vehicleId: 'vehicle-1',
        services: [{ serviceId: 'svc-1' }],
      });

      expect(result).toEqual(mockOrder);
    });
  });

  describe('findOne', () => {
    it('should return an order', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      const result = await service.findOne('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should transition RECEIVED → IN_DIAGNOSIS', async () => {
      const order = { ...mockOrder, status: OrderStatus.RECEIVED, parts: [] };
      mockOrdersRepository.findById.mockResolvedValue(order);
      mockOrdersRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.IN_DIAGNOSIS,
      });

      expect(result.status).toBe(OrderStatus.IN_DIAGNOSIS);
    });

    it('should reject invalid status transition', async () => {
      const order = { ...mockOrder, status: OrderStatus.RECEIVED };
      mockOrdersRepository.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus('order-1', { status: OrderStatus.FINISHED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should decrease stock on IN_EXECUTION', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.AWAITING_APPROVAL,
        parts: [{ partId: 'part-1', quantity: 2 }],
      };
      mockOrdersRepository.findById.mockResolvedValue(order);
      mockOrdersRepository.save.mockImplementation((o) => Promise.resolve(o));

      await service.updateStatus('order-1', {
        status: OrderStatus.IN_EXECUTION,
      });

      expect(mockPartsService.decreaseStock).toHaveBeenCalledWith('part-1', 2);
    });

    it('should set finishedAt on FINISHED', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.IN_EXECUTION,
        parts: [],
      };
      mockOrdersRepository.findById.mockResolvedValue(order);
      mockOrdersRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.FINISHED,
      });

      expect(result.finishedAt).toBeDefined();
    });
  });

  describe('action methods', () => {
    const setupOrder = (status: OrderStatus) => {
      const order = { ...mockOrder, status, parts: [] };
      mockOrdersRepository.findById.mockResolvedValue(order);
      mockOrdersRepository.save.mockImplementation((o) => Promise.resolve(o));
    };

    it('startDiagnosis → IN_DIAGNOSIS', async () => {
      setupOrder(OrderStatus.RECEIVED);
      const result = await service.startDiagnosis('order-1');
      expect(result.status).toBe(OrderStatus.IN_DIAGNOSIS);
    });

    it('sendBudget → AWAITING_APPROVAL', async () => {
      setupOrder(OrderStatus.IN_DIAGNOSIS);
      const result = await service.sendBudget('order-1');
      expect(result.status).toBe(OrderStatus.AWAITING_APPROVAL);
    });

    it('approveBudget → IN_EXECUTION', async () => {
      setupOrder(OrderStatus.AWAITING_APPROVAL);
      const result = await service.approveBudget('order-1');
      expect(result.status).toBe(OrderStatus.IN_EXECUTION);
    });

    it('rejectBudget → RECEIVED', async () => {
      setupOrder(OrderStatus.AWAITING_APPROVAL);
      const result = await service.rejectBudget('order-1');
      expect(result.status).toBe(OrderStatus.RECEIVED);
    });

    it('finishExecution → FINISHED', async () => {
      setupOrder(OrderStatus.IN_EXECUTION);
      const result = await service.finishExecution('order-1');
      expect(result.status).toBe(OrderStatus.FINISHED);
    });

    it('deliver → DELIVERED', async () => {
      setupOrder(OrderStatus.FINISHED);
      const result = await service.deliver('order-1');
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('trackOrder', () => {
    const trackingOrder = {
      ...mockOrder,
      vehicle: {
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
        clientId: 'client-1',
      },
      services: [{ service: { name: 'Oil change' }, price: 150 }],
      parts: [{ part: { name: 'Filtro' }, quantity: 1, unitPrice: 45.9 }],
    };

    it('should return tracking info for admin', async () => {
      mockOrdersRepository.findById.mockResolvedValue(trackingOrder);

      const result = await service.trackOrder('order-1', {
        role: 'admin',
        clientId: null,
      });

      expect(result.id).toBe('order-1');
      expect(result.status).toBe(OrderStatus.RECEIVED);
      expect(result.vehicle.plate).toBe('ABC1D23');
    });

    it('should return tracking info for client that owns the order', async () => {
      mockOrdersRepository.findById.mockResolvedValue(trackingOrder);

      const result = await service.trackOrder('order-1', {
        role: 'client',
        clientId: 'client-1',
      });

      expect(result.id).toBe('order-1');
    });

    it('should throw ForbiddenException for client that does not own the order', async () => {
      mockOrdersRepository.findById.mockResolvedValue(trackingOrder);

      await expect(
        service.trackOrder('order-1', {
          role: 'client',
          clientId: 'other-client',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when client has no clientId', async () => {
      mockOrdersRepository.findById.mockResolvedValue(trackingOrder);

      await expect(
        service.trackOrder('order-1', { role: 'client', clientId: null }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
