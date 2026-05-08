import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        server: resolve(__dirname, 'src/server.ts'),
        boot: resolve(__dirname, 'src/boot.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@privion-consent/core', '@privion-consent/dom', 'astro'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
  plugins: [dts({ insertTypesEntry: true })],
});
