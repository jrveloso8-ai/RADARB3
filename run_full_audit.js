const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetRoots = [
  'C:/Projetos Antigravity/RADAR-TASYTRADE',
  'C:/Projetos Antigravity/TESTE_BRAPI',
  'C:/Projetos Antigravity/Mini_Indice',
  'C:/Projetos Antigravity/NTSL',
  'C:/Projetos Antigravity/DEV',
];

const sensitiveRegexes = [
  { name: 'Generic API Key / Secret', regex: /(?:api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{12,}['"]/i },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/ },
  { name: 'OpenAI / Anthropic Key', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Password with Value', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/i },
];

const ignoredFolders = new Set(['node_modules', '.next', '.git', 'venv', '.venv', '__pycache__', 'dist', 'build', '.gemini']);
const ignoredFiles = new Set(['.env.local.example', '.env.example', 'package-lock.json']);

const report = [];

targetRoots.forEach(repoPath => {
  if (!fs.existsSync(repoPath)) return;

  const repoReport = {
    repo: repoPath,
    hasGit: fs.existsSync(path.join(repoPath, '.git')),
    gitignoreStatus: 'OK',
    gitHistoryFindings: [],
    codebaseFindings: [],
    npmAuditStatus: null,
  };

  // 1. Check .gitignore
  const gitignorePath = path.join(repoPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    repoReport.gitignoreStatus = 'ALERTA: Arquivo .gitignore não existe!';
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.env')) {
      repoReport.gitignoreStatus = 'ALERTA: .gitignore não contém regra para .env!';
    }
  }

  // 2. Scan active files in codebase
  function scanFiles(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredFolders.has(entry.name)) continue;
        scanFiles(fullPath);
      } else if (entry.isFile()) {
        if (ignoredFiles.has(entry.name)) continue;
        if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.ico') || entry.name.endsWith('.pdf')) continue;

        // If file is .env or .env.local, check if it exists
        if (entry.name.startsWith('.env')) {
          repoReport.codebaseFindings.push({
            file: fullPath,
            line: 1,
            issue: 'Arquivo de ambiente local presente em disco (Certifique-se de que está no .gitignore)',
            sample: entry.name,
          });
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('process.env.') || line.includes('os.environ') || line.includes('export interface') || line.includes('type ')) return;
            sensitiveRegexes.forEach(rule => {
              if (rule.regex.test(line)) {
                repoReport.codebaseFindings.push({
                  file: fullPath,
                  line: idx + 1,
                  issue: rule.name,
                  sample: line.trim().slice(0, 100),
                });
              }
            });
          });
        } catch (err) {}
      }
    }
  }

  scanFiles(repoPath);

  // 3. Scan Git Commit History for secrets (if git is initialized)
  if (repoReport.hasGit) {
    try {
      const gitLogOutput = execSync('git log -p -n 15', { cwd: repoPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      const logLines = gitLogOutput.split('\n');
      logLines.forEach(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          if (line.includes('process.env.') || line.includes('placeholder') || line.includes('seu_token')) return;
          sensitiveRegexes.forEach(rule => {
            if (rule.regex.test(line)) {
              repoReport.gitHistoryFindings.push({
                issue: rule.name,
                sample: line.trim().slice(0, 100),
              });
            }
          });
        }
      });
    } catch (gitErr) {}
  }

  // 4. Run npm audit if package.json exists
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const auditOut = execSync('npm audit --json', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const parsedAudit = JSON.parse(auditOut);
      const vulns = parsedAudit.metadata?.vulnerabilities || {};
      repoReport.npmAuditStatus = `Total de vulnerabilidades: ${vulns.total || 0} (Críticas: ${vulns.critical || 0}, Altas: ${vulns.high || 0}, Moderadas: ${vulns.moderate || 0}, Baixas: ${vulns.low || 0})`;
    } catch (auditErr) {
      try {
        const parsed = JSON.parse(auditErr.stdout || '{}');
        const vulns = parsed.metadata?.vulnerabilities || {};
        repoReport.npmAuditStatus = `Vulnerabilidades encontradas: ${vulns.total || 0} (Críticas: ${vulns.critical || 0}, Altas: ${vulns.high || 0}, Moderadas: ${vulns.moderate || 0}, Baixas: ${vulns.low || 0})`;
      } catch (e) {
        repoReport.npmAuditStatus = 'npm audit executado com avisos';
      }
    }
  }

  report.push(repoReport);
});

console.log(JSON.stringify(report, null, 2));
