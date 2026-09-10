FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev
# AWS OpenTelemetry Distro (commented out for ELK / Elastic APM)
# RUN npm install @aws/aws-distro-opentelemetry-node-autoinstrumentation

# Elastic APM Agent
RUN npm install elastic-apm-node

COPY . .

EXPOSE 3000

# AWS autoinstrumentation (commented out):
# CMD ["node", "--require", "@aws/aws-distro-opentelemetry-node-autoinstrumentation/register", "server.js"]

# Elastic APM autoinstrumentation
CMD ["node", "--require", "elastic-apm-node/start", "server.js"]

