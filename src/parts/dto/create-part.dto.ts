import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsInt,
} from 'class-validator';

export class CreatePartDto {
  @ApiProperty({ example: 'Oil filter' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Oil filter for 1.0 engine', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 45.9 })
  @IsNumber()
  @Min(0)
  unitPrice: number | undefined;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stockQuantity: number;
}
