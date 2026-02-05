import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // GitHub Pages için kritik: Yolları relative (göreceli) yapar.
    // Böylece site /repo-adi/ altında da çalışsa, /kok/ dizinde de çalışsa dosyaları bulur.
    base: './', 
    define: {
      // Kodunuzda kullanılan 'process.env' değişkenlerinin tarayıcıda hata vermemesi için:
      'process.env': env
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});