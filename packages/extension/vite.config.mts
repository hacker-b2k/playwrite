/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../../icons/*',
          dest: 'icons'
        },
        {
          src: '../../manifest.json',
          dest: '.'
        }
      ]
    })
  ],
  root: resolve(__dirname, 'src/ui'),
  builder: {},
  environments: {
    // ── UI bundle — React sidebar + connect/status pages ──────────────────────
    client: {
      build: {
        outDir: resolve(__dirname, 'dist/'),
        emptyOutDir: false,
        minify: false,
        rollupOptions: {
          input: ['src/ui/connect.html', 'src/ui/status.html', 'src/ui/aiSidebar.html'],
          output: {
            manualChunks: undefined,
            entryFileNames: 'lib/ui/[name].js',
            chunkFileNames: 'lib/ui/[name].js',
            assetFileNames: 'lib/ui/[name].[ext]'
          }
        }
      }
    },
    // ── Service Worker bundle — background.ts ────────────────────────────────
    sw: {
      consumer: 'client',
      build: {
        outDir: resolve(__dirname, 'dist/'),
        emptyOutDir: false,
        minify: false,
        lib: {
          entry: resolve(__dirname, 'src/background.ts'),
          fileName: 'lib/background',
          formats: ['es']
        }
      }
    },
    // ── Content Script bundle — injected into every page ─────────────────────
    // Must be IIFE format (not ES module) — Chrome content scripts require it
    cs: {
      consumer: 'client',
      build: {
        outDir: resolve(__dirname, 'dist/'),
        emptyOutDir: false,
        minify: false,
        lib: {
          entry: resolve(__dirname, 'src/contentScript.ts'),
          fileName: () => 'lib/contentScript.js',
          formats: ['iife'],
          name: 'AutoComputeContentScript',
        }
      }
    }
  }
});
