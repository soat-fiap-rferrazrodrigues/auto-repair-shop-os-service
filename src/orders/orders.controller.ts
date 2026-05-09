import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Service Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create service order (budget generated automatically)',
  })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all service orders' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service order detail' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // ── Ações que disparam transições de status automaticamente ──────────────

  @Post(':id/start-diagnosis')
  @ApiOperation({
    summary: 'Start diagnosis → status automatically changes to IN_DIAGNOSIS',
  })
  startDiagnosis(@Param('id') id: string) {
    return this.ordersService.startDiagnosis(id);
  }

  @Post(':id/send-budget')
  @ApiOperation({
    summary:
      'Send budget to client → status automatically changes to AWAITING_APPROVAL',
  })
  sendBudget(@Param('id') id: string) {
    return this.ordersService.sendBudget(id);
  }

  @Post(':id/approve-budget')
  @ApiOperation({
    summary:
      'Client approves budget → status automatically changes to IN_EXECUTION and stock is decremented',
  })
  approveBudget(@Param('id') id: string) {
    return this.ordersService.approveBudget(id);
  }

  @Post(':id/reject-budget')
  @ApiOperation({
    summary: 'Client rejects budget → status automatically reverts to RECEIVED',
  })
  rejectBudget(@Param('id') id: string) {
    return this.ordersService.rejectBudget(id);
  }

  @Post(':id/finish')
  @ApiOperation({
    summary: 'Finish execution → status automatically changes to FINISHED',
  })
  finish(@Param('id') id: string) {
    return this.ordersService.finishExecution(id);
  }

  @Post(':id/deliver')
  @ApiOperation({
    summary: 'Deliver vehicle → status automatically changes to DELIVERED',
  })
  deliver(@Param('id') id: string) {
    return this.ordersService.deliver(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '[Admin] Force status manually (override)',
    description:
      'Use the action routes above whenever possible. This endpoint exists only for administrative corrections.',
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Roles(Role.ADMIN, Role.CLIENT)
  @Get(':id/track')
  @ApiOperation({
    summary: 'Track service order (admin or order owner client)',
  })
  trackOrder(
    @Param('id') id: string,
    @Request() req: { user: { role: string; clientId: string | null } },
  ) {
    return this.ordersService.trackOrder(id, req.user);
  }
}
