import { ClassicPreset } from 'rete';
import { ResourceCategory } from '../parser/types';

// Create a shared socket to ensure connections work properly
export const resourceSocket = new ClassicPreset.Socket('resource');

// Create a custom node class for terraform resources
export class TerraformResourceNode extends ClassicPreset.Node {
  constructor(id: string, public category: ResourceCategory) {
    super(id);
    
    // Add standard input and output sockets
    this.addInput('in', new ClassicPreset.Input(resourceSocket, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(resourceSocket, 'Output'));
  }
}

// Get a color for a resource category
export function getCategoryColor(category: ResourceCategory): string {
  switch(category.toLowerCase()) {
    case 'networking':
      return '#3498db';
    case 'compute':
      return '#e74c3c';
    case 'storage':
      return '#2ecc71';
    case 'database':
      return '#9b59b6';
    case 'security':
      return '#f39c12';
    default:
      return '#95a5a6'; // other
  }
}

// Helper function to create a React-style inline CSS object from a resource category
export function getNodeStyle(category: ResourceCategory): Record<string, string> {
  const color = getCategoryColor(category);
  
  return {
    backgroundColor: color,
    border: `2px solid ${darkenColor(color, 0.2)}`,
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    width: '160px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
  };
}

// Helper function to darken a color (for borders)
function darkenColor(color: string, amount: number): string {
  // Simple function to darken a hex color
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  r = Math.floor(r * (1 - amount));
  g = Math.floor(g * (1 - amount));
  b = Math.floor(b * (1 - amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}