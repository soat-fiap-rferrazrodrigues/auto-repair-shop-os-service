import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { Budget } from './billing/entities/budget.entity';
import { Payment } from './billing/entities/payment.entity';
import { BillingService } from './billing/billing.service';
import { PaymentsController } from './billing/payments.controller';
import { HealthController } from './health/health.controller';
import {
  commandConsumerProvider,
  eventPublisherProvider,
  mercadoPagoProvider,
} from './providers';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
    }),
    TypeOrmModule.forFeature([Budget, Payment]),
  ],
  controllers: [PaymentsController, HealthController],
  providers: [
    {
      provide: APP_GUARD,
      inject: [Reflector],
      useFactory: (r: Reflector) => new JwtAuthGuard(r),
    },
    BillingService,
    mercadoPagoProvider,
    eventPublisherProvider,
    commandConsumerProvider,
  ],
})
export class AppModule {}
