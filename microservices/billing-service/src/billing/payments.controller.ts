import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { MercadoPagoClient } from '../mercadopago/mercadopago.client';
import { Public, Roles } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

interface WebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly billing: BillingService,
    private readonly mercadoPago: MercadoPagoClient,
  ) {}

  /** Checkout link the os-service/front-end shows to the customer. */
  @Roles('admin', 'client')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status e link de checkout do pagamento da OS' })
  @ApiResponse({
    status: 200,
    description: 'orderId, status, amount, checkoutUrl',
  })
  @ApiResponse({ status: 404, description: 'Pagamento ainda não criado' })
  @Get(':orderId')
  async find(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const p = await this.billing.findPayment(orderId);
    if (!p) throw new NotFoundException('payment not found');
    return {
      orderId: p.orderId,
      status: p.status,
      amount: Number(p.amount),
      checkoutUrl: p.checkoutUrl,
    };
  }

  /**
   * Mercado Pago notification (Webhooks, topic "payment").
   * Responds 200 quickly; MP retries on non-2xx.
   */
  @Public() // authenticated by the Mercado Pago HMAC signature instead
  @ApiOperation({
    summary: 'Webhook do Mercado Pago (tópico payment)',
    description:
      'Validado pela assinatura x-signature (HMAC). Publica PaymentConfirmed/PaymentFailed para a saga.',
  })
  @ApiHeader({ name: 'x-signature', required: true })
  @ApiHeader({ name: 'x-request-id', required: true })
  @ApiResponse({ status: 200, description: '{ received: true }' })
  @ApiResponse({ status: 401, description: 'Assinatura inválida' })
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() body: WebhookBody,
    @Query('data.id') queryId: string | undefined,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ): Promise<{ received: true }> {
    const type = body?.type ?? body?.action?.split('.')[0];
    const dataId = String(queryId ?? body?.data?.id ?? '');
    if (type !== 'payment' || !dataId) return { received: true };

    if (!this.mercadoPago.verifySignature(signature, requestId, dataId)) {
      throw new UnauthorizedException('invalid signature');
    }
    await this.billing.handlePaymentNotification(dataId);
    return { received: true };
  }
}
