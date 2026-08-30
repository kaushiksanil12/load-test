import { AwsRum } from 'aws-rum-web';

try {
  const config = {
    sessionSampleRate: 1 ,
    endpoint: "https://dataplane.rum.us-east-1.amazonaws.com" ,
    telemetries: ["performance","errors","http"] ,
    allowCookies: true ,
    enableXRay: false ,
    signing: false // Set to false to send unsigned requests using your public resource policy
  };

  const APPLICATION_ID = '08f20ef3-2656-492c-a83c-4c6cc4c1e2d4';
  const APPLICATION_VERSION = '1.0.0';
  const APPLICATION_REGION = 'us-east-1';

  const awsRum = new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    config
  );
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
  console.warn("CloudWatch RUM init error", error);
}
