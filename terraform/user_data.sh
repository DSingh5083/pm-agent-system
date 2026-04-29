#!/bin/bash
set -e
exec > /var/log/user_data.log 2>&1

export DEBIAN_FRONTEND=noninteractive

echo "=== [1/8] System update ==="
apt-get update -y
apt-get upgrade -y

echo "=== [2/8] Install dependencies ==="
apt-get install -y curl git nginx unzip awscli jq build-essential

echo "=== [3/8] Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo "=== [4/8] Install PM2 ==="
npm install -g pm2

echo "=== [5/8] Fetch secrets from AWS Secrets Manager ==="
SECRETS=$(aws secretsmanager get-secret-value \
  --secret-id "${secrets_arn}" \
  --region "${aws_region}" \
  --query SecretString \
  --output text)

ANTHROPIC_API_KEY=$(echo "$SECRETS" | jq -r '.ANTHROPIC_API_KEY')
GEMINI_API_KEY=$(echo "$SECRETS"    | jq -r '.GEMINI_API_KEY')
OPENAI_API_KEY=$(echo "$SECRETS"    | jq -r '.OPENAI_API_KEY')
NOTION_API_KEY=$(echo "$SECRETS"    | jq -r '.NOTION_API_KEY')
NOTION_DATABASE_ID=$(echo "$SECRETS" | jq -r '.NOTION_DATABASE_ID')
VOYAGE_API_KEY=$(echo "$SECRETS"    | jq -r '.VOYAGE_API_KEY')
GOOGLE_API_KEY=$(echo "$SECRETS"    | jq -r '.GOOGLE_API_KEY')
GOOGLE_PSE_CX=$(echo "$SECRETS"     | jq -r '.GOOGLE_PSE_CX')
LANGCHAIN_API_KEY=$(echo "$SECRETS" | jq -r '.LANGCHAIN_API_KEY')
APP_PASSWORD=$(echo "$SECRETS"      | jq -r '.APP_PASSWORD')
DB_PASSWORD=$(echo "$SECRETS"       | jq -r '.DB_PASSWORD')

echo "=== [6/8] Clone application ==="
mkdir -p /opt/pm-agent
cd /opt/pm-agent

# Pull the app from GitHub — replace with your repo URL
# If you prefer to scp the files manually, comment this block out.
# git clone https://github.com/YOUR_USERNAME/pm-agent-system.git .

# Build the frontend dist (if not pre-built)
# Uncomment if you're deploying from source:
# cd pm-agent-ui && npm ci && npm run build && cd ..

echo "=== [6b/8] Write .env ==="
# DATABASE_URL uses the RDS endpoint injected by Terraform
cat > /opt/pm-agent/.env <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://${db_username}:$${DB_PASSWORD}@${db_host}:${db_port}/${db_name}?sslmode=require
ANTHROPIC_API_KEY=$${ANTHROPIC_API_KEY}
GEMINI_API_KEY=$${GEMINI_API_KEY}
OPENAI_API_KEY=$${OPENAI_API_KEY}
NOTION_API_KEY=$${NOTION_API_KEY}
NOTION_DATABASE_ID=$${NOTION_DATABASE_ID}
VOYAGE_API_KEY=$${VOYAGE_API_KEY}
GOOGLE_API_KEY=$${GOOGLE_API_KEY}
GOOGLE_PSE_CX=$${GOOGLE_PSE_CX}
LANGCHAIN_API_KEY=$${LANGCHAIN_API_KEY}
LANGCHAIN_PROJECT=${langchain_project}
LANGCHAIN_TRACING_V2=true
APP_PASSWORD=$${APP_PASSWORD}
FRONTEND_URL=${frontend_url}
EOF
chmod 600 /opt/pm-agent/.env

echo "=== [7/8] Install npm dependencies ==="
cd /opt/pm-agent
npm ci --omit=dev

echo "=== [7b/8] Start with PM2 ==="
pm2 start server.js \
  --name pm-agent \
  --env production \
  --max-memory-restart 512M \
  --log /var/log/pm-agent.log

pm2 startup systemd -u root --hp /root
pm2 save

echo "=== [8/8] Configure Nginx reverse proxy ==="
cat > /etc/nginx/sites-available/pm-agent <<'NGINX'
server {
    listen 80;
    server_name _;

    # Serve frontend static files
    root /opt/pm-agent/pm-agent-ui/dist;
    index index.html;

    # Frontend routes (React SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Direct backend access (no /api prefix) — keeps frontend VITE_API_URL working
    location ~ ^/(projects|features|chat|health|research|enhance|notion|monitor|docs|generate-brief|semantic|improve-brief|debug) {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 20M;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/pm-agent /etc/nginx/sites-enabled/pm-agent
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "=== Setup complete ==="
echo "Backend running at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001"
echo "Frontend served at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
