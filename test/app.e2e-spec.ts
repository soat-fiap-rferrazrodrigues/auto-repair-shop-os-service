/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

jest.setTimeout(60000);

// ─── helpers ─────────────────────────────────────────────────────────────────

async function clearDatabase(dataSource: DataSource) {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repo = dataSource.getRepository(entity.name);
    await repo.query(
      `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`,
    );
  }
}

// ─── shared state ────────────────────────────────────────────────────────────

let app: INestApplication<App>;
let dataSource: DataSource;
let adminToken: string;
let clientToken: string;

// IDs reused across suites
let clientId: string;
let vehicleId: string;
let serviceId: string;
let partId: string;
let orderId: string;

// ─── bootstrap ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  dataSource = moduleFixture.get(DataSource);
  await clearDatabase(dataSource);
});

afterAll(async () => {
  await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  it('POST /auth/register – should register an admin user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Admin', email: 'admin@shop.com', password: 'admin123', role: 'admin' })
      .expect(201);

    expect(res.body).toHaveProperty('message');
  });

  it('POST /auth/login – should return a JWT token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@shop.com', password: 'admin123' })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    adminToken = res.body.access_token as string;
  });

  it('POST /auth/login – should reject invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@shop.com', password: 'wrongpass' })
      .expect(401);
  });

  it('POST /auth/register – should reject duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Dup', email: 'admin@shop.com', password: 'admin123' })
      .expect(409);
  });

  it('POST /auth/register – should reject short password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'X', email: 'x@shop.com', password: '123' })
      .expect(400);
  });

  it('Protected route – should return 401 without token', async () => {
    await request(app.getHttpServer()).get('/clients').expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Clients (e2e)', () => {
  it('POST /clients – should create a client', async () => {
    const res = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'João Silva',
        cpfCnpj: '529.982.247-25', // valid CPF
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        address: 'Rua das Flores, 123',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('João Silva');
    clientId = res.body.id as string;
  });

  it('POST /clients – should reject invalid CPF/CNPJ', async () => {
    await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', cpfCnpj: '000.000.000-00' })
      .expect(400);
  });

  it('GET /clients – should list all clients', async () => {
    const res = await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /clients/search?cpfCnpj= – should find client by CPF', async () => {
    const res = await request(app.getHttpServer())
      .get('/clients/search?cpfCnpj=529.982.247-25')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.name).toBe('João Silva');
  });

  it('GET /clients/:id – should return a single client', async () => {
    const res = await request(app.getHttpServer())
      .get(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(clientId);
  });

  it('GET /clients/:id – should return 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/clients/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('PATCH /clients/:id – should update client', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '(11) 88888-8888' })
      .expect(200);

    expect(res.body.phone).toBe('(11) 88888-8888');
  });

  it('POST /auth/register – should register a client user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'João Silva',
        email: 'joao@client.com',
        password: 'client123',
        role: 'client',
        clientId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('message');
  });

  it('POST /auth/login – client user should receive token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@client.com', password: 'client123' })
      .expect(201);

    clientToken = res.body.access_token as string;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

