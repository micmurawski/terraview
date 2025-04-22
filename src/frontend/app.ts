import { ReteVisualizer } from './rete-visualizer';
import { ResourcePanel } from './components/resource-panel';
import { DiagramData } from '../parser/types';

/**
 * Main application class for Terraform Visualizer
 */
class TerraformVisualizer {
  private container: HTMLElement;
  private resourcePanel: ResourcePanel;
  private visualizer: ReteVisualizer;
  private data: DiagramData | null = null;

  constructor() {
    // Get container elements
    this.container = document.getElementById('diagram') as HTMLElement;
    this.resourcePanel = new ResourcePanel('resource-details');
    
    // Create the visualizer
    this.visualizer = new ReteVisualizer(this.container, this.resourcePanel);
    
    // Close panel button event
    const closeButton = document.getElementById('close-panel');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.resourcePanel.reset();
      });
    }
    
    // Fetch data from server
    this.fetchData();
  }

  /**
   * Fetch diagram data from the server
   */
  private async fetchData(): Promise<void> {
    try {
      const response = await fetch('/api/diagram');
      this.data = await response.json();
      await this.render();
    } catch (error) {
      console.error('Error fetching diagram data:', error);
      this.container.innerHTML = '<text x="50%" y="50%" text-anchor="middle">Error loading diagram data. Please try again.</text>';
    }
  }

  /**
   * Render the diagram with the fetched data
   */
  private async render(): Promise<void> {
    if (!this.data) return;
    
    try {
      await this.visualizer.visualize(this.data);
    } catch (error) {
      console.error('Error rendering diagram:', error);
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TerraformVisualizer();
});