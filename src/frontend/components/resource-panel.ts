import { TerraformResource, ResourceDependency } from '../../parser/types';

/**
 * Class for managing the resource details panel UI
 */
export class ResourcePanel {
  private panelElement: HTMLElement;
  private contentElement: HTMLElement;
  private closeButton: HTMLElement;
  
  /**
   * Initialize the resource panel
   * @param containerId The ID of the container element
   */
  constructor(containerId: string = 'resource-details') {
    this.panelElement = document.getElementById('details-panel') as HTMLElement;
    this.contentElement = document.getElementById(containerId) as HTMLElement;
    this.closeButton = document.getElementById('close-panel') as HTMLElement;
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private initEventListeners(): void {
    this.closeButton.addEventListener('click', () => {
      this.reset();
    });
  }
  
  /**
   * Show resource details in the panel
   * @param resource The terraform resource to display
   */
  public showResourceDetails(resource: TerraformResource): void {
    // Format inputs for display
    const inputsHtml = this.formatPropertiesHtml(resource.inputs);
    
    // Format outputs for display if any exist
    const outputsSection = Object.keys(resource.outputs).length > 0 
      ? `
        <div class="properties-section">
          <h3>Outputs</h3>
          ${this.formatPropertiesHtml(resource.outputs)}
        </div>
      `
      : '';
    
    // Create HTML content
    const html = `
      <div class="resource-type">${resource.type}</div>
      <div class="resource-name">${resource.name}</div>
      <div class="resource-category">Category: ${resource.category}</div>
      <div class="resource-location">File: ${resource.location.file}</div>
      
      <div class="properties-section">
        <h3>Inputs</h3>
        ${inputsHtml}
      </div>
      
      ${outputsSection}
    `;
    
    // Update panel content
    this.contentElement.innerHTML = html;
    this.showPanel();
  }
  
  /**
   * Show dependency details in the panel
   * @param dependency The dependency to display
   * @param sourceResource The source resource of the dependency
   * @param targetResource The target resource of the dependency
   */
  public showDependencyDetails(
    dependency: ResourceDependency, 
    sourceResource: TerraformResource, 
    targetResource: TerraformResource
  ): void {
    // Format references as HTML
    const referencesHtml = dependency.references
      .map(ref => `
        <div class="property">
          <div class="property-name">
            ${sourceResource.type}.${sourceResource.name}.${ref.sourceProp} →
            ${targetResource.type}.${targetResource.name}.${ref.targetProp}
          </div>
          <div class="property-value">${ref.value}</div>
        </div>
      `)
      .join('');

    // Create HTML content
    const html = `
      <div class="resource-type">Dependency</div>
      <div class="resource-name">
        ${sourceResource.type}.${sourceResource.name} → 
        ${targetResource.type}.${targetResource.name}
      </div>
      
      <div class="properties-section">
        <h3>References</h3>
        ${referencesHtml}
      </div>
    `;
    
    // Update panel content
    this.contentElement.innerHTML = html;
    this.showPanel();
  }
  
  /**
   * Reset the panel to its default state
   */
  public reset(): void {
    this.contentElement.innerHTML = '<p class="select-prompt">Select a resource to view details</p>';
  }
  
  /**
   * Make the panel visible
   */
  private showPanel(): void {
    this.panelElement.style.display = 'flex';
  }
  
  /**
   * Format an object's properties as HTML
   * @param obj The object containing properties
   * @returns HTML string of formatted properties
   */
  private formatPropertiesHtml(obj: Record<string, any>): string {
    return Object.entries(obj)
      .map(([key, value]) => {
        const displayValue = typeof value === 'object' 
          ? JSON.stringify(value, null, 2)
          : value;
        
        return `
          <div class="property">
            <div class="property-name">${key}</div>
            <div class="property-value">${displayValue}</div>
          </div>
        `;
      })
      .join('');
  }
}