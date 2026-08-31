import {
  HistoricalPrice,
  OptionAnalyticsItem,
  OptionPositionItem,
  QuoteDetails,
} from '../types/financial';
import { RawFundamentalData } from '../domain/fundamentals';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache em memória simples e thread-safe para o Node runtime
const memoryCache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlSeconds: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export interface BrapiHealthStatus {
  status: 'ONLINE' | 'DEGRADED_NO_TOKEN' | 'OFFLINE';
  hasApiKey: boolean;
  latencyMs: number;
  message: string;
  testedAt: string;
}

export class BrapiService {
  private apiKey: string;
  private baseUrl: string;
  private defaultTimeoutMs: number;

  constructor(apiKey?: string, baseUrl = 'https://brapi.dev/api', timeoutMs = 8000) {
    this.apiKey = apiKey || process.env.BRAPI_API_KEY || '';
    this.baseUrl = baseUrl;
    this.defaultTimeoutMs = timeoutMs;
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean> = {}): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (this.apiKey) {
      url.searchParams.set('token', this.apiKey);
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async fetchWithTimeout<T>(url: string, cacheKey?: string, ttlSeconds = 60): Promise<T> {
    if (cacheKey) {
      const cached = getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TesteBRAPI-App/1.0',
        },
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `A resposta da BRAPI não é um JSON válido (HTTP ${response.status}). ${
            text.length > 200 ? text.slice(0, 200) + '...' : text || 'Conteúdo HTML/Texto recebido.'
          }`
        );
      }

      const json = await response.json();

      if (!response.ok) {
        const errorMsg = json?.message || json?.error || `Erro HTTP ${response.status}`;
        throw new Error(`BRAPI API: ${errorMsg}`);
      }

