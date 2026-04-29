variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "pm-agent"
}

variable "environment" {
  description = "Deployment environment (production / staging)"
  type        = string
  default     = "production"
}

# ── EC2 ───────────────────────────────────────────────────────────────────────

variable "ec2_instance_type" {
  description = "EC2 instance type for the app server"
  type        = string
  default     = "t3.medium"
}

variable "ec2_key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the EC2 instance"
  type        = string
  default     = "0.0.0.0/0"  # Restrict to your IP in production: e.g. "1.2.3.4/32"
}

# ── RDS ───────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "pm_agent"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "pm_agent_user"
}

variable "db_password" {
  description = "PostgreSQL master password (store in secrets, do not commit)"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB"
  type        = number
  default     = 20
}

# ── API Keys (stored in AWS Secrets Manager at apply time) ────────────────────

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "notion_api_key" {
  description = "Notion API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "notion_database_id" {
  description = "Notion database ID"
  type        = string
  default     = ""
}

variable "voyage_api_key" {
  description = "Voyage AI API key (for RAG embeddings)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_api_key" {
  description = "Google API key for Programmable Search Engine"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_pse_cx" {
  description = "Google PSE CX identifier"
  type        = string
  default     = ""
}

variable "langchain_api_key" {
  description = "LangSmith API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "langchain_project" {
  description = "LangSmith project name"
  type        = string
  default     = "pm-agent-system"
}

variable "app_password" {
  description = "App-level password for the x-app-password auth header"
  type        = string
  sensitive   = true
  default     = ""
}

variable "frontend_url" {
  description = "Allowed frontend origin (e.g. https://your-vercel-app.vercel.app). Leave empty to auto-use the EC2 public IP."
  type        = string
  default     = ""
}
