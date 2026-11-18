import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonLogger, correlationMiddleware } from './logging/json.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(process.env.DD_SERVICE ?? 'billing-service'),
  });
  app.use(correlationMiddleware);
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Billing Service')
    .setDescription(
      'Orçamentos e pagamentos (Mercado Pago). Comandos da saga chegam via SQS; ' +
        'esta API expõe consulta de pagamento e o webhook do Mercado Pago.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
