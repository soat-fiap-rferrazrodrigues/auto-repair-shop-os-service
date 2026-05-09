import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Admin User' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@shop.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongpass123' })
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, default: Role.ADMIN, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: 'client-uuid',
    required: false,
    description: 'Required when role=client. ID of the linked client record.',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
