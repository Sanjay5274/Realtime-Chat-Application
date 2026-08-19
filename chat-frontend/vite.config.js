import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Proxy all REST API calls to the Spring Boot backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // Proxy WebSocket connections (raw STOMP, no SockJS)
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
