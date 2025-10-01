/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポートを無効化（環境変数を使用するため）
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // 環境変数の明示的な設定
  env: {
    NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  },
  // 実験的な機能で環境変数の読み込みを強化
  experimental: {
    forceSwcTransforms: true,
  }
};

// 環境変数の読み込み確認
console.log('🔧 Next.js Config - Environment Variables Check:', {
  NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID ? 'LOADED' : 'MISSING',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'LOADED' : 'MISSING',
});

module.exports = nextConfig;
