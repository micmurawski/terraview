import { TerraformResource, ResourceDependency, DiagramData } from './types.js';

export class ResourceExtractor {
  /**
   * Analyzes resources to find dependencies between them
   * @param resources List of extracted Terraform resources
   * @returns DiagramData with resources and their dependencies
   */
  public extractDiagramData(resources: TerraformResource[]): DiagramData {
    const dependencies = this.extractDependencies(resources);
    return {
      resources,
      dependencies
    };
  }

  /**
   * Extracts dependencies between resources by analyzing resource configurations
   * @param resources List of resources to analyze
   * @returns List of dependencies between resources
   */
  private extractDependencies(resources: TerraformResource[]): ResourceDependency[] {
    const dependencies: ResourceDependency[] = [];
    const resourceMap = new Map<string, TerraformResource>();
    
    // Build a map of resources for quicker lookup
    resources.forEach(resource => {
      const resourceId = `${resource.type}.${resource.name}`;
      resourceMap.set(resourceId, resource);
    });

    // Analyze each resource for dependencies
    resources.forEach(resource => {
      const sourceId = `${resource.type}.${resource.name}`;
      const inputStr = JSON.stringify(resource.inputs);
      
      // Look for references to other resources in the inputs
      // Matches patterns like: "${aws_vpc.main.id}" or "${aws_subnet.public[0].id}"
      const refRegex = /\${([\w_]+)\.([\w_]+)(?:\[\d+\])?\.([\w_]+)}/g;
      const matches = [...inputStr.matchAll(refRegex)];
      
      for (const match of matches) {
        const [fullMatch, refType, refName, refAttr] = match;
        const targetId = `${refType}.${refName}`;
        
        // Skip self-references
        if (targetId === sourceId) continue;
        
        // Skip if the referenced resource doesn't exist in our resources
        if (!resourceMap.has(targetId)) continue;
        
        // Find which property this reference is in
        const sourceProp = this.findPropertyForReference(resource.inputs, fullMatch);
        
        // Find or create dependency
        let dependency = dependencies.find(d => 
          d.source === sourceId && d.target === targetId
        );
        
        if (!dependency) {
          dependency = {
            source: sourceId,
            target: targetId,
            references: []
          };
          dependencies.push(dependency);
        }
        
        // Add reference details
        dependency.references.push({
          sourceProp,
          targetProp: refAttr,
          value: fullMatch
        });
      }
    });
    
    return dependencies;
  }

  /**
   * Finds the property name in which a reference appears
   * @param obj Object to search
   * @param searchValue Value to find
   * @param parentKey Parent property name
   * @returns Property path where the value was found
   */
  private findPropertyForReference(obj: any, searchValue: string, parentKey = ''): string {
    if (typeof obj !== 'object' || obj === null) {
      return '';
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = parentKey ? `${parentKey}.${key}` : key;
      
      if (typeof value === 'string' && value.includes(searchValue)) {
        return currentPath;
      }
      
      if (typeof value === 'object' && value !== null) {
        const found = this.findPropertyForReference(value, searchValue, currentPath);
        if (found) return found;
      }
    }
    
    return '';
  }
}