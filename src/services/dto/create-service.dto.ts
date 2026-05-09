import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsInt,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Oil change' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Engine oil change with filter replacement',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}
