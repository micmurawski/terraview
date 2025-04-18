import { NodeEditor, ClassicPreset, GetSchemes, Node, Connection } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import ReactRenderPlugin from 'rete-react-render-plugin';
import { DiagramData, TerraformResource } from '../parser/types.js';

const socket = new ClassicPreset.Socket('socket');

class ResourceNode extends ClassicPreset.Node {
  constructor(public resource: TerraformResource) {
    super(resource.name);
    this.addOutput('out', new ClassicPreset.Output(socket, 'Output'));
    this.addInput('in', new ClassicPreset.Input(socket, 'Input'));
  }
}

type NodeTypes = {
  [id: string]: ResourceNode;
};

type ConnectionTypes = {
  [id: string]: ClassicPreset.Connection<ResourceNode, ResourceNode>;
};

type Schemes = {
  Node: ResourceNode;
  Connection: ClassicPreset.Connection<ResourceNode, ResourceNode>;
  nodes: NodeTypes;
  connections: ConnectionTypes;
};

export class ReteVisualizer {
  private editor: NodeEditor<Schemes>;
  private area: AreaPlugin<Schemes>;
  private connection: ConnectionPlugin<Schemes>;

  constructor(private container: HTMLElement) {
    this.editor = new NodeEditor<Schemes>();
    this.area = new AreaPlugin<Schemes>(container);
    this.connection = new ConnectionPlugin<Schemes>();

    this.editor.use(this.area);
    this.editor.use(this.connection);
    this.editor.use(ReactRenderPlugin);
  }

  async visualize(data: DiagramData) {
    // Clear existing nodes
    this.editor.getNodes().forEach(node => this.editor.removeNode(node.id));

    // Create nodes for each resource
    const nodes = new Map<string, ResourceNode>();
    for (const resource of data.resources) {
      const node = new ResourceNode(resource);
      nodes.set(`${resource.type}.${resource.name}`, node);
      await this.editor.addNode(node);
    }

    // Create connections for dependencies
    for (const dependency of data.dependencies) {
      const source = nodes.get(dependency.source);
      const target = nodes.get(dependency.target);
      if (source && target) {
        await this.editor.addConnection(new ClassicPreset.Connection(source, 'out', target, 'in'));
      }
    }

    // Arrange nodes in a grid
    const nodesList = this.editor.getNodes();
    if (nodesList.length > 0) {
      await this.area.translate(nodesList[0].id, { x: 0, y: 0 });
    }
  }

  destroy() {
    this.editor.getNodes().forEach(node => this.editor.removeNode(node.id));
  }
} 