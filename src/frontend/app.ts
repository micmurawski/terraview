import * as d3 from 'd3';

interface ResourceDependency {
  source: string;
  target: string;
  references: {
    sourceProp: string;
    targetProp: string;
    value: string;
  }[];
}

interface TerraformResource {
  type: string;
  name: string;
  category: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  location: {
    file: string;
    line: number;
  };
}

interface DiagramData {
  resources: TerraformResource[];
  dependencies: ResourceDependency[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  resource: TerraformResource;
  x?: number;
  y?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  dependency: ResourceDependency;
}

// Main application class
class DiagramApp {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private simulation: d3.Simulation<Node, Link>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private container: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private detailsPanel: HTMLElement;
  private data: DiagramData | null = null;
  private nodes: Node[] = [];
  private links: Link[] = [];

  constructor() {
    this.svg = d3.select<SVGSVGElement, unknown>('#diagram');
    this.width = this.svg.node()!.clientWidth;
    this.height = this.svg.node()!.clientHeight;
    this.detailsPanel = document.getElementById('resource-details')!;

    // Create tooltip
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Setup zoom behavior
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform.toString());
      });

    this.svg.call(this.zoom);

    // Create container for all diagram elements
    this.container = this.svg.append('g');

    // Setup force simulation
    this.simulation = d3.forceSimulation<Node, Link>()
      .force('link', d3.forceLink<Node, Link>()
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(80))
      .on('tick', () => this.ticked());

    // Add arrow marker definition for links
    this.svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('path')
      .attr('d', 'M 0,-3 L 8 ,0 L 0,3')
      .attr('class', 'arrowhead');

    // Setup event listeners
    this.setupEventListeners();
    
    // Fetch data
    this.fetchData();
  }

  private setupEventListeners(): void {
    document.getElementById('zoom-in')!.addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 1.3);
    });

    document.getElementById('zoom-out')!.addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 0.7);
    });

    document.getElementById('reset-view')!.addEventListener('click', () => {
      this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
    });

    document.getElementById('close-panel')!.addEventListener('click', () => {
      this.detailsPanel.innerHTML = '<p class="select-prompt">Select a resource to view details</p>';
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.width = this.svg.node()!.clientWidth;
      this.height = this.svg.node()!.clientHeight;
      
      if (this.simulation) {
        this.simulation
          .force('center', d3.forceCenter(this.width / 2, this.height / 2))
          .restart();
      }
    });
  }

  private async fetchData(): Promise<void> {
    try {
      const response = await fetch('/api/diagram');
      this.data = await response.json();
      this.processData();
      this.renderDiagram();
    } catch (error) {
      console.error('Error fetching diagram data:', error);
      // Show error message
      this.svg.append('text')
        .attr('x', this.width / 2)
        .attr('y', this.height / 2)
        .attr('text-anchor', 'middle')
        .text('Error loading diagram data. Please try again.');
    }
  }

  private processData(): void {
    if (!this.data) return;

    // Create nodes from resources
    this.nodes = this.data.resources.map(resource => ({
      id: `${resource.type}.${resource.name}`,
      resource
    }));

    // Create links from dependencies
    this.links = this.data.dependencies.map(dependency => ({
      source: dependency.source,
      target: dependency.target,
      dependency
    }));
  }

  private renderDiagram(): void {
    // Clear previous elements
    this.container.selectAll('*').remove();
    
    // Add links
    const link = this.container.append('g')
      .selectAll('path')
      .data(this.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseover', (event, d) => this.handleLinkMouseOver(event, d))
      .on('mouseout', (event, d) => this.handleLinkMouseOut(event, d))
      .on('click', (event, d) => this.handleLinkClick(event, d));

    // Add nodes
    const nodeGroup = this.container.append('g')
      .selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', d => `node node-${d.resource.category.toLowerCase()}`)
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => this.dragstarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragended(event, d)));

    // Add node rectangles
    nodeGroup.append('rect')
      .attr('width', 120)
      .attr('height', 60)
      .attr('x', -60)
      .attr('y', -30);

    // Add resource type text
    nodeGroup.append('text')
      .attr('dy', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text(d => d.resource.type);

    // Add resource name text
    nodeGroup.append('text')
      .attr('dy', 10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text(d => d.resource.name);

    // Add event handlers to nodes
    nodeGroup
      .on('mouseover', (event, d) => this.handleNodeMouseOver(event, d))
      .on('mouseout', (event, d) => this.handleNodeMouseOut(event, d))
      .on('click', (event, d) => this.handleNodeClick(event, d));

    // Update simulation
    this.simulation
      .nodes(this.nodes)
      .force<d3.ForceLink<Node, Link>>('link')!
      .links(this.links);

    this.simulation.alpha(1).restart();
  }

  private ticked(): void {
    // Update link positions
    this.container.selectAll<SVGPathElement, Link>('path.link')
      .attr('d', d => {
        const sourceX = (d.source as Node).x || 0;
        const sourceY = (d.source as Node).y || 0;
        const targetX = (d.target as Node).x || 0;
        const targetY = (d.target as Node).y || 0;
        
        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
      });

    // Update node positions
    this.container.selectAll<SVGGElement, Node>('.node')
      .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
  }

  private dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  private handleNodeMouseOver(event: MouseEvent, d: Node): void {
    // Highlight node
    d3.select(event.currentTarget as Element)
      .select('rect')
      .attr('stroke-width', 3);
      
    // Show tooltip
    this.tooltip
      .html(`<strong>${d.resource.type}.${d.resource.name}</strong>`)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 30}px`)
      .style('opacity', 1);
  }

  private handleNodeMouseOut(event: MouseEvent, d: Node): void {
    // Reset node styling
    d3.select(event.currentTarget as Element)
      .select('rect')
      .attr('stroke-width', 2);
      
    // Hide tooltip
    this.tooltip.style('opacity', 0);
  }

  private handleNodeClick(event: MouseEvent, d: Node): void {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    // Show resource details
    this.showResourceDetails(d.resource);
  }

  private handleLinkMouseOver(event: MouseEvent, d: Link): void {
    // Highlight link
    d3.select(event.currentTarget as Element)
      .classed('link-hover', true);
      
    // Show tooltip with reference information
    const refs = d.dependency.references;
    const tooltipContent = `
      <strong>Dependency</strong><br>
      ${refs.length} reference${refs.length > 1 ? 's' : ''}
    `;
    
    this.tooltip
      .html(tooltipContent)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 30}px`)
      .style('opacity', 1);
  }

  private handleLinkMouseOut(event: MouseEvent, d: Link): void {
    // Reset link styling
    d3.select(event.currentTarget as Element)
      .classed('link-hover', false);
      
    // Hide tooltip
    this.tooltip.style('opacity', 0);
  }

  private handleLinkClick(event: MouseEvent, d: Link): void {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    // Show dependency details
    this.showDependencyDetails(d.dependency);
  }

  private showResourceDetails(resource: TerraformResource): void {
    // Format resource inputs as readable properties
    const inputsHtml = Object.entries(resource.inputs)
      .map(([key, value]) => `
        <div class="property">
          <div class="property-name">${key}</div>
          <div class="property-value">${JSON.stringify(value)}</div>
        </div>
      `)
      .join('');

    // Create HTML for resource details
    const html = `
      <div class="resource-type">${resource.type}</div>
      <div class="resource-name">${resource.name}</div>
      <div class="resource-category">Category: ${resource.category}</div>
      <div class="resource-location">File: ${resource.location.file}</div>
      
      <div class="properties-section">
        <h3>Inputs</h3>
        ${inputsHtml}
      </div>
    `;
    
    this.detailsPanel.innerHTML = html;
  }

  private showDependencyDetails(dependency: ResourceDependency): void {
    // Find source and target resources
    const sourceResource = this.nodes.find(n => n.id === dependency.source)?.resource;
    const targetResource = this.nodes.find(n => n.id === dependency.target)?.resource;
    
    if (!sourceResource || !targetResource) {
      console.error('Could not find resources for dependency:', dependency);
      return;
    }
    
    // Format references
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

    // Create HTML for dependency details
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
    
    this.detailsPanel.innerHTML = html;
  }
}

// Initialize the app when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DiagramApp();
});