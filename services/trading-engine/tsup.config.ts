import { defineConfig } from 'tsup'

export default defineConfig({
  entry:    ['src/index.ts'],
  format:   ['cjs'],
  platform: 'node',
  target:   'node20',
  splitting: false,
  // Keep these as true runtime deps (present in node_modules at runtime)
  external: ['@supabase/supabase-js', 'technicalindicators'],
  // Force-bundle workspace packages — tsup would otherwise leave them as
  // external require()s, causing Node.js to load raw TypeScript source at
  // runtime and crash with "SyntaxError: Unexpected token 'export'".
  noExternal: [/@planningo\/.*/],
})
