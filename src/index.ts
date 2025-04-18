#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
// Remove static import of 'open'
import { TerraformParser } from './parser/terraform-parser.js';
import { ResourceExtractor } from './parser/resource-extractor.js';
import { Server } from './server/server.js';

// Set up the command line interface
const program = new Command();

program
  .name('terraform-visualizer')
  .description('Generate interactive diagrams from Terraform code')
  .version('1.0.0')
  .argument('<directory>', 'Path to the directory containing Terraform files')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-o, --open', 'Automatically open the browser', false)
  .action(async (directoryPath: string, options) => {
    try {
      // Resolve the absolute path
      const resolvedPath = path.resolve(directoryPath);
      
      console.log(`Analyzing Terraform files in: ${resolvedPath}`);

      // Parse Terraform files
      const parser = new TerraformParser(resolvedPath);
      const resources = parser.parseAllFiles();
      
      console.log(`Found ${resources.length} resources`);
      
      // Extract dependencies and create diagram data
      const extractor = new ResourceExtractor();
      const diagramData = extractor.extractDiagramData(resources);
      
      console.log(`Found ${diagramData.dependencies.length} dependencies`);
      
      if (options.open === true) {
        // Start the server
        const server = new Server(diagramData);
        const url = server.start();    
        console.log(`Server started at ${url}`);
        console.log('Opening browser...');
        // Use dynamic import for 'open'
        import('open').then(openModule => {
          openModule.default(url);
        }).catch(err => {
          console.error('Failed to open browser:', err);
          console.log(`Please manually open ${url} in your browser.`);
        });
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);