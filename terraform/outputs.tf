output "ec2_public_ip" {
  description = "Elastic IP address of the application server"
  value       = aws_eip.app.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the application server"
  value       = aws_instance.app.public_dns
}

output "backend_url" {
  description = "Backend API URL (direct)"
  value       = "http://${aws_eip.app.public_ip}:3001"
}

output "frontend_url" {
  description = "Frontend URL served via Nginx"
  value       = "http://${aws_eip.app.public_ip}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private — accessible from EC2 only)"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "database_url" {
  description = "Full DATABASE_URL for the application (sensitive)"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret holding all API keys"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "ssh_command" {
  description = "SSH command to access the EC2 instance"
  value       = "ssh -i ~/.ssh/${var.ec2_key_pair_name}.pem ubuntu@${aws_eip.app.public_ip}"
}
