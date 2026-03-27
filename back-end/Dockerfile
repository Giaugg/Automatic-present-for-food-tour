# Sử dụng image node chính thức
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ code
COPY . .

# Mở port cho backend (thường là 5000 hoặc 8080)
EXPOSE 5000

# Lệnh chạy ứng dụng
CMD ["npm", "run", "dev"]