provider "aws" {
  region = "us-west-2"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  
  tags = {
    Name = "main-vpc"
    Environment = "dev"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "main-igw"
    Environment = "dev"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id = aws_vpc.main.id
  cidr_block = count.index == 0 ? "10.0.1.0/24" : "10.0.2.0/24"
  availability_zone = count.index == 0 ? "us-west-2a" : "us-west-2b"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet-${count.index}"
    Environment = "dev"
    Type = "Public"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  count = 2
  
  vpc_id = aws_vpc.main.id
  cidr_block = count.index == 0 ? "10.0.3.0/24" : "10.0.4.0/24"
  availability_zone = count.index == 0 ? "us-west-2a" : "us-west-2b"
  
  tags = {
    Name = "private-subnet-${count.index}"
    Environment = "dev"
    Type = "Private"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "nat-eip"
    Environment = "dev"
  }
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id = aws_subnet.public[0].id
  
  tags = {
    Name = "main-nat"
    Environment = "dev"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "public-rt"
    Environment = "dev"
  }
}

# Route Table for Private Subnet
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  
  tags = {
    Name = "private-rt"
    Environment = "dev"
  }
}

# Route Table Association for Public Subnet
resource "aws_route_table_association" "public" {
  count = 2
  
  subnet_id = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table Association for Private Subnet
resource "aws_route_table_association" "private" {
  count = 2
  
  subnet_id = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Group for Web Servers
resource "aws_security_group" "web" {
  name = "web-sg"
  description = "Allow HTTP/HTTPS and SSH traffic"
  vpc_id = aws_vpc.main.id
  
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "web-sg"
    Environment = "dev"
  }
}

# EC2 Instance (Web Server)
resource "aws_instance" "web" {
  count = 2
  
  ami = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  subnet_id = aws_subnet.public[count.index].id
  vpc_security_group_ids = [aws_security_group.web.id]
  
  tags = {
    Name = "web-server-${count.index}"
    Environment = "dev"
  }
}

# Load Balancer Security Group
resource "aws_security_group" "lb" {
  name = "lb-sg"
  description = "Allow HTTP/HTTPS traffic to load balancer"
  vpc_id = aws_vpc.main.id
  
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "lb-sg"
    Environment = "dev"
  }
}

# Application Load Balancer
resource "aws_lb" "web" {
  name = "web-lb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.lb.id]
  subnets = aws_subnet.public[*].id
  
  tags = {
    Name = "web-lb"
    Environment = "dev"
  }
}

# Target Group for ALB
resource "aws_lb_target_group" "web" {
  name = "web-tg"
  port = 80
  protocol = "HTTP"
  vpc_id = aws_vpc.main.id
  
  health_check {
    path = "/"
    port = "traffic-port"
  }
}

# Target Group Attachment
resource "aws_lb_target_group_attachment" "web" {
  count = 2
  
  target_group_arn = aws_lb_target_group.web.arn
  target_id = aws_instance.web[count.index].id
  port = 80
}

# ALB Listener
resource "aws_lb_listener" "web" {
  load_balancer_arn = aws_lb.web.arn
  port = 80
  protocol = "HTTP"
  
  default_action {
    type = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "load_balancer_dns" {
  value = aws_lb.web.dns_name
}

output "web_instance_ips" {
  value = aws_instance.web[*].private_ip
}