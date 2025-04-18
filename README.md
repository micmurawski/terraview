# Terraform Visualizer

An interactive diagram generator for Terraform code. This tool analyzes your Terraform files and creates a visual representation of your infrastructure, showing resources and their dependencies.

## Features

- Interactive visualization of Terraform resources
- Resource grouping by category (networking, compute, storage, etc.)
- Dependency analysis and visualization
- Detailed view of resource properties and references
- Support for AWS resources (VPC, EC2, and more)

## Installation

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/terraform-visualizer.git
   cd terraform-visualizer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Usage

### Basic Usage

To analyze and visualize Terraform files in a directory:

```bash
npx terraform-visualizer /path/to/terraform/files
```

This will:
1. Analyze the Terraform files in the specified directory
2. Start a local web server (default port: 3000)
3. Open your default browser to display the interactive diagram

### Command Line Options

```
Usage: terraform-visualizer [options] <directory>

Arguments:
  directory             Path to the directory containing Terraform files

Options:
  -p, --port <number>   Port to run the server on (default: "3000")
  -o, --open            Automatically open the browser (default: true)
  -h, --help            Display help
  -V, --version         Output the version number
```

## Using the Diagram

### Navigation

- **Pan**: Click and drag on the background
- **Zoom**: Use mouse wheel or the zoom buttons
- **Move Resources**: Drag and drop resource boxes

### Resource Information

- **Hover over a resource**: Shows basic information
- **Click on a resource**: Displays detailed information in the side panel
- **Click on a dependency line**: Shows what outputs/attributes are referenced between resources

## Terraform Resource Types

The visualizer categorizes resources by type:

- **Networking**: VPC, Subnet, Security Group, etc.
- **Compute**: EC2 Instances, Auto Scaling Groups, etc.
- **Storage**: S3 Buckets, EBS Volumes, etc.
- **Database**: RDS, DynamoDB, etc.
- **Security**: IAM roles, policies, etc.
- **Other**: Any resource types not matching the categories above

## Development

### Project Structure

```
terraform-visualizer/
├── src/
│   ├── index.ts                  # Main entry point
│   ├── parser/
│   │   ├── terraform-parser.ts   # Parse Terraform files
│   │   ├── resource-extractor.ts # Extract resources and relationships
│   │   └── types.ts              # TypeScript interfaces
│   ├── server/
│   │   └── server.ts             # Express server
│   └── frontend/
│       ├── index.html
│       ├── styles.css
│       ├── app.ts                # Frontend application code
│       └── components/
│           ├── diagram.ts        # Diagram rendering
│           └── resource-panel.ts # Resource details panel
```

### Running in Development Mode

```bash
npm run dev /path/to/terraform/files
```

## Future Enhancements

- Support for Terraform modules
- Export diagram as PNG/SVG
- Custom layout options
- Support for more cloud providers (Azure, GCP)
- Integration with Terraform Cloud

## License

MIT