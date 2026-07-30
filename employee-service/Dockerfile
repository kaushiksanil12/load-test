FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev
RUN npm install @aws/aws-distro-opentelemetry-node-autoinstrumentation

COPY . .

EXPOSE 3000

CMD ["node", "--require", "@aws/aws-distro-opentelemetry-node-autoinstrumentation/register", "server.js"]
