// Example usage of the Rete.js-based Terraform Visualizer API

import { ReteVisualizer } from './src/frontend/rete-visualizer';
import { ResourcePanel } from './src/frontend/components/resource-panel';
import { DiagramData, TerraformResource, ResourceCategory } from './src/parser/types';

// Example 1: Basic initialization and visualization
function basicUsageExample() {
  // Get the container element where the visualization will be rendered
  const container = document.getElementById('diagram');
  
  // Create a resource panel for showing resource details
  const resourcePanel = new ResourcePanel('resource-details');
  
  // Initialize the Rete.js visualizer
  const visualizer = new ReteVisualizer(container, resourcePanel);
  
  // Sample data
  const data: DiagramData = {
    resources: [
      {
        type: 'aws_vpc',
        name: 'main',
        category: 'networking',
        inputs: { cidr_block: '10.0.0.0/16' },
        outputs: {},
        location: { file: 'main.tf', line: 1 }
      },
      {
        type: 'aws_subnet',
        name: 'public',
        category: 'networking',
        inputs: { 
          vpc_id: '${aws_vpc.main.id}',
          cidr_block: '10.0.1.0/24'
        },
        outputs: {},
        location: { file: 'main.tf', line: 10 }
      }
    ],
    dependencies: [
      {
        source: 'aws_subnet.public',
        target: 'aws_vpc.main',
        references: [
          {
            sourceProp: 'vpc_id',
            targetProp: 'id',
            value: '${aws_vpc.main.id}'
          }
        ]
      }
    ]
  };
  
  // Visualize the data
  visualizer.visualize(data);
}

// Example 2: Custom node styling
function customNodeStylingExample() {
  // Get the container element
  const container = document.getElementById('diagram');
  
  // Initialize with custom styling
  const visualizer = new ReteVisualizer(container);
  
  // Create a custom node component
  const CustomResourceNode = ({ data }) => {
    const resource = data.resource;
    
    // Custom styling based on resource type
    const getStyle = () => {
      switch(resource.type) {
        case 'aws_vpc':
          return { backgroundColor: '#003366', borderColor: '#001a33' };
        case 'aws_subnet':
          return { backgroundColor: '#0066cc', borderColor: '#004d99' };
        case 'aws_instance':
          return { backgroundColor: '#cc0000', borderColor: '#990000' };
        default:
          return { backgroundColor: '#666666', borderColor: '#444444' };
      }
    };
    
    const style = {
      ...getStyle(),
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      width: '180px',
      boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
      border: `2px solid ${getStyle().borderColor}`
    };
    
    return (
      <div style={style}>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>{resource.type}</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>{resource.name}</div>
        {resource.inputs.cidr_block && 
          <div style={{ fontSize: '10px', marginTop: '5px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px' }}>
            CIDR: {resource.inputs.cidr_block}
          </div>
        }
      </div>
    );
  };
  
  // Set the custom node component - note: you would need to extend the ReteVisualizer class with this method
  visualizer.setCustomNodeComponent(CustomResourceNode);
  
  // Fetch and visualize data
  fetch('/api/diagram')
    .then(response => response.json())
    .then(data => visualizer.visualize(data));
}

// Example 3: Custom layout options
function customLayoutExample() {
  const container = document.getElementById('diagram');
  const visualizer = new ReteVisualizer(container);
  
  // Configure custom layout options
  visualizer.setLayoutOptions({
    'elk.algorithm': 'stress', // Use stress-based layout instead of layered
    'elk.spacing.nodeNode': '100', // Increase spacing between nodes
    'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Increase layer spacing
    'elk.direction': 'DOWN' // Set layout direction
  });
  
  // Load and visualize data
  fetch('/api/diagram')
    .then(response => response.json())
    .then(data => visualizer.visualize(data));
}

// Example 4: Adding custom event listeners
function customEventsExample() {
  const container = document.getElementById('diagram');
  const visualizer = new ReteVisualizer(container);
  
  // Add custom event handlers for nodes
  visualizer.onNodeSelected((node, resource) => {
    console.log('Node selected:', resource.type, resource.name);
    // Highlight related resources
    visualizer.highlightConnectedNodes(node.id);
  });
  
  // Add custom event handlers for connections
  visualizer.onConnectionSelected((connection, source, target) => {
    console.log('Connection selected between:', source.type, source.name, 'and', target.type, target.name);
    // Show connection details in a custom popup
    showConnectionDetailsPopup(source, target, connection);
  });
  
  // Handle background clicks to clear selections
  visualizer.onBackgroundClick(() => {
    console.log('Background clicked, clearing selection');
    visualizer.clearSelection();
    hideAllPopups();
  });
  
  // Load and visualize data
  fetch('/api/diagram')
    .then(response => response.json())
    .then(data => visualizer.visualize(data));
}

// Example 5: Filtering and highlighting resources
function filteringExample() {
  const container = document.getElementById('diagram');
  const visualizer = new ReteVisualizer(container);
  
  // Create filter controls
  const networkingFilterBtn = document.getElementById('filter-networking');
  const computeFilterBtn = document.getElementById('filter-compute');
  const resetFilterBtn = document.getElementById('filter-reset');
  
  // Add event listeners to filter buttons
  networkingFilterBtn.addEventListener('click', () => {
    visualizer.filterByCategory('networking');
  });
  
  computeFilterBtn.addEventListener('click', () => {
    visualizer.filterByCategory('compute');
  });
  
  resetFilterBtn.addEventListener('click', () => {
    visualizer.resetFilters();
  });
  
  // Create search functionality
  const searchInput = document.getElementById('search-resources');
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length > 2) {
      visualizer.searchNodes(searchTerm);
    } else if (searchTerm.length === 0) {
      visualizer.resetSearch();
    }
  });
  
  // Load and visualize data
  fetch('/api/diagram')
    .then(response => response.json())
    .then(data => visualizer.visualize(data));
}

