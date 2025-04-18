import * as fs from 'fs';
import * as path from 'path';
import pkg from 'hcl2-parser';
import { TerraformResource, ResourceCategory, resourceCategoryMap } from './types.js';

const { parseToObject } = pkg;

export class TerraformParser {
  private tfFiles: string[] = [];
  
  /**
   * Initializes the parser by discovering Terraform files in the given directory
   * @param directoryPath Path to the directory containing Terraform files
   */
  constructor(private directoryPath: string) {
    this.discoverTerraformFiles(directoryPath);
  }

  /**
   * Finds all Terraform files in the given directory and subdirectories
   */
  private discoverTerraformFiles(dirPath: string): void {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        this.discoverTerraformFiles(filePath);
      } else if (file.endsWith('.tf')) {
        this.tfFiles.push(filePath);
      }
    }
  }

  /**
   * Parses a single Terraform file and returns the raw HCL object
   */
  private parseFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`Parsing file: ${filePath}`);
      const result = parseToObject(content);
      
      if (!result) {
        console.error(`Error parsing ${filePath}`);
        return null;
      }
      
      console.log(`Successfully parsed ${filePath}`);
      console.log('Full parse result structure:', JSON.stringify(result[0], null, 2));
      return result[0];
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Determines the resource category based on resource type
   */
  private getResourceCategory(resourceType: string): ResourceCategory {
    return resourceCategoryMap[resourceType] || resourceCategoryMap.default;
  }

  /**
   * Extracts resources from HCL parsed objects
   */
  private extractResources(hclObject: any, filePath: string): TerraformResource[] {
    const resources: TerraformResource[] = [];
    
    if (!hclObject || !hclObject.resource) {
      return resources;
    }

    // HCL2 parser returns resources in format: { resource: { type: { name: [{ config }] } } }
    Object.entries(hclObject.resource).forEach(([resourceType, resourceInstances]: [string, any]) => {
      Object.entries(resourceInstances).forEach(([resourceName, resourceConfigs]: [string, any]) => {
        // resourceConfigs is an array with a single element containing the resource configuration
        const config = resourceConfigs[0];
        const category = this.getResourceCategory(resourceType);
        
        resources.push({
          type: resourceType,
          name: resourceName,
          category,
          inputs: config,
          outputs: {}, // Will be populated later with resource outputs
          location: {
            file: filePath,
            line: 0 // Would require more sophisticated parsing to get line numbers
          }
        });
      });
    });
    
    return resources;
  }

  /**
   * Process and extract output blocks from HCL objects
   */
  private extractOutputs(hclObject: any, resources: Map<string, TerraformResource>): void {
    if (!hclObject || !hclObject.output) {
      return;
    }

    Object.entries(hclObject.output).forEach(([outputName, outputConfig]: [string, any]) => {
      // Analyze the output value to extract references to resources
      if (outputConfig.value) {
        const valueStr = JSON.stringify(outputConfig.value);
        // Find references like aws_vpc.main.id or var.something
        const refRegex = /\${(.*?\.(.*?)\.(.*?))}/g;
        const matches = [...valueStr.matchAll(refRegex)];
        
        for (const match of matches) {
          const [, fullRef, resourceName, attribute] = match;
          const resourceParts = fullRef.split('.');
          
          // Handle only resource references (not variables/data sources yet)
          if (resourceParts.length >= 2) {
            const resourceType = resourceParts[0];
            const resourceName = resourceParts[1];
            const resourceId = `${resourceType}.${resourceName}`;
            
            if (resources.has(resourceId)) {
              const resource = resources.get(resourceId)!;
              resource.outputs[outputName] = {
                value: outputConfig.value,
                description: outputConfig.description || ''
              };
            }
          }
        }
      }
    });
  }

  /**
   * Parse all discovered Terraform files and extract resources
   */
  public parseAllFiles(): TerraformResource[] {
    const resources: TerraformResource[] = [];
    const resourcesMap = new Map<string, TerraformResource>();
    
    // First pass: extract all resources
    for (const filePath of this.tfFiles) {
      const hclObject = this.parseFile(filePath);
      if (hclObject) {
        const fileResources = this.extractResources(hclObject, filePath);
        for (const resource of fileResources) {
          const resourceId = `${resource.type}.${resource.name}`;
          resourcesMap.set(resourceId, resource);
          resources.push(resource);
        }
      }
    }
    
    // Second pass: extract outputs
    for (const filePath of this.tfFiles) {
      const hclObject = this.parseFile(filePath);
      if (hclObject) {
        this.extractOutputs(hclObject, resourcesMap);
      }
    }
    
    return resources;
  }
}