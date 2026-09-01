const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/.gitignore';

const gitignoreContent = `# Next.js build artifacts
.next/
out/
build/
dist/

# Dependencies
node_modules/
.pnp
.pnp.js

# Environment Variables & Secrets (CRITICAL FOR SECURITY)
.env
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env
*.env.local

# Tastytrade runtime cache & tokens
tasty_token.json
streamer_token.json
tokens/
*.token
*.pem
*.key

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS and IDE Files
.DS_Store
Thumbs.db
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.gemini/
`;

fs.writeFileSync(target, gitignoreContent.trim(), 'utf8');
console.log('Updated .gitignore with strict security rules');
