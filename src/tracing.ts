/**
 * Datadog APM bootstrap.
 *
 * Must be imported before any other module so dd-trace can patch the HTTP,
 * Express and PostgreSQL libraries. Tracing stays disabled unless
 * DD_TRACE_ENABLED=true, keeping local runs and CI free of an agent dependency.
 */
export function initTracing(): void {
  if (process.env.DD_TRACE_ENABLED !== 'true') return;

  try {
    // Required lazily so the package is only loaded when tracing is enabled.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracer = require('dd-trace') as {
      init: (options: Record<string, unknown>) => unknown;
    };

    tracer.init({
      service: process.env.DD_SERVICE ?? 'auto-repair-shop-api',
      env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'local',
      version: process.env.DD_VERSION ?? '1.0.0',
      // Injects dd.trace_id / dd.span_id into logs for trace-log correlation.
      logInjection: true,
      runtimeMetrics: true,
      profiling: process.env.DD_PROFILING_ENABLED === 'true',
    });
  } catch {
    process.stderr.write(
      JSON.stringify({
        level: 'warn',
        message: 'dd-trace is not installed; APM disabled',
      }) + '\n',
    );
  }
}
