import { NodeEditor, ClassicPreset, BaseSchemes } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, ReactArea2D, Presets as ReactPresets } from 'rete-react-plugin';
import { AutoArrangePlugin } from 'rete-auto-arrange-plugin';
import { DiagramData, TerraformResource, ResourceDependency } from '../parser/types';
import { ResourcePanel } from './components/resource-panel';
import { getNodeStyle } from './rete-utils';

// Define socket types
const inputSocket = new ClassicPreset.Socket('input');
const outputSocket = new ClassicPreset.Socket('output');

// Define node types
class TerraformNode extends ClassicPreset.Node {
  width = 200;
  height = 100;
  
  constructor(public id: string, public data: { resource: TerraformResource }) {
    super(id);
    this.addInput('in', new ClassicPreset.Input(inputSocket));
    this.addOutput('out', new ClassicPreset.Output(outputSocket));
  }
}

// Define scheme types
type Schemes = BaseSchemes & {
  Node: TerraformNode,
  Connection: ClassicPreset.Connection<TerraformNode, TerraformNode>
}

export class ReteVisualizer {
  private editor: NodeEditor<Schemes>;
  private area: AreaPlugin<Schemes, ReactArea2D<Schemes>>;
  private connection: ConnectionPlugin<Schemes>;
  private arrange: AutoArrangePlugin<Schemes>;
  private reactPlugin: ReactPlugin<Schemes, ReactArea2D<Schemes>>;
  private resourcePanel: ResourcePanel;
  private nodes = new Map<string, TerraformNode>();
  private dependencies = new Map<string, ResourceDependency>();
  private currentData: DiagramData | null = null;

  constructor(
    private container: HTMLElement,
    resourcePanel?: ResourcePanel
  ) {
    this.resourcePanel = resourcePanel || new ResourcePanel();

    // Initialize editor and plugins
    this.editor = new NodeEditor<Schemes>();
    this.area = new AreaPlugin<Schemes, ReactArea2D<Schemes>>(container);
    this.connection = new ConnectionPlugin<Schemes>();
    this.arrange = new AutoArrangePlugin<Schemes>();
    this.reactPlugin = new ReactPlugin<Schemes, ReactArea2D<Schemes>>();

    // Setup plugins in the correct order
    this.editor.use(this.area);
    this.area.use(this.reactPlugin);
    this.area.use(this.connection);
    this.area.use(this.arrange);

    // Configure React plugin with default preset
    this.reactPlugin.addPreset(ReactPresets.classic.setup());

    // Configure connection plugin with default preset
    this.connection.addPreset(ConnectionPresets.classic.setup());

    // Prevent node modification by intercepting area events
    this.area.addPipe(context => {
      if (context.type === 'pointerdown') {
        const element = context.data.event.target as HTMLElement;
        if (element.closest('.node')) {
          return undefined; // Prevent node interaction
        }
      }
      return context;
    });

    // Setup node selection handler
    this.area.addPipe(context => {
      if (context.type === 'pointerdown') {
        const element = context.data.event.target as HTMLElement;
        const nodeElement = element.closest('.node');
        if (nodeElement) {
          const nodeId = nodeElement.getAttribute('data-node-id');
          if (nodeId && this.currentData) {
            const resource = this.currentData.resources.find(r => 
              `${r.type}.${r.name}` === nodeId
            );
            if (resource) {
              this.resourcePanel.showResourceDetails(resource);
            }
          }
        }
      }
      return context;
    });

    // Setup connection click handler
    this.area.addPipe(context => {
      if (context.type === 'pointerdown') {
        const element = context.data.event.target as HTMLElement;
        const connectionElement = element.closest('.connection');
        if (connectionElement) {
          const sourceId = connectionElement.getAttribute('data-source-id');
          const targetId = connectionElement.getAttribute('data-target-id');
          if (sourceId && targetId) {
            const dependency = this.dependencies.get(`${sourceId}-${targetId}`);
            if (dependency) {
              this.resourcePanel.showDependencyDetails(dependency);
            }
          }
        }
      }
      return context;
    });
  }

  async visualize(data: DiagramData) {
    this.currentData = data;
    this.dependencies.clear();
    
    // Clear existing nodes and connections
    for (const node of this.editor.getNodes()) {
      this.editor.removeNode(node.id);
    }
    this.nodes.clear();

    // Create nodes for resources
    for (const resource of data.resources) {
      const id = `${resource.type}.${resource.name}`;
      const node = new TerraformNode(id, { resource });
      
      this.nodes.set(id, node);
      await this.editor.addNode(node);
    }

    // Create connections for dependencies
    for (const dependency of data.dependencies) {
      const sourceNode = this.nodes.get(dependency.source);
      const targetNode = this.nodes.get(dependency.target);
      
      if (sourceNode && targetNode) {
        const connection = new ClassicPreset.Connection(
          sourceNode, 
          'out', 
          targetNode, 
          'in'
        );
        
        await this.editor.addConnection(connection);
        this.dependencies.set(`${dependency.source}-${dependency.target}`, dependency);
      }
    }

    // Arrange nodes
    await this.arrangeNodes();
  }

  private async arrangeNodes() {
    if (this.nodes.size === 0) return;

    await this.arrange.layout({
      options: {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '80'
      }
    });
  }

  destroy() {
    this.editor.getNodes().forEach(node => this.editor.removeNode(node.id));
  }
}