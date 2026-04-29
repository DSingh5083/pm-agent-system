# CLAUDE.md — Project Rules for Claude Code

## Security Policy: Secret Files Are Off-Limits

Claude must **never read, print, display, or include the contents** of any file that may contain secrets, credentials, or private keys. This applies regardless of how the request is phrased.

### Files Claude must never read

| Pattern | Examples |
|---|---|
| `.env`, `.env.*`, `*.env` | `.env`, `.env.local`, `.env.production`, `nano.env` |
| Terraform secrets | `terraform.tfvars`, `terraform.tfstate`, `terraform.tfstate.backup` |
| Private keys & certificates | `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt`, `*.cer` |
| SSH keys | `id_rsa`, `id_ed25519`, `id_dsa`, `id_ecdsa`, `*.pub` |
| Cloud credentials | `~/.aws/credentials`, `~/.aws/config`, `credentials.json` |
| Service accounts | `service-account*.json`, `*-sa.json`, `google-credentials.json` |
| Token / secret files | `*.token`, `auth.json`, `.netrc`, `.npmrc`, `.pypirc` |
| Database dumps | `*.sql`, `*.dump` containing connection strings |
| Key stores | `*.keystore`, `*.jks` |

### What to do instead

- Work from **`.env.example`** or **`terraform.tfvars.example`** — these have structure without values.
- If a task requires knowing which env vars exist, ask the user to share the example file or list the key names only.
- If a file must be checked for structure (e.g. does it have a certain key?), ask the user to confirm verbally.
- Never suggest commands that would `cat`, `echo`, or `print` the contents of any file above.

### Why

Principle of least privilege: an AI assistant has no legitimate need to read credential values to perform engineering work. Structure, key names, and patterns are sufficient. Actual values must stay in the developer's environment only.

---

## Project Overview

**pm-agent-system** — An AI-powered PM agent platform.

- **Backend**: Node.js/Express (`server.js`), port 3001
- **Frontend**: React/Vite (`pm-agent-ui/`), built to `pm-agent-ui/dist/`
- **Database**: PostgreSQL 15 + `pgvector` extension
- **Infrastructure**: AWS EC2 + RDS via Terraform (`terraform/`)

### Safe files for reference

| Purpose | Safe file |
|---|---|
| Environment variables needed | `.env.example` |
| Terraform variables needed | `terraform/terraform.tfvars.example` |
| Database schema | `db.js` (no credentials, just queries) |
| App configuration | `package.json`, `vite.config.js` |

### Deployment

- Infrastructure is defined in `terraform/` — see `terraform.tfvars.example` for required variables.
- Secrets are stored in **AWS Secrets Manager** at runtime; EC2 fetches them via IAM role at boot.
- Never hardcode secrets into `user_data.sh`, Terraform files, or application code.
