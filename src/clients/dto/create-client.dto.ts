import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';
import { IsCpfCnpj } from '../../common/validators/cpf-cnpj.validator';

export class CreateClientDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '123.456.789-09' })
  @IsNotEmpty()
  @IsCpfCnpj()
  cpfCnpj: string;

  @ApiProperty({ example: 'john@email.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1 (555) 000-1234', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Maple Street', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
