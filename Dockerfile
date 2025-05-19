FROM node:20-slim

RUN apt-get update && apt-get install -y \
    curl \
    && mkdir -p /root/.u2net \
    && curl -L -o /root/.u2net/u2net.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx

WORKDIR /app

COPY package*.json ./
RUN npm install && npm rebuild sharp

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
