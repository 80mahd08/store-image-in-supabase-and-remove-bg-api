FROM node:20-slim

# Install necessary tools and download ONNX model
RUN apt-get update && apt-get install -y \
    curl \
    && mkdir -p /root/.u2net \
    && curl -L -o /root/.u2net/u2net.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx

# Set working directory
WORKDIR /app

# Explicitly tell onnxruntime to NOT use CUDA
ENV npm_config_onnxruntime_node_install_cuda=0

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm rebuild sharp

# Copy rest of the app
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
