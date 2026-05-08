import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PrivionConsentDom',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
  plugins: [dts({ insertTypesEntry: true })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
