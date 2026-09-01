const fs = require('fs');
const path = require('path');

const standardGitignore = `# Environments & Secrets
.env
.env*.local
*.env
*.env.local
*.key
*.pem
*.token
*secret*
*credential*

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/
env/
.env/

# Node
node_modules/
.next/
out/
dist/
build/
*.log

# OS & IDE
.DS_Store
Thumbs.db
.vscode/
.idea/
.gemini/
`;

const repos = [
  'C:/Projetos Antigravity/NTSL',
  'C:/Projetos Antigravity/Mini_Indice',
  'C:/Projetos Antigravity/DEV'
];

repos.forEach(r => {
  if (fs.existsSync(r)) {
    const gitignorePath = path.join(r, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, standardGitignore.trim(), 'utf8');
      console.log('Created .gitignore in:', r);
    }
  }
});
