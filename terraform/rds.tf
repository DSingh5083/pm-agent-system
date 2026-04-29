# ── RDS PostgreSQL 15 with pgvector ──────────────────────────────────────────
# pgvector is a first-party extension on RDS PostgreSQL 15+

resource "aws_db_parameter_group" "pg15" {
  name        = "${var.project_name}-pg15-params"
  family      = "postgres15"
  description = "Enable pgvector on PostgreSQL 15"

  # pgvector must be listed in shared_preload_libraries on RDS
  parameter {
    name         = "shared_preload_libraries"
    value        = "vector"
    apply_method = "pending-reboot"
  }

  tags = {
    Name        = "${var.project_name}-pg15-params"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-postgres"
  engine         = "postgres"
  engine_version = "15.7"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.pg15.name

  # No public access — only reachable from the EC2 security group
  publicly_accessible = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:00-Sun:05:00"

  deletion_protection = false  # Set to true for production after first deploy
  skip_final_snapshot = true   # Set to false for production

  tags = {
    Name        = "${var.project_name}-postgres"
    Environment = var.environment
  }
}
