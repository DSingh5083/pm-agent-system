# ── AWS Secrets Manager: store all API keys as a single JSON secret ───────────
# This keeps sensitive values out of the EC2 user_data and environment files.

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/app-secrets"
  description             = "All API keys and secrets for pm-agent-system"
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-app-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    ANTHROPIC_API_KEY  = var.anthropic_api_key
    GEMINI_API_KEY     = var.gemini_api_key
    OPENAI_API_KEY     = var.openai_api_key
    NOTION_API_KEY     = var.notion_api_key
    NOTION_DATABASE_ID = var.notion_database_id
    VOYAGE_API_KEY     = var.voyage_api_key
    GOOGLE_API_KEY     = var.google_api_key
    GOOGLE_PSE_CX      = var.google_pse_cx
    LANGCHAIN_API_KEY  = var.langchain_api_key
    LANGCHAIN_PROJECT  = var.langchain_project
    APP_PASSWORD       = var.app_password
    DB_PASSWORD        = var.db_password
  })
}
