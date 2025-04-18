import * as d3 from 'd3';
import { TerraformResource, ResourceDependency } from '../../parser/types';
import { ResourcePanel } from './resource-panel';

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

/**
 * Diagram component for rendering the interactive Terraform resource visualization
 */
export class Diagram {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private simulation: d3.Simulation<Node, Link>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private container: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private resourcePanel: ResourcePanel;
  
  private resources: TerraformResource[] = [];
  private dependencies: ResourceDependency[] = [];
  private nodes: Node[] = [];
  private links: Link[] = [];

  /**
   * Initialize the diagram
   * @param svgId The ID of the SVG element
   * @param resourcePanel Resource panel instance for showing details
   */
  constructor(svgId: string = 'diagram', resourcePanel?: ResourcePanel) {
    this.svg = d3.select<SVGSVGElement, unknown>(`#${svgId}`);
    this.width = this.svg.node()!.clientWidth;
    this.height = this.svg.node()!.clientHeight;
    
    // Use provided resource panel or create new one
    this.resourcePanel = resourcePanel || new ResourcePanel();

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

    // Setup window resize handler
    this.setupResizeHandler();
  }

  /**
   * Handle window resize events
   */
  private setupResizeHandler(): void {
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

  /**
   * Update the diagram with new data
   * @param resources The Terraform resources to render
   * @param dependencies The dependencies between resources
   */
  public update(resources: TerraformResource[], dependencies: ResourceDependency[]): void {
    this.resources = resources;
    this.dependencies = dependencies;
    
    this.processData();
    this.render();
  }

  /**
   * Process the resource and dependency data into nodes and links
   */
  private processData(): void {
    // Create nodes from resources
    this.nodes = this.resources.map(resource => ({
      id: `${resource.type}.${resource.name}`,
      resource
    }));

    // Create links from dependencies
    this.links = this.dependencies.map(dependency => ({
      source: dependency.source,
      target: dependency.target,
      dependency
    }));
  }

  /**
   * Render the diagram
   */
  private render(): void {
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

  /**
   * Handle simulation tick events to update positions
   */
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

  /**
   * Handle drag start event
   */
  private dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  /**
   * Handle drag event
   */
  private dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  /**
   * Handle drag end event
   */
  private dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node): void {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  /**
   * Handle mouse over event on nodes
   */
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

  /**
   * Handle mouse out event on nodes
   */
  private handleNodeMouseOut(event: MouseEvent, d: Node): void {
    // Reset node styling
    d3.select(event.currentTarget as Element)
      .select('rect')
      .attr('stroke-width', 2);
      
    // Hide tooltip
    this.tooltip.style('opacity', 0);
  }

  /**
   * Handle click event on nodes
   */
  private handleNodeClick(event: MouseEvent, d: Node): void {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    // Show resource details
    this.resourcePanel.showResourceDetails(d.resource);
  }

  /**
   * Handle mouse over event on links
   */
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

  /**
   * Handle mouse out event on links
   */
  private handleLinkMouseOut(event: MouseEvent, d: Link): void {
    // Reset link styling
    d3.select(event.currentTarget as Element)
      .classed('link-hover', false);
      
    // Hide tooltip
    this.tooltip.style('opacity', 0);
  }

  /**
   * Handle click event on links
   */
  private handleLinkClick(event: MouseEvent, d: Link): void {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    // Find source and target resources
    const sourceResource = this.nodes.find(n => n.id === d.dependency.source)?.resource;
    const targetResource = this.nodes.find(n => n.id === d.dependency.target)?.resource;
    
    if (!sourceResource || !targetResource) {
      console.error('Could not find resources for dependency:', d.dependency);
      return;
    }
    
    // Show dependency details
    this.resourcePanel.showDependencyDetails(d.dependency, sourceResource, targetResource);
  }

  /**
   * Zoom to fit all elements in view
   */
  public zoomToFit(): void {
    if (!this.nodes.length) return;
    
    const bounds = this.container.node()!.getBBox();
    const dx = bounds.width;
    const dy = bounds.height;
    const x = bounds.x + dx / 2;
    const y = bounds.y + dy / 2;
    
    const scale = 0.8 / Math.max(dx / this.width, dy / this.height);
    const translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];
    
    this.svg.transition()
      .duration(750)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale)
      );
  }
}