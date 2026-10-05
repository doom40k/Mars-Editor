# 多阶段构建：Stage 1 构建静态前端
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2 极简生产镜像（运行时零 node_modules 依赖，仅几十 MB）
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 拷贝生产所需文件
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY server.mjs ./server.mjs
COPY package.json ./package.json

# 持久化存储目录
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.mjs"]
