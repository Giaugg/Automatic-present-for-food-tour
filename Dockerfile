# Sử dụng image node chính thức
FROM node:20-alpine

WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy code
COPY . .

# Next.js thu thập dữ liệu ẩn danh, có thể tắt đi
ENV NEXT_TELEMETRY_DISABLED 1

# Mở port cho Next.js
EXPOSE 3000

# Chạy ở chế độ development
CMD ["npm", "run", "dev"]