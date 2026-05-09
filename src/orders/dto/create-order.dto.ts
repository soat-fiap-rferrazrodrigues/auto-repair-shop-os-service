import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderServiceItemDto {
  @ApiProperty({ example: 'service-uuid' })
  @IsUUID()
  serviceId: string;
}

export class OrderPartItemDto {
  @ApiProperty({ example: 'part-uuid' })
  @IsUUID()
  partId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'vehicle-uuid' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ type: [OrderServiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderServiceItemDto)
  services: OrderServiceItemDto[];

  @ApiProperty({ type: [OrderPartItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPartItemDto)
  parts?: OrderPartItemDto[];
}
