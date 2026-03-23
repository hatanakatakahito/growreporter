import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// /lp へのアクセスを public/lp/index.html に直接返すプラグイン
function lpStaticPlugin() {
  return {
    name: 'lp-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/lp' || req.url === '/lp/') {
          const filePath = path.resolve(__dirname, 'public/lp/index.html')
          res.setHeader('Content-Type', 'text/html')
          fs.createReadStream(filePath).pipe(res)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [lpStaticPlugin(), react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['xlsx-js-style'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
})