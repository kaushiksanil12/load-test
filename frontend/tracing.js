import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const exporter = new OTLPTraceExporter({
  url: typeof process !== 'undefined' && process.env.TEMPO_URL 
    ? process.env.TEMPO_URL 
    : 'http://51.20.93.118:4318/v1/traces',
});

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'boostr-frontend',
  }),
  spanProcessors: [
    new BatchSpanProcessor(exporter)
  ]
});
provider.register();

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        // Propagate the traceparent header to all requests, so they link with the backend
        propagateTraceHeaderCorsUrls: [/.*/],
      },
    }),
  ],
});

console.log("OpenTelemetry Frontend Tracing Initialized");
