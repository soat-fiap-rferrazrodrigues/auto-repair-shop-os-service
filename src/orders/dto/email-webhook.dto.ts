import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum EmailAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class EmailWebhookDto {
  @ApiProperty({ example: 'order-uuid', description: 'Service order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: EmailAction, description: 'Action from email response' })
  @IsEnum(EmailAction)
  action: EmailAction;

  @ApiProperty({ example: 'client@example.com', description: 'Sender email' })
  @IsString()
  from: string;
}
