import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { RepairService } from './entities/repair-service.entity';
import { RepairServicesRepository } from './repositories/repair-services.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RepairService])],
  controllers: [ServicesController],
  providers: [ServicesService, RepairServicesRepository],
  exports: [ServicesService, RepairServicesRepository],
})
export class ServicesModule {}
