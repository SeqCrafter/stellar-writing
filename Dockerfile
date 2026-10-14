# syntax=docker/dockerfile:1

# ---------- 依赖与构建：bun 安装依赖，Next.js 输出 standalone ----------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
# Next.js 构建需要 Node；bun 只用来执行 package.json 脚本（oven/bun 基于 Debian，所以构建阶段也用 Debian 版 Node）
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 预览资源（src/lib/stellar/vendor、generated、public/stellar）已由 bun run sync:stellar 生成并随源码提交
RUN bun run build

# ---------- 运行：只保留 standalone 产物 ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
