export enum ResourceCategory {
    NETWORKING = 'networking',
    COMPUTE = 'compute',
    STORAGE = 'storage',
    DATABASE = 'database',
    SECURITY = 'security',
    ANALYTICS = 'analytics',
    CONTAINER = 'container',
    OTHER = 'other'
  }
  
  // Map AWS resource types to categories
  export const resourceCategoryMap: Record<string, ResourceCategory> = {
    // Networking resources
    'aws_vpc': ResourceCategory.NETWORKING,
    'aws_subnet': ResourceCategory.NETWORKING,
    'aws_route_table': ResourceCategory.NETWORKING,
    'aws_route': ResourceCategory.NETWORKING,
    'aws_internet_gateway': ResourceCategory.NETWORKING,
    'aws_nat_gateway': ResourceCategory.NETWORKING,
    'aws_network_interface': ResourceCategory.NETWORKING,
    'aws_security_group': ResourceCategory.NETWORKING,
    'aws_security_group_rule': ResourceCategory.NETWORKING,
    'aws_network_acl': ResourceCategory.NETWORKING,
    'aws_network_acl_rule': ResourceCategory.NETWORKING,
    'aws_vpc_endpoint': ResourceCategory.NETWORKING,
    'aws_vpc_peering_connection': ResourceCategory.NETWORKING,
    'aws_lb': ResourceCategory.NETWORKING,
    'aws_lb_listener': ResourceCategory.NETWORKING,
    'aws_lb_target_group': ResourceCategory.NETWORKING,
    
    // Compute resources
    'aws_instance': ResourceCategory.COMPUTE,
    'aws_launch_template': ResourceCategory.COMPUTE,
    'aws_autoscaling_group': ResourceCategory.COMPUTE,
    'aws_lambda_function': ResourceCategory.COMPUTE,
    
    // Storage resources
    'aws_s3_bucket': ResourceCategory.STORAGE,
    'aws_ebs_volume': ResourceCategory.STORAGE,
    'aws_efs_file_system': ResourceCategory.STORAGE,
    
    // Default for unspecified resources
    'default': ResourceCategory.OTHER
  };
  
  export interface TerraformResource {
    type: string;
    name: string;
    category: ResourceCategory;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    location: {
      file: string;
      line: number;
    };
  }
  
  export interface ResourceDependency {
    source: string; // Source resource ID (type.name)
    target: string; // Target resource ID (type.name)
    references: {
      sourceProp: string;
      targetProp: string;
      value: string;
    }[];
  }
  
  export interface DiagramData {
    resources: TerraformResource[];
    dependencies: ResourceDependency[];
  }