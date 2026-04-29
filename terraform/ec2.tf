# ── Latest Ubuntu 22.04 LTS AMI ───────────────────────────────────────────────

data "aws_ami" "ubuntu_22" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Elastic IP (stable public address for the backend) ───────────────────────

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-eip"
    Environment = var.environment
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

# ── EC2 instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu_22.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_pair_name
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    aws_region        = var.aws_region
    project_name      = var.project_name
    environment       = var.environment
    secrets_arn       = aws_secretsmanager_secret.app_secrets.arn
    db_host           = aws_db_instance.postgres.address
    db_port           = aws_db_instance.postgres.port
    db_name           = var.db_name
    db_username       = var.db_username
    langchain_project = var.langchain_project
    frontend_url      = var.frontend_url
  }))

  tags = {
    Name        = "${var.project_name}-app-server"
    Environment = var.environment
  }

  # Wait for the RDS instance to be ready before booting EC2
  depends_on = [aws_db_instance.postgres]
}
