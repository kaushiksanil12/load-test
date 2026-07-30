import { AwsRum } from 'aws-rum-web';

try {
  const config = {
    sessionSampleRate: 1,
    endpoint: "https://dataplane.rum.eu-north-1.amazonaws.com",
    telemetries: ["performance", "errors", "http"],
    allowCookies: true,
    enableXRay: false,
    signing: false   // Public resource policy — no Cognito needed
  };

  const APPLICATION_ID = "f9d49313-e403-433d-9c24-186bedca6477";
  const APPLICATION_VERSION = "1.0.0";
  const APPLICATION_REGION = "eu-north-1";

  new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
  console.warn("CloudWatch RUM init error", error);
}
