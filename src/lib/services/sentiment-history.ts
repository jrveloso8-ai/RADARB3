/**
 * Histórico Horário Real de Sentimento & Apetite a Risco (Fase 2 - Item 2.2)
 *
 * Persiste scores calculados deterministicamente de hora em hora ao longo do dia,
 * substituindo a curva senoidal sintética (Math.sin) por histórico real.
 */

import fs from 'fs';
import path from 'path';

export interface SentimentHistoryPoint {
  hour: number;
  formattedHour: string;
  score: number;
  temperatureCelsius: number;
  zone: string;
  timestamp: number;
  calculatedAt: string;
}

interface StoredSentimentHistory {
  date: string;
  points: SentimentHistoryPoint[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SENTIMENT_FILE = path.join(DATA_DIR, 'sentiment-history.json');

// Cache em memória para ambientes serverless ou read-only
let memoryStore: StoredSentimentHistory = {
  date: new Date().toISOString().split('T')[0],
  points: [],
};

function ensureStorage(): StoredSentimentHistory {
  const todayStr = new Date().toISOString().split('T')[0];

  if (memoryStore.date !== todayStr) {
    memoryStore = { date: todayStr, points: [] };
  }

  try {
    if (fs.existsSync(SENTIMENT_FILE)) {
      const content = fs.readFileSync(SENTIMENT_FILE, 'utf-8');
      const parsed: StoredSentimentHistory = JSON.parse(content);
      if (parsed.date === todayStr && Array.isArray(parsed.points)) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch {
    // Ignora erro de leitura e usa store em memória
  }

  return memoryStore;
}

function persistStorage(store: StoredSentimentHistory) {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SENTIMENT_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Ignora falhas de escrita em disco efêmero
  }
}

/**
 * Registra um ponto de score de sentimento calculado para a hora atual
 */
export function recordSentimentPoint(point: SentimentHistoryPoint) {
  const store = ensureStorage();
  const existingIdx = store.points.findIndex((p) => p.hour === point.hour);

  if (existingIdx >= 0) {
    store.points[existingIdx] = point;
  } else {
    store.points.push(point);
    store.points.sort((a, b) => a.hour - b.hour);
  }

  persistStorage(store);
}

/**
 * Retorna o histórico de pontos reais salvos.
 * Se houver menos de 2 pontos coletados no dia, reporta hasSufficientHistory = false
 * para que a interface informe honestamente a coleta em andamento.
 */
export function getRealHourlySentimentHistory(currentPoint?: SentimentHistoryPoint): {
  history: SentimentHistoryPoint[];
  hasSufficientHistory: boolean;
  statusMessage?: string;
} {
  const store = ensureStorage();

  if (currentPoint) {
    recordSentimentPoint(currentPoint);
  }

  const points = [...store.points];

  if (points.length < 2) {
    const startHour = points.length > 0 ? points[0].formattedHour : 'início do monitoramento';
    return {
      history: points,
      hasSufficientHistory: false,
      statusMessage: `Histórico insuficiente (coletando desde ${startHour})`,
    };
  }

  return {
    history: points,
    hasSufficientHistory: true,
  };
}
