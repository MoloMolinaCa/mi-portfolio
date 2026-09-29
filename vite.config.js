import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Mismo directorio de salida que usaba Create React App (lo espera Vercel)
  build: { outDir: 'build', target: 'es2020', sourcemap: false },
  server: { port: 3000 },
  test: { environment: 'node', include: ['src/**/*.test.{js,jsx}'] },
});