// Example 6: Exporting and sharing diagrams
function exportExample() {
  const container = document.getElementById('diagram');
  const visualizer = new ReteVisualizer(container);
  
  // Add export buttons
  const exportPngBtn = document.getElementById('export-png');
  const exportSvgBtn = document.getElementById('export-svg');
  const shareLinkBtn = document.getElementById('share-link');
  
  // Export as PNG
  exportPngBtn.addEventListener('click', () => {
    visualizer.exportToPNG().then(dataUrl => {
      // Create download link
      const link = document.createElement('a');
      link.download = 'terraform-diagram.png';
      link.href = dataUrl;
      link.click();
    });
  });
  
  // Export as SVG
  exportSvgBtn.addEventListener('click', () => {
    const svgData = visualizer.exportToSVG();
    const blob = new Blob([svgData], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = 'terraform-diagram.svg';
    link.href = url;
    link.click();
  });
  
  // Generate shareable link with diagram state
  shareLinkBtn.addEventListener('click', () => {
    const state = visualizer.getState();
    const stateParam = encodeURIComponent(JSON.stringify(state));
    const shareUrl = `${window.location.origin}${window.location.pathname}?state=${stateParam}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Shareable link copied to clipboard!');
    });
  });
  
  // Check if we're loading from a shared state
  const urlParams = new URLSearchParams(window.location.search);
  const stateParam = urlParams.get('state');
  
  if (stateParam) {
    try {
      const state = JSON.parse(decodeURIComponent(stateParam));
      visualizer.setState(state);
    } catch (error) {
      console.error('Failed to parse state parameter:', error);
      // Fall back to loading data normally
      loadDiagramData();
    }
  } else {
    loadDiagramData();
  }
  
  function loadDiagramData() {
    fetch('/api/diagram')
      .then(response => response.json())
      .then(data => visualizer.visualize(data));
  }
}

// Example 7: Interactive editing of infrastructure (conceptual)
function interactiveEditingExample() {
  const container = document.getElementById('diagram');
  const visualizer = new ReteVisualizer(container, null, { editable: true });
  
  // Add resource button
  const addVpcBtn = document.getElementById('add-vpc');
  const addSubnetBtn = document.getElementById('add-subnet');
  const addInstanceBtn = document.getElementById('add-instance');
  const generateTerraformBtn = document.getElementById('generate-terraform');
  
  // Add VPC node
  addVpcBtn.addEventListener('click', () => {
    const vpcName = prompt('Enter VPC name:', 'main');
    const cidrBlock = prompt('Enter CIDR block:', '10.0.0.0/16');
    
    if (vpcName && cidrBlock) {
      visualizer.addResource({
        type: 'aws_vpc',
        name: vpcName,
        category: 'networking',
        inputs: { 
          cidr_block: cidrBlock,
          enable_dns_support: true,
          enable_dns_hostnames: true
        },
        outputs: {},
        location: { file: 'main.tf', line: 0 }
      });
    }
  });
  
  // Add Subnet node
  addSubnetBtn.addEventListener('click', () => {
    const subnetName = prompt('Enter Subnet name:', 'public');
    const cidrBlock = prompt('Enter CIDR block:', '10.0.1.0/24');
    
    if (subnetName && cidrBlock) {
      const subnet = {
        type: 'aws_subnet',
        name: subnetName,
        category: 'networking',
        inputs: {
          cidr_block: cidrBlock,
          map_public_ip_on_launch: true
        },
        outputs: {},
        location: { file: 'main.tf', line: 0 }
      };
      
      visualizer.addResource(subnet);
      
      // Prompt to connect to a VPC
      const vpcs = visualizer.getResourcesByType('aws_vpc');
      if (vpcs.length > 0) {
        const connectToVpc = confirm('Connect to existing VPC?');
        if (connectToVpc) {
          // Show VPC selection if multiple
          let vpcId = vpcs[0].id;
          if (vpcs.length > 1) {
            const vpcOptions = vpcs.map((vpc, i) => `${i}: ${vpc.name}`).join('\n');
            const vpcIndex = prompt(`Select VPC by number:\n${vpcOptions}`);
            if (vpcIndex !== null && vpcs[Number(vpcIndex)]) {
              vpcId = vpcs[Number(vpcIndex)].id;
            }
          }
          
          // Add dependency
          visualizer.addDependency(
            `aws_subnet.${subnetName}`,
            vpcId,
            [{
              sourceProp: 'vpc_id',
              targetProp: 'id',
              value: `\${${vpcId}.id}`
            }]
          );
          
          // Update subnet inputs with VPC reference
          subnet.inputs.vpc_id = `\${${vpcId}.id}`;
        }
      }
    }
  });
  
  // Generate Terraform code
  generateTerraformBtn.addEventListener('click', () => {
    const tfCode = visualizer.generateTerraformCode();
    
    // Display in a modal or textarea
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '5px';
    modal.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    modal.style.zIndex = '9999';
    modal.style.maxWidth = '80%';
    modal.style.maxHeight = '80%';
    modal.style.overflow = 'auto';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => modal.remove());
    
    const textarea = document.createElement('textarea');
    textarea.value = tfCode;
    textarea.style.width = '600px';
    textarea.style.height = '400px';
    textarea.style.fontFamily = 'monospace';
    
    modal.appendChild(textarea);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
  });
  
  // Load initial diagram data
  fetch('/api/diagram')
    .then(response => response.json())
    .then(data => visualizer.visualize(data));
}