      if (cacheKey) {
        setInCache(cacheKey, json, ttlSeconds);
      }
      return json as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Tempo limite excedido (${this.defaultTimeoutMs}ms) ao consultar a BRAPI.`);
      }
      throw error;
    }
  }

  /**
   * Executa Health Check detalhado da conexão com a BRAPI
   */
  async checkHealth(): Promise<BrapiHealthStatus> {
    const startTime = Date.now();
    const hasKey = !!this.apiKey && this.apiKey.trim().length > 0;

    try {
      // Testar endpoint leve de cotação pública (PETR4)
      const url = this.buildUrl('/quote/PETR4');
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          status: hasKey ? 'ONLINE' : 'DEGRADED_NO_TOKEN',
          hasApiKey: hasKey,
          latencyMs,
          message: hasKey
            ? `Conexão ativa com a BRAPI (${latencyMs}ms). Token autenticado.`
            : `Conexão pública ativa (${latencyMs}ms). Sem token (limite padrão de requisições).`,
          testedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'OFFLINE',
        hasApiKey: hasKey,
        latencyMs,
        message: `BRAPI respondeu com status HTTP ${res.status}.`,
        testedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        status: 'OFFLINE',
        hasApiKey: hasKey,
        latencyMs: Date.now() - startTime,
        message: err instanceof Error ? err.message : 'Falha na conexão com brapi.dev',
        testedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtém a lista dinâmica de ações negociadas na B3 por volume e liquidez.
   */
  async getAvailableStocks(limit = 60): Promise<string[]> {
    const url = this.buildUrl('/quote/list', {
      sortBy: 'volume',
      sortOrder: 'desc',
      limit,
    });
    const cacheKey = `available_stocks_${limit}`;

    try {
      const data = await this.fetchWithTimeout<{
        stocks?: Array<{ stock: string; name?: string; volume?: number }>;
      }>(url, cacheKey, 3600);

      if (data?.stocks && data.stocks.length > 0) {
        const tickers = data.stocks
          .map((s) => s.stock.toUpperCase().trim())
          .filter((t) => t.length >= 4 && !t.includes('^') && !t.includes('$'));
        if (tickers.length >= 10) return tickers;
      }
    } catch {
      // Fallback para lista das ações mais líquidas da B3
    }

    return [
      'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'BBAS3', 'WEGE3', 'ABEV3', 'RENT3',
      'MGLU3', 'JBSS3', 'SUZB3', 'ELET3', 'PRIO3', 'GGBR4', 'CSNA3', 'HAPV3',
      'LREN3', 'RDOR3', 'RADL3', 'RAIL3', 'BPAC11', 'VIVT3', 'TIMS3', 'SBSP3',
      'CPLE6', 'EGIE3', 'EMBR3', 'UGPA3', 'BRFS3', 'KLBN11', 'CCRO3', 'ENEV3',
      'CMIG4', 'EQTL3', 'TOTS3', 'ASAI3', 'CRFB3', 'AZUL4', 'GOLL4', 'COGN3',
      'YDUQ3', 'ALOS3', 'MULT3', 'CYRE3', 'MRVE3', 'EZTC3', 'SLCE3', 'SMTO3',
      'BEEF3', 'MRFG3', 'DXCO3', 'USIM5', 'CSAN3', 'VBBR3', 'RECV3', 'BRAP4'
    ];
  }

  /**
   * Consulta cotação e histórico de 12 meses (range=1y, interval=1d) para um ativo.
   */
  async getQuoteWith12MHistory(symbol: string): Promise<QuoteDetails> {
    const cleanSymbol = symbol.trim().toUpperCase();
    const url = this.buildUrl(`/quote/${cleanSymbol}`, {
      range: '1y',
      interval: '1d',
      fundamental: 'false',
    });

    const cacheKey = `quote_12m_${cleanSymbol}`;
    const data = await this.fetchWithTimeout<{
      results?: Array<{
        symbol: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        regularMarketPrice: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        regularMarketTime?: string;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        historicalDataPrice?: Array<{
          date: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>;
      }>;
    }>(url, cacheKey, 120);

    if (!data.results || data.results.length === 0) {
      throw new Error(`Dados não disponíveis para o ativo '${cleanSymbol}'.`);
    }

    const item = data.results[0];
    const historical: HistoricalPrice[] = (item.historicalDataPrice || [])
      .filter((h) => typeof h.close === 'number' && !isNaN(h.close))
      .map((h) => ({
        date: h.date,
        open: h.open || h.close,
        high: h.high || h.close,
        low: h.low || h.close,
        close: h.close,
        volume: h.volume || 0,
      }));

    return {
      symbol: item.symbol,
      shortName: item.shortName || item.symbol,
      longName: item.longName,
      currency: item.currency || 'BRL',
      regularMarketPrice: item.regularMarketPrice || 0,
      regularMarketChange: item.regularMarketChange || 0,
      regularMarketChangePercent: item.regularMarketChangePercent || 0,
      regularMarketTime: item.regularMarketTime || new Date().toISOString(),
      regularMarketDayHigh: item.regularMarketDayHigh || item.regularMarketPrice,
      regularMarketDayLow: item.regularMarketDayLow || item.regularMarketPrice,
      regularMarketVolume: item.regularMarketVolume || 0,
      historicalDataPrice: historical,
    };
  }

  /**
   * Consulta indicadores fundamentalistas do balanço patrimonial e DRE.
   */
  async getFundamentals(symbol: string): Promise<RawFundamentalData> {
    const cleanSymbol = symbol.trim().toUpperCase();
    const url = this.buildUrl(`/quote/${cleanSymbol}`, {
      fundamental: 'true',
      modules: 'financialData,defaultKeyStatistics',
    });

    const cacheKey = `fundamentals_${cleanSymbol}`;
    try {
      const data = await this.fetchWithTimeout<any>(url, cacheKey, 600);
      const item = data?.results?.[0] || {};
      const fin = item?.financialData || {};
      const stats = item?.defaultKeyStatistics || {};

      // Dívida Líquida / EBITDA — calcular, não ler campo inexistente
      const totalDebt = fin?.totalDebt ?? null;
      const totalCash = fin?.totalCash ?? null;
      const ebitda = fin?.ebitda ?? null;
      const debtToEbitda =
        totalDebt !== null && totalCash !== null && ebitda !== null && ebitda > 0
          ? Number(((totalDebt - totalCash) / ebitda).toFixed(2))
          : null;

      const netIncome = stats?.netIncomeToCommon ?? null;

      return {
        netIncome,
        totalDebt,
        totalCash,
        ebitda,
        returnOnEquity: fin?.returnOnEquity ?? stats?.returnOnEquity ?? item?.returnOnEquity ?? null,
        netMargin: fin?.profitMargins ?? item?.netMargin ?? null,
        ebitdaMargin: fin?.ebitdaMargins ?? item?.ebitdaMargin ?? null,
        debtToEbitda,
        currentRatio: fin?.currentRatio ?? item?.currentRatio ?? null,
        priceEarnings: item?.priceEarnings ?? stats?.forwardPE ?? stats?.trailingPE ?? null,
        priceToBook: item?.priceToBook ?? stats?.priceToBook ?? null,
        dividendYield: item?.dividendYield ?? stats?.dividendYield ?? null,
      };
    } catch {
      return {};
    }
  }

  /**
   * Consulta nova rota oficial v2: Posições em Aberto por Série (Ações, ETFs, Índices).
   * GET /api/v2/options/positions?underlying=BOVA11&expirationDate=YYYY-MM-DD
   */
  async getOptionPositions(
    underlying: string,
    expirationDate: string,
    date?: string
  ): Promise<{
    underlying: string;
    expirationDate: string;
    date: string;
    positions: OptionPositionItem[];
  }> {
    const cleanUnderlying = underlying.trim().toUpperCase();
    const params: Record<string, string> = {
      underlying: cleanUnderlying,
      expirationDate,
    };
    if (date) params.date = date;

    const url = this.buildUrl('/v2/options/positions', params);
    const cacheKey = `options_positions_${cleanUnderlying}_${expirationDate}_${date || 'latest'}`;

    try {
      const data = await this.fetchWithTimeout<{
        underlying: string;
        expirationDate: string;
        date: string;
        positions: OptionPositionItem[];
      }>(url, cacheKey, 300);

      return {
        underlying: data.underlying || cleanUnderlying,
        expirationDate: data.expirationDate || expirationDate,
        date: data.date || '',
        positions: data.positions || [],
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('Token de autenticação não fornecido') || errMsg.includes('MISSING_TOKEN')) {
        throw new Error(
          `A consulta a posições de opções de '${cleanUnderlying}' requer token da BRAPI. Por favor, adicione sua chave em .env.local (BRAPI_API_KEY).`
        );
      }
      throw err;
    }
  }

  /**
   * Consulta rota oficial v2: Analytics de Opções (Preço de mercado, IV real e Gregas B3).
   * GET /api/v2/options/analytics?underlying=PETR4&expirationDate=YYYY-MM-DD
   */
  async getOptionAnalytics(
    underlying: string,
    expirationDate: string,
    date?: string
  ): Promise<{
    underlying: string;
    expirationDate: string;
    date: string;
    analytics: OptionAnalyticsItem[];
  }> {
    const cleanUnderlying = underlying.trim().toUpperCase();
    const params: Record<string, string> = {
      underlying: cleanUnderlying,
      expirationDate,
    };
    if (date) params.date = date;

    const url = this.buildUrl('/v2/options/analytics', params);
    const cacheKey = `options_analytics_${cleanUnderlying}_${expirationDate}_${date || 'latest'}`;

    try {
      const data = await this.fetchWithTimeout<any>(url, cacheKey, 300);
      const rawList: any[] = data?.analytics || data?.options || data?.results || (Array.isArray(data) ? data : []);

      const analytics: OptionAnalyticsItem[] = rawList.map((item: any) => {
        const ivRaw = item.impliedVolatility;
        const iv =
          ivRaw !== null && ivRaw !== undefined && !isNaN(ivRaw)
            ? Number((ivRaw <= 1.0 && ivRaw > 0 ? ivRaw * 100 : ivRaw).toFixed(2))
            : null;

        return {
          symbol: item.symbol,
          side: item.side,
          strike: Number(item.strike),
          optionStyle: item.optionStyle || 'american',
          model: item.model || 'cox-ross-rubinstein',
          priceSource: item.priceSource || 'close',
          underlyingPrice: item.underlyingPrice,
          optionPrice:
            item.optionPrice !== undefined && item.optionPrice !== null ? Number(item.optionPrice) : null,
          impliedVolatility: iv,
          delta: item.delta !== undefined ? Number(item.delta) : undefined,
          gamma: item.gamma !== undefined ? Number(item.gamma) : undefined,
          theta: item.theta !== undefined ? Number(item.theta) : undefined,
          vega: item.vega !== undefined ? Number(item.vega) : undefined,
          rho: item.rho !== undefined ? Number(item.rho) : undefined,
          riskFreeRate: item.riskFreeRate !== undefined ? Number(item.riskFreeRate) : 0.14,
          dividendYield: item.dividendYield !== undefined ? Number(item.dividendYield) : 0,
          confidence: item.confidence || 'high',
          nullReason: item.nullReason || null,
          openInterest: item.openInterest ? Number(item.openInterest) : undefined,
          openInterestDate: item.openInterestDate,
        };
      });

      return {
        underlying: data?.underlying || cleanUnderlying,
        expirationDate: data?.expirationDate || expirationDate,
        date: data?.date || '',
        analytics,
      };
    } catch {
      return {
        underlying: cleanUnderlying,
        expirationDate,
        date: '',
        analytics: [],
      };
    }
  }
}

export const brapiService = new BrapiService();
