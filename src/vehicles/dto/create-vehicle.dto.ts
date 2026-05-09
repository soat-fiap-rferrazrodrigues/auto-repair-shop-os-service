import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsUUID, Min, Max } from 'class-validator';
import { IsVehiclePlate } from '../../common/validators/plate.validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC1D23' })
  @IsNotEmpty()
  @IsVehiclePlate()
  plate: string;

  @ApiProperty({ example: 'Toyota' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Corolla' })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ example: 2023 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'client-uuid' })
  @IsUUID()
  clientId: string;
}
