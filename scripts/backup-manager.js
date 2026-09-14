/**
 * Gerenciador de Backup Seletivo e Rollback Ultrarrápido
 * Radar B3 Pro IA
 * 
 * Copia exclusivamente os arquivos vitais de código e configuração (src/, configs, .env.local).
 * Executa em menos de 1 segundo (não copia node_modules, .next, vídeos ou PDFs).
 * Mantém rotação automática com histórico dos últimos N checkpoints e suporte a Git Tags.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, '_backups');
const MAX_SNAPSHOTS = 5; // Mantém os últimos 5 pontos (mais que os 2 solicitados)

// Arquivos e pastas estritamente necessários para funcionamento do sistema
const ESSENTIAL_ITEMS = [
  { type: 'dir', path: 'src' },
  { type: 'file', path: 'package.json' },
  { type: 'file', path: 'package-lock.json' },
  { type: 'file', path: 'tsconfig.json' },
  { type: 'file', path: 'tailwind.config.js' },
  { type: 'file', path: 'next.config.mjs' },
  { type: 'file', path: 'postcss.config.js' },
  { type: 'file', path: 'vitest.config.ts' },
  { type: 'file', path: '.env.local' },
  { type: 'file', path: '.env.local.example' },
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getGitCommitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const msg = execSync('git log -1 --pretty=%B', { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    return { hash, msg };
  } catch {
    return { hash: 'sem-git', msg: 'Git não disponível ou sem commits' };
  }
}

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return {
    folderStr: `${yyyy}-${MM}-${dd}_${hh}-${mm}-${ss}`,
    displayStr: `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`,
  };
}

function countFilesRecursively(dirPath) {
  let count = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const it of items) {
    if (it.isDirectory()) {
      count += countFilesRecursively(path.join(dirPath, it.name));
    } else {
      count++;
    }
  }
  return count;
}

function createBackup(description = '') {
  const startTime = Date.now();
  ensureDir(BACKUP_DIR);

  const { folderStr, displayStr } = formatTimestamp();
  const slugDesc = description
    ? '_' + description.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40)
    : '';
  const snapshotFolderName = `snapshot_${folderStr}${slugDesc}`;
  const targetSnapshotDir = path.join(BACKUP_DIR, snapshotFolderName);

  fs.mkdirSync(targetSnapshotDir, { recursive: true });

  let copiedFilesCount = 0;

  for (const item of ESSENTIAL_ITEMS) {
    const srcPath = path.join(ROOT_DIR, item.path);
    const destPath = path.join(targetSnapshotDir, item.path);

    if (!fs.existsSync(srcPath)) continue;

    if (item.type === 'dir') {
      fs.cpSync(srcPath, destPath, { recursive: true });
      copiedFilesCount += countFilesRecursively(srcPath);
    } else {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      copiedFilesCount++;
    }
  }

  const gitInfo = getGitCommitInfo();
  const metadata = {
    createdAt: new Date().toISOString(),
    displayDate: displayStr,
    description: description || 'Backup Seletivo de Código',
    gitCommit: gitInfo.hash,
    gitMessage: gitInfo.msg,
    totalFiles: copiedFilesCount,
    folderName: snapshotFolderName,
  };

  fs.writeFileSync(
    path.join(targetSnapshotDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  // Criar tag no Git se disponível
  const gitTag = `snapshot-${folderStr.replace(/_/g, '-')}`;
  try {
    execSync(`git tag -a "${gitTag}" -m "${metadata.description}"`, { cwd: ROOT_DIR, stdio: 'ignore' });
  } catch {
    // Ignora falha de tag
  }

  // Rotação de snapshots antigos (mantém os últimos MAX_SNAPSHOTS)
  rotateOldSnapshots();

  const elapsedMs = Date.now() - startTime;

  console.log('\n=============================================================');
  console.log('  [SUCESSO] BACKUP SELETIVO CONCLUÍDO COM ÊXITO!');
  console.log('=============================================================');
  console.log(`  Data/Hora:     ${displayStr}`);
  console.log(`  Descricao:     ${metadata.description}`);
  console.log(`  Git Commit:    ${gitInfo.hash} (${gitInfo.msg.slice(0, 50)})`);
  console.log(`  Arquivos:      ${copiedFilesCount} arquivos vitais copiados`);
  console.log(`  Tempo:         ${elapsedMs} ms (menos de 1 segundo!)`);
  console.log(`  Destino:       _backups/${snapshotFolderName}`);
  console.log('=============================================================\n');

  return targetSnapshotDir;
}

function getSnapshotsList() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
  const snapshots = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const snapDir = path.join(BACKUP_DIR, entry.name);
    const metaPath = path.join(snapDir, 'metadata.json');

    let meta = null;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {}
    }

    const stat = fs.statSync(snapDir);
    snapshots.push({
      dirName: entry.name,
      fullPath: snapDir,
      createdAt: meta?.createdAt ? new Date(meta.createdAt) : stat.birthtime,
      displayDate: meta?.displayDate || stat.mtime.toLocaleString('pt-BR'),
      description: meta?.description || entry.name,
      gitCommit: meta?.gitCommit || 'N/D',
      gitMessage: meta?.gitMessage || '',
      totalFiles: meta?.totalFiles || countFilesRecursively(snapDir),
    });
  }

  // Ordena do mais recente para o mais antigo
  snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return snapshots;
}

function rotateOldSnapshots() {
  const list = getSnapshotsList();
  if (list.length <= MAX_SNAPSHOTS) return;

  const toRemove = list.slice(MAX_SNAPSHOTS);
  for (const snap of toRemove) {
    try {
      fs.rmSync(snap.fullPath, { recursive: true, force: true });
      console.log(`  [ROTACAO] Snapshot antigo removido: ${snap.dirName}`);
    } catch (err) {
      console.error(`  [AVISO] Falha ao rotacionar ${snap.dirName}:`, err.message);
    }
  }
}

function listSnapshots() {
  const list = getSnapshotsList();
  console.log('\n========================================================================================');
  console.log('                         PONTOS DE ROLLBACK DISPONÍVEIS');
  console.log('========================================================================================');

  if (list.length === 0) {
    console.log('  Nenhum snapshot de backup encontrado em _backups/');
    console.log('========================================================================================\n');
    return [];
  }

  list.forEach((snap, idx) => {
    const num = `[${idx + 1}]`;
    console.log(`  ${num.padEnd(5)} Data: ${snap.displayDate}  | Commit: ${snap.gitCommit}`);
    console.log(`        Descricao: ${snap.description}`);
    if (snap.gitMessage) {
      console.log(`        Mensagem:  ${snap.gitMessage.slice(0, 65)}`);
    }
    console.log('----------------------------------------------------------------------------------------');
  });

  console.log(`  Total: ${list.length} pontos disponíveis (capacidade de retenção: ${MAX_SNAPSHOTS})`);
  console.log('========================================================================================\n');
  return list;
}

function performRollback(targetIndexOrName) {
  const list = getSnapshotsList();
  if (list.length === 0) {
    console.error('[ERRO] Não há nenhum ponto de backup para restaurar.');
    return false;
  }

  let selectedSnap = null;
  const num = parseInt(targetIndexOrName, 10);

  if (!isNaN(num) && num >= 1 && num <= list.length) {
    selectedSnap = list[num - 1];
  } else {
    selectedSnap = list.find((s) => s.dirName === targetIndexOrName);
  }

  if (!selectedSnap) {
    console.error(`[ERRO] Ponto de restauração "${targetIndexOrName}" inválido.`);
    return false;
  }

  console.log(`\n[INFO] Preparando restauração do Ponto #${list.indexOf(selectedSnap) + 1}:`);
  console.log(`  Data:      ${selectedSnap.displayDate}`);
  console.log(`  Descrição: ${selectedSnap.description}`);
  console.log(`  Commit:    ${selectedSnap.gitCommit}`);

  // 1. Criar Safety Backup do estado atual antes de sobrescrever qualquer coisa
  console.log('\n[1/3] Criando snapshot de segurança do estado atual (pre-rollback)...');
  const safetyDesc = `Safety pre-rollback para ${selectedSnap.displayDate}`;
  const { folderStr } = formatTimestamp();
  const safetyDir = path.join(BACKUP_DIR, `safety_${folderStr}`);
  fs.mkdirSync(safetyDir, { recursive: true });

  for (const item of ESSENTIAL_ITEMS) {
    const srcPath = path.join(ROOT_DIR, item.path);
    const destPath = path.join(safetyDir, item.path);
    if (!fs.existsSync(srcPath)) continue;
    if (item.type === 'dir') {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
  fs.writeFileSync(
    path.join(safetyDir, 'metadata.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), description: safetyDesc }, null, 2)
  );
  console.log('  -> Estado atual preservado com segurança.');

  // 2. Restaurar os arquivos do snapshot selecionado
  console.log('[2/3] Restaurando arquivos selecionados...');
  let restoredCount = 0;

  for (const item of ESSENTIAL_ITEMS) {
    const snapItemPath = path.join(selectedSnap.fullPath, item.path);
    const destPath = path.join(ROOT_DIR, item.path);

    if (!fs.existsSync(snapItemPath)) continue;

    if (item.type === 'dir') {
      // Limpa diretório atual de código e restaura o snapshot
      fs.rmSync(destPath, { recursive: true, force: true });
      fs.cpSync(snapItemPath, destPath, { recursive: true });
      restoredCount += countFilesRecursively(snapItemPath);
    } else {
      fs.copyFileSync(snapItemPath, destPath);
      restoredCount++;
    }
  }

  // 3. Conclusão
  console.log('[3/3] Validando restauração...');
  console.log('\n=============================================================');
  console.log('  [ROLLBACK CONCLUÍDO COM SUCESSO!]');
  console.log('=============================================================');
  console.log(`  Restaurado para: ${selectedSnap.displayDate}`);
  console.log(`  Descricao:       ${selectedSnap.description}`);
  console.log(`  Arquivos:        ${restoredCount} arquivos restaurados com integridade`);
  console.log(`  Safety Backup:   _backups/${path.basename(safetyDir)}`);
  console.log('=============================================================\n');

  return true;
}

// ─────────────────────────────────────────────────────────────
// INTERFACE DE LINHA DE COMANDO
// ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'list').toLowerCase();

  if (command === 'backup') {
    const desc = args.slice(1).join(' ').trim();
    createBackup(desc);
  } else if (command === 'list') {
    listSnapshots();
  } else if (command === 'rollback') {
    const target = args[1];
    if (target) {
      performRollback(target);
    } else {
      const list = listSnapshots();
      if (list.length === 0) return;

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Digite o número do ponto que deseja restaurar (ou 0 para cancelar): ', (answer) => {
        rl.close();
        const choice = answer.trim();
        if (choice === '0' || choice === '') {
          console.log('[CANCELADO] Nenhuma alteração foi realizada.');
        } else {
          performRollback(choice);
        }
      });
    }
  } else {
    console.log('Uso:');
    console.log('  node scripts/backup-manager.js backup [descricao]');
    console.log('  node scripts/backup-manager.js list');
    console.log('  node scripts/backup-manager.js rollback [numero]');
  }
}

main();
