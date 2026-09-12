import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), 'VITE_GOOGLE_MAPS_');
  const sharedMapsEnv = loadEnv(mode, '../distrito-web', 'VITE_GOOGLE_MAPS_');
  const apiKey = localEnv.VITE_GOOGLE_MAPS_API_KEY || sharedMapsEnv.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyA5SBdtjC4gQOiKcKRWnt_JTaDGnOIfTXg';
  const mapId = localEnv.VITE_GOOGLE_MAPS_MAP_ID || sharedMapsEnv.VITE_GOOGLE_MAPS_MAP_ID || 'fb19d5ae405357c4eab223c6';

  return {
    plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom', 'lucide-react', '@googlemaps/js-api-loader'] },
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GOOGLE_MAPS_MAP_ID': JSON.stringify(mapId),
    },
  };
});
