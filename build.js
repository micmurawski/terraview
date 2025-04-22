import * as esbuild from 'esbuild';

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: ['src/frontend/app.ts'],
      bundle: true,
      outfile: 'dist/frontend/app.js',
      platform: 'browser',
      format: 'iife',
      target: 'es2020',
      loader: { 
        '.ts': 'tsx',
        '.tsx': 'tsx',
        '.js': 'jsx'
      },
      jsx: 'automatic',
      external: [],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      minify: true,
      sourcemap: true,
      inject: ['./src/frontend/polyfills.js'],
    });
    
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
