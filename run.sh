#!/bin/bash

echo "Installing Terraform Visualizer with Rete.js..."

# Install dependencies including new Rete.js packages
#npm install rete@2.0.1 rete-area-plugin@2.0.0 rete-connection-plugin@2.0.0 rete-react-plugin@2.0.0 rete-auto-arrange-plugin@2.0.0 elkjs@0.8.2 react@18.2.0 react-dom@18.2.0 
#npm install --save-dev @types/react@18.2.0 @types/react-dom@18.2.0 copyfiles

# Create build.js for esbuild configuration
#cat > build.js << 'EOF'
#import * as esbuild from 'esbuild';
#
#async function build() {
#  try {
#    const result = await esbuild.build({
#      entryPoints: ['src/frontend/app.ts'],
#      bundle: true,
#      outfile: 'dist/frontend/app.js',
#      platform: 'browser',
#      format: 'esm',
#      target: 'es2020',
#      loader: { 
#        '.ts': 'tsx',
#        '.tsx': 'tsx',
#        '.js': 'jsx'
#      },
#      jsx: 'automatic',
#      external: ['react', 'react-dom'],
#      define: {
#        'process.env.NODE_ENV': '"production"'
#      },
#      minify: true,
#      sourcemap: true,
#    });
#    
#    console.log('Build completed successfully');
#  } catch (error) {
#    console.error('Build failed:', error);
#    process.exit(1);
#  }
#}
#
#build();
#EOF

# Update package.json scripts
#npm pkg set "scripts.build:frontend=node build.js"

# Copy the updated tsconfig.frontend.json
#cat > tsconfig.frontend.json << 'EOF'
#{
#  "compilerOptions": {
#    "target": "ES2020",
#    "module": "ES2020",
#    "moduleResolution": "bundler",
#    "jsx": "react",
#    "lib": ["ES2020", "DOM", "DOM.Iterable"],
#    "outDir": "dist/frontend",
#    "strict": true,
#    "esModuleInterop": true,
#    "skipLibCheck": true,
#    "forceConsistentCasingInFileNames": true,
#    "resolveJsonModule": true
#  },
#  "include": ["src/frontend/**/*"],
#  "exclude": ["node_modules", "**/*.test.ts"]
#}
#EOF

# Build the application
echo "Building the application..."
npm run build

# Run the example
echo "Running the example..."
npx terraform-visualizer ./example

echo "Terraform Visualizer with Rete.js is now running!"