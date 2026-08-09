import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@distrito/shared-ui': path.resolve(__dirname, 'src/shared/index.js'),
    },
    dedupe: ['react', 'react-dom', 'lucide-react', '@googlemaps/js-api-loader'],
  },
});
