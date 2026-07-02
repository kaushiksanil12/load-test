'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://<TEMPO_SERVER_IP>:4317'
  }),
  instrumentations: [
    getNodeAutoInstrumentations()
  ]
});

sdk.start();

console.log("OpenTelemetry started");
