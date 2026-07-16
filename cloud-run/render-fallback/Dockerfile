# Cloud Run puppeteer render service
# 用途: CF Browser Rendering が IP block 等で 403 を返した URL を別 IP 帯
#       (GCP) から render するフォールバック層。
#
# ベース: Node 20 slim + puppeteer 公式の Chromium 依存パッケージ
FROM node:20-slim

# Puppeteer Chromium が必要とする runtime ライブラリ
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    fonts-noto-cjk \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Puppeteer Chromium をビルド時にダウンロード
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npx puppeteer browsers install chrome

COPY index.js ./

# Cloud Run は PORT 環境変数を渡してくる
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
