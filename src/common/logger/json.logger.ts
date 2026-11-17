import { ConsoleLogger } from '@nestjs/common';
import { currentCorrelationId } from './correlation-context';

// Fallback: ids already present in log text (orderId=..., correlation_id=...).
const INLINE_ID = /(?:orderId|correlation_id)=([0-9a-f-]{36})/i;

interface StructuredLogRecord {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  message: string;
  context?: string;
  correlation_id?: string;
  'dd.trace_id'?: string;
  'dd.span_id'?: string;
  stack?: string;
}

/**
 * Emits one JSON object per line so Datadog (or any log shipper) can parse the
 * payload natively and correlate entries with APM traces.
 */
export class JsonLogger extends ConsoleLogger {
  private readonly service = process.env.DD_SERVICE ?? 'os-service';
  private readonly env = process.env.DD_ENV ?? process.env.NODE_ENV ?? 'local';

  log(message: unknown, context?: string): void {
    this.emit('info', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.emit('error', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    this.emit('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.emit('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.emit('trace', message, context);
  }

  private emit(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      env: this.env,
      message: this.stringify(message),
      context: context ?? this.context,
    };

    const correlationId =
      currentCorrelationId() ?? INLINE_ID.exec(record.message)?.[1];
    if (correlationId) record.correlation_id = correlationId;
    if (stack) record.stack = stack;

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(record)}\n`);
  }

  private stringify(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
