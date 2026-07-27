'use strict';

require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'boostr-backend',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.TEMPO_URL || 'http://51.20.93.118:4317'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-pg': {
        enhancedDatabaseReporting: true,
        requireParentSpan: true,
      }
    })
  ]
});

sdk.start();

console.log("OpenTelemetry started");
