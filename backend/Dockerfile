FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (không dùng --only=production vì cần nodemon nếu dev)
# Nhưng nếu production thật thì dùng npm ci --only=production
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start server (dùng node thay vì nodemon cho production)
CMD ["node", "server.js"]