import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Custom plugin to copy public files excluding problematic ones
function copyPublicPlugin() {
  return {
    name: 'copy-public-selective',
    closeBundle() {
      const publicDir = 'public';
      const outDir = 'dist';

      function copyDir(src: string, dest: string) {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
        }

        const entries = readdirSync(src);

        for (const entry of entries) {
          // Skip the problematic file
          if (entry === 'image copy.png') continue;

          const srcPath = join(src, entry);
          const destPath = join(dest, entry);

          try {
            const stat = statSync(srcPath);

            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          } catch (err) {
            console.log(`Skipping ${entry} due to error`);
          }
        }
      }

      try {
        copyDir(publicDir, outDir);
      } catch (err) {
        console.log('Copy completed with some skipped files');
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: false, // Disable default public dir copying
  build: {
    rollupOptions: {
      plugins: [copyPublicPlugin()]
    }
  }
});