describe('Vehicles (e2e)', () => {
  it('POST /vehicles – should create a vehicle', async () => {
    const res = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        clientId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.plate).toBe('ABC1D23');
    vehicleId = res.body.id as string;
  });

  it('POST /vehicles – should reject invalid plate', async () => {
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'INVALID', brand: 'Ford', model: 'Ka', year: 2020, clientId })
      .expect(400);
  });

  it('POST /vehicles – should accept old plate format (ABC-1234)', async () => {
    const res = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'XYZ1234', brand: 'Honda', model: 'Civic', year: 2018, clientId })
      .expect(201);

    expect(res.body.plate).toBe('XYZ1234');
  });

  it('GET /vehicles – should list vehicles', async () => {
    const res = await request(app.getHttpServer())
      .get('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /vehicles/:id – should return a single vehicle', async () => {
    const res = await request(app.getHttpServer())
      .get(`/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(vehicleId);
  });

  it('PATCH /vehicles/:id – should update vehicle', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ model: 'Corolla Cross' })
      .expect(200);

    expect(res.body.model).toBe('Corolla Cross');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

describe('Services (e2e)', () => {
  it('POST /services – should create a service', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Troca de óleo', price: 150.0, estimatedMinutes: 30 })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    serviceId = res.body.id as string;
  });

  it('POST /services – should reject missing price', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alinhamento' })
      .expect(400);
  });

  it('GET /services – should list all services', async () => {
    const res = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /services/:id – should return single service', async () => {
    const res = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.name).toBe('Troca de óleo');
  });

  it('PATCH /services/:id – should update service price', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 180.0 })
      .expect(200);

    expect(res.body.price).toBe(180);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Parts (e2e)', () => {
  it('POST /parts – should create a part with stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/parts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Filtro de óleo', unitPrice: 45.9, stockQuantity: 100 })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.stockQuantity).toBe(100);
    partId = res.body.id as string;
  });

  it('POST /parts – should reject negative stock', async () => {
    await request(app.getHttpServer())
      .post('/parts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Part', unitPrice: 10, stockQuantity: -1 })
      .expect(400);
  });

  it('GET /parts – should list parts', async () => {
    const res = await request(app.getHttpServer())
      .get('/parts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /parts/:id – should return single part', async () => {
    const res = await request(app.getHttpServer())
      .get(`/parts/${partId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.name).toBe('Filtro de óleo');
  });

  it('PATCH /parts/:id – should update part price', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/parts/${partId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unitPrice: 50.0 })
      .expect(200);

    expect(res.body.unitPrice).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS – full lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – full lifecycle (e2e)', () => {
  it('POST /orders – should create an order with budget (RECEIVED)', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleId,
        services: [{ serviceId }],
        parts: [{ partId, quantity: 2 }],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    orderId = res.body.id as string;
    expect(res.body.status).toBe('RECEIVED');
    expect(parseFloat(res.body.totalPrice as string)).toBeGreaterThan(0);
  });

  it('POST /orders – should reject missing vehicleId', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ services: [{ serviceId }] })
      .expect(400);
  });

  it('GET /orders – should list all orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /orders/:id – should return order detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(orderId);
    expect(res.body).toHaveProperty('services');
    expect(res.body).toHaveProperty('parts');
  });

  it('POST /orders/:id/start-diagnosis – status → IN_DIAGNOSIS', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/start-diagnosis`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('IN_DIAGNOSIS');
  });

  it('POST /orders/:id/start-diagnosis – should reject invalid transition', async () => {
    // Already IN_DIAGNOSIS, cannot go back to IN_DIAGNOSIS
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/start-diagnosis`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('POST /orders/:id/send-budget – status → AWAITING_APPROVAL', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/send-budget`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('AWAITING_APPROVAL');
  });

  it('GET /orders/:id/track – client can track own order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}/track`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(res.body.id).toBe(orderId);
    expect(res.body).toHaveProperty('status');
  });

  it('POST /orders/:id/approve-budget – status → AWAITING_PAYMENT, stock untouched', async () => {
    const stockBefore = (
      await request(app.getHttpServer())
        .get(`/parts/${partId}`)
        .set('Authorization', `Bearer ${adminToken}`)
    ).body.stockQuantity as number;

    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/approve-budget`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('AWAITING_PAYMENT');

    const stockAfter = (
      await request(app.getHttpServer())
        .get(`/parts/${partId}`)
        .set('Authorization', `Bearer ${adminToken}`)
    ).body.stockQuantity as number;

    // Stock is reserved by execution-service after PaymentConfirmed.
    expect(stockAfter).toBe(stockBefore);
  });

  it('PATCH /orders/:id/status – simulates PaymentConfirmed → IN_EXECUTION', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_EXECUTION' })
      .expect(200);

    expect(res.body.status).toBe('IN_EXECUTION');
  });

  it('POST /orders/:id/finish – status → FINISHED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('FINISHED');
  });

  it('POST /orders/:id/deliver – status → DELIVERED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('DELIVERED');
  });

  it('POST /orders/:id/deliver – should reject transition from DELIVERED', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS – budget rejection flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – budget rejection flow (e2e)', () => {
  let rejectionOrderId: string;

  it('should create a second order', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicleId, services: [{ serviceId }] })
      .expect(201);

    rejectionOrderId = res.body.id as string;
  });

  it('should advance to AWAITING_APPROVAL', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${rejectionOrderId}/start-diagnosis`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/orders/${rejectionOrderId}/send-budget`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
  });

  it('POST /orders/:id/reject-budget – status → RECEIVED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${rejectionOrderId}/reject-budget`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe('RECEIVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Reports (e2e)', () => {
  it('GET /reports/orders-by-status – should return counts per status', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/orders-by-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(typeof res.body).toBe('object');
  });

  it('GET /reports/average-time – should return average execution time', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/average-time')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
  });

  it('GET /reports/dashboard – should return dashboard metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('ordersByStatus');
    expect(res.body).toHaveProperty('averageExecutionMinutes');
    expect(res.body).toHaveProperty('totalFinishedOrders');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE / CLEANUP
// ─────────────────────────────────────────────────────────────────────────────

describe('Cleanup – DELETE endpoints (e2e)', () => {
  it('DELETE /services/:id – should remove service', async () => {
    const svcRes = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Serviço temporário', price: 50 });

    await request(app.getHttpServer())
      .delete(`/services/${svcRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/services/${svcRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /parts/:id – should remove part', async () => {
    const partRes = await request(app.getHttpServer())
      .post('/parts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Peça temporária', unitPrice: 10, stockQuantity: 5 });

    await request(app.getHttpServer())
      .delete(`/parts/${partRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/parts/${partRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /vehicles/:id – should remove vehicle (non-order vehicle)', async () => {
    const vRes = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'DEL1A23', brand: 'Fiat', model: 'Uno', year: 2000, clientId });

    await request(app.getHttpServer())
      .delete(`/vehicles/${vRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('DELETE /clients/:id – should remove client without orders', async () => {
    const cRes = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temp Client', cpfCnpj: '07.526.557/0001-00' }); // valid CNPJ

    await request(app.getHttpServer())
      .delete(`/clients/${cRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
