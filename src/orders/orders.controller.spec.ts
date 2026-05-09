import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrder = {
    id: 'order-1',
    status: 'RECEIVED',
    vehicleId: 'vehicle-1',
    clientId: 'client-1',
  };

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    startDiagnosis: jest.fn(),
    sendBudget: jest.fn(),
    approveBudget: jest.fn(),
    rejectBudget: jest.fn(),
    finishExecution: jest.fn(),
    deliver: jest.fn(),
    updateStatus: jest.fn(),
    trackOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);
      const result = await controller.create({ vehicleId: 'vehicle-1' } as any);
      expect(mockOrdersService.create).toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      mockOrdersService.findAll.mockResolvedValue([mockOrder]);
      const result = await controller.findAll();
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      mockOrdersService.findOne.mockResolvedValue(mockOrder);
      const result = await controller.findOne('order-1');
      expect(mockOrdersService.findOne).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('startDiagnosis', () => {
    it('should start diagnosis and return updated order', async () => {
      const updated = { ...mockOrder, status: 'IN_DIAGNOSIS' };
      mockOrdersService.startDiagnosis.mockResolvedValue(updated);
      const result = await controller.startDiagnosis('order-1');
      expect(mockOrdersService.startDiagnosis).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('IN_DIAGNOSIS');
    });
  });

  describe('sendBudget', () => {
    it('should send budget and return updated order', async () => {
      const updated = { ...mockOrder, status: 'AWAITING_APPROVAL' };
      mockOrdersService.sendBudget.mockResolvedValue(updated);
      const result = await controller.sendBudget('order-1');
      expect(mockOrdersService.sendBudget).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('AWAITING_APPROVAL');
    });
  });

  describe('approveBudget', () => {
    it('should approve budget and return updated order', async () => {
      const updated = { ...mockOrder, status: 'IN_EXECUTION' };
      mockOrdersService.approveBudget.mockResolvedValue(updated);
      const result = await controller.approveBudget('order-1');
      expect(mockOrdersService.approveBudget).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('IN_EXECUTION');
    });
  });

  describe('rejectBudget', () => {
    it('should reject budget and return updated order', async () => {
      const updated = { ...mockOrder, status: 'RECEIVED' };
      mockOrdersService.rejectBudget.mockResolvedValue(updated);
      const result = await controller.rejectBudget('order-1');
      expect(mockOrdersService.rejectBudget).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('RECEIVED');
    });
  });

  describe('finish', () => {
    it('should finish execution and return updated order', async () => {
      const updated = { ...mockOrder, status: 'FINISHED' };
      mockOrdersService.finishExecution.mockResolvedValue(updated);
      const result = await controller.finish('order-1');
      expect(mockOrdersService.finishExecution).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('FINISHED');
    });
  });

  describe('deliver', () => {
    it('should deliver and return updated order', async () => {
      const updated = { ...mockOrder, status: 'DELIVERED' };
      mockOrdersService.deliver.mockResolvedValue(updated);
      const result = await controller.deliver('order-1');
      expect(mockOrdersService.deliver).toHaveBeenCalledWith('order-1');
      expect(result.status).toBe('DELIVERED');
    });
  });

  describe('updateStatus', () => {
    it('should force update status', async () => {
      const updated = { ...mockOrder, status: 'IN_DIAGNOSIS' };
      mockOrdersService.updateStatus.mockResolvedValue(updated);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.updateStatus('order-1', {
        status: 'IN_DIAGNOSIS',
      } as any);
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', {
        status: 'IN_DIAGNOSIS',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('trackOrder', () => {
    it('should track an order for the given user', async () => {
      mockOrdersService.trackOrder.mockResolvedValue(mockOrder);
      const req = { user: { role: 'ADMIN', clientId: null } };
      const result = await controller.trackOrder('order-1', req);
      expect(mockOrdersService.trackOrder).toHaveBeenCalledWith(
        'order-1',
        req.user,
      );
      expect(result).toEqual(mockOrder);
    });
  });
});
