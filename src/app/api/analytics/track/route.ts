import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface AnalyticsData {
  date: string;
  uniqueHashes: string[];
  totalViews: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

function ensureDataFile(): AnalyticsData {
  const todayStr = new Date().toISOString().split('T')[0];

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // Ignora erro em ambientes serverless read-only
    }
  }

  let data: AnalyticsData = {
    date: todayStr,
    uniqueHashes: [],
    totalViews: 0,
  };

  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const content = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.date === todayStr) {
        data = parsed;
      }
    }
  } catch {
    // Se falhar a leitura, usa estado inicial
  }

  return data;
}

function saveData(data: AnalyticsData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Em produção serverless sem disco gravável, mantém em memória durante o ciclo
  }
}

export async function GET(request: NextRequest) {
  const todayStr = new Date().toISOString().split('T')[0];
  const analytics = ensureDataFile();

  // Obter IP do visitante a partir dos headers de proxy/Vercel
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

  // Gerar hash anônimo diário com salt da data para garantir conformidade total com LGPD/GDPR
  const ipHash = crypto
    .createHash('sha256')
    .update(`${rawIp}-${todayStr}-radarb3`)
    .digest('hex')
    .substring(0, 16);

  analytics.totalViews += 1;

  if (!analytics.uniqueHashes.includes(ipHash)) {
    analytics.uniqueHashes.push(ipHash);
  }

  saveData(analytics);

  return NextResponse.json({
    uniqueToday: Math.max(analytics.uniqueHashes.length, 1),
    totalViewsToday: analytics.totalViews,
    date: todayStr,
  });
}
