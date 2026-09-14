import { OperationalRiskReward, TechnicalChecklistItem } from '../domain/indicators';
export type { OperationalRiskReward, TechnicalChecklistItem };
import { ElectedOptionStrategy } from '../domain/cme-election';
export type { ElectedOptionStrategy };

export type TrendType = 'ALTA' | 'BAIXA' | 'LATERAL';

export type AssetType = 'STOCK' | 'OPTION';

export interface HistoricalPrice {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MovingAverages {
  mm20: number | null;
  mm50: number | null;
  mm200: number | null;
}

export interface TechnicalIndicatorsResult {
  rsi: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  };
  atr: number | null;
  volumeRatio: number | null;
  checklist: {
    items: TechnicalChecklistItem[];
    score: number;
    statusLabel: string;
  };
  supports?: number[];
  resistances?: number[];
  riskReward?: OperationalRiskReward;
}

export interface FundamentalMetric {
  name: string;
  value: number | null;
  formatted: string;
  benchmark: string;
  status: 'BOM' | 'NEUTRO' | 'RUIM' | 'N/D';
  description: string;
  isAdjusted?: boolean;
  rawAccountingValue?: number | null;
  rawAccountingFormatted?: string;
  adjustmentReason?: string;
  source?: 'BRAPI_CONTABIL' | 'RECONCILIADO_FINANCEIRO' | 'NORMALIZADO_FCO' | 'OFICIAL_EMPRESA';
}

export type EliminatoryFlag = 'LUCRO_NEGATIVO' | 'MARGEM_NEGATIVA' | 'SUPERENDIVIDAMENTO';

export interface FundamentalAnalysisResult {
  symbol: string;
  score: number; // 0 a 100
  status: 'APROVADO' | 'REPROVADO';
  summary: string;
  isNormalized?: boolean;
  distortionAlerts?: string[];
  metrics: {
    netIncome?: FundamentalMetric;
    roe: FundamentalMetric;
    netMargin: FundamentalMetric;
    ebitdaMargin?: FundamentalMetric;
    debtToEbitda: FundamentalMetric;
    currentLiquidity: FundamentalMetric;
    peRatio: FundamentalMetric;
    pbRatio: FundamentalMetric;
    dividendYield: FundamentalMetric;
  };
  reasons: string[];
  flags?: string[];
  eliminatoryFlags?: EliminatoryFlag[];
  analyzedAt: string;
  updatedAt?: string;
}

export interface OptionBarrierAlert {
  expirationDate: string;
  dte: number;
  spotPrice: number;
  maxPain: number;
  topCallWall?: {
    strike: number;
    symbol: string;
    contracts: number;
    distSpot: number;
    isImminent: boolean;
  };
  topPutWall?: {
    strike: number;
    symbol: string;
    contracts: number;
    distSpot: number;
    isImminent: boolean;
  };
  hasAlert: boolean;
  alertType?: 'CALL_WALL_RESISTANCE' | 'PUT_WALL_SUPPORT' | 'MAX_PAIN_PIN';
  alertMessage?: string;
}

export type ConsolidatedVerdictType =
  | 'COMPRA_FORTE'
  | 'COMPRA_COM_ALERTA_BARREIRA'
  | 'LATERAL_IRON_CONDOR'
  | 'LATERAL_AGUARDAR'
  | 'VENDA_FORTE'
  | 'VENDA_COM_ALERTA_SUPORTE'
  | 'BLOQUEADO_POR_FUNDAMENTOS';

export interface ConsolidatedVerdictResult {
  symbol: string;
  shortName?: string;
  currentPrice: number;
  verdict: ConsolidatedVerdictType;
  verdictLabel: string;
  actionRecommendation: 'COMPRA' | 'VENDA' | 'AGUARDAR' | 'BLOQUEADO' | 'IRON_CONDOR';
  fundamentalStatus: 'APROVADO' | 'REPROVADO';
  technicalTrend: TrendType;
  barrierAlert?: OptionBarrierAlert;
  rationale: string[];
  updatedAt: string;
}

export interface TrendAnalysisResult {
  symbol: string;
  shortName?: string;
  currentPrice: number;
  changePercent: number;
  trend: TrendType;
  movingAverages: MovingAverages;
  historicalCount: number;
  summary: string;
  updatedAt: string;
  fundamentals?: FundamentalAnalysisResult;
  verdict?: ConsolidatedVerdictResult;
  indicators?: TechnicalIndicatorsResult;
  operation?: import('../domain/operation-matrix').OperationDecision;
  tradePlan?: import('../domain/trade-plan').TradePlan | null;
  rentalAlert?: RentalAlert;
}

export interface AssetDecisionResult {
  symbol: string;
  shortName?: string;
  currentPrice: number;
  changePercent: number;
  trend: TrendType;
  movingAverages: MovingAverages;
  fundamentals: FundamentalAnalysisResult;
  operation: import('../domain/operation-matrix').OperationDecision;
  tradePlan?: import('../domain/trade-plan').TradePlan | null;
  optionStructure?: ElectedOptionStrategy | null;
  barrierAlert?: OptionBarrierAlert;
  rentalAlert?: RentalAlert;
  updatedAt: string;
}

export interface TrendsApiResponse {
  totalAnalyzed: number;
  lists: {
    alta: AssetDecisionResult[];
    baixa: AssetDecisionResult[];
    lateral: AssetDecisionResult[];
  };
  updatedAt: string;
}

export interface OptionAnalyticsItem {
  symbol: string;
  underlyingSymbol?: string;
  expirationDate?: string;
  side: 'call' | 'put' | 'CALL' | 'PUT';
  strike: number;
  optionStyle?: 'american' | 'european' | string;
  model?: string;
  priceSource?: string;
  underlyingPrice?: number;
  optionPrice: number | null;
  impliedVolatility: number | null; // Percentual normalizado na borda (ex: 28.72)
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  riskFreeRate?: number;
  dividendYield?: number;
  confidence?: 'high' | 'medium' | 'low' | string;
  nullReason?: string | null;
  openInterest?: number;
  openInterestDate?: string;
  openInterestChange?: number;
  lastTradeDate?: string;
  firstTradeDate?: string;
}

export type BlockReason =
  | 'SEM_ANALYTICS'          // fonte não devolveu a cadeia
  | 'SEM_SERIES_ELEGIVEIS'   // cadeia existe, nenhuma série passou nos critérios
  | 'SEM_PAR_VALIDO'         // séries elegíveis existem, nenhum par atende largura/crédito
  | 'DELTA_FORA_DA_FAIXA'    // nenhuma série com |delta| <= 0,38
  | 'VOL_COMPRIMIDA'         // squeeze bloqueia venda de crédito
  | 'DTE_FORA_DA_JANELA'     // fora de 12–35 dias úteis
  | 'PRECO_DEFASADO'         // drift do spot > 3%
  | 'FUNDAMENTOS_REPROVADOS' // matriz de operação
  | 'IV_INDISPONIVEL';       // sem IV ATM confiável

export interface StructureBlockDiagnostics {
  seriesInChain: number;
  seriesEligible: number;
  validPairs: number;
  bestShortDelta: number | null;
  dte: number;
  spotDriftPct: number;
}

export interface StructureBlock {
  status: 'BLOQUEADA';
  reason: BlockReason;
  message: string;
  diagnostics: StructureBlockDiagnostics;
}

export interface PriceContext {
  priceDate: string;        // '2026-08-28'
  priceUnderlying: number;  // 33.38
  currentSpot: number;      // 34.27
  spotDriftPct: number;     // +2.67
  isStale: boolean;         // |spotDriftPct| > 1.5
  warningMessage?: string;
}

export interface RentalAlert {
  required: true;
  message: string;
}

export interface OptionPositionItem {
  symbol: string;
  underlyingSymbol: string;
  side: 'call' | 'put' | 'CALL' | 'PUT';
  market?: string;
  optionStyle?: 'european' | 'american' | string;
  strike: number;
  expirationDate: string;
  openInterest: number;
  openInterestChange?: number;
  openInterestDate?: string;
  coveredQuantity?: number;
  uncoveredQuantity?: number;
  blockedQuantity?: number;
  totalPositionQuantity?: number;
  borrowerQuantity?: number;
  lenderQuantity?: number;
  forwardPrice?: number | null;
  lastPrice?: number;
  volume?: number;
  delta?: number;
  iv?: number;
}

export interface B3ExpirationInfo {
  date: string;
  monthName: string;
  callLetter: string;
  putLetter: string;
  dte: number;
  label: string;
  badge: string;
}

export interface WallItem {
  strike: number;
  symbol: string;
  contracts: number;
  uncovered: number;
  covered: number;
  iv: number | null;
  delta: number | null;
  distSpot: number;
  lastPrice: number | null;
}

export interface StraddleRow {
  strike: number;
  call?: {
    symbol: string;
    lastPrice: number;
    openInterest: number;
    uncoveredQuantity: number;
    coveredQuantity: number;
    inTheMoney: boolean;
  };
  put?: {
    symbol: string;
    lastPrice: number;
    openInterest: number;
    uncoveredQuantity: number;
    coveredQuantity: number;
    inTheMoney: boolean;
  };
  isSpotNear?: boolean;
  isMaxPain?: boolean;
}

export interface StrikeVolumeDistribution {
  strike: number;
  callOpenInterest: number;
  putOpenInterest: number;
  totalOpenInterest: number;
  isSpot: boolean;
  isMaxPain: boolean;
}

export interface OptionAnalysisResult {
  underlyingSymbol: string;
  underlyingPrice: number;
  marketType: 'equity';
  availableExpirations: B3ExpirationInfo[];
  selectedExpiration: string;
  selectedExpirationInfo: B3ExpirationInfo;
  openInterestDate: string;
  maxPain: number;
  ivAtm?: {
    callIv: number;
    putIv: number;
    percentile: number;
  } | null;
  ivQuality?: 'CONFIÁVEL' | 'DIVERGENTE' | 'INSUFICIENTE';
  hv21: number;
  hv63: number;
  putCallRatio: number;
  totalCallOpenInterest: number;
  totalPutOpenInterest: number;
  top5CallWalls: WallItem[];
  top5PutWalls: WallItem[];
  strikeDistribution: StrikeVolumeDistribution[];
  straddleRows: StraddleRow[];
  electedOptionStrategy?: import('../domain/cme-election').ElectedOptionStrategy | null;
  priceContext?: PriceContext;
}

export interface QuoteDetails {
  symbol: string;
  shortName: string;
  longName?: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  historicalDataPrice: HistoricalPrice[];
  trendAnalysis?: TrendAnalysisResult;
  fundamentals?: FundamentalAnalysisResult;
  verdict?: ConsolidatedVerdictResult;
  barrierAlert?: OptionBarrierAlert;
  indicators?: TechnicalIndicatorsResult;
  tradePlan?: import('../domain/trade-plan').TradePlan | null;
  electedOptionStrategy?: import('../domain/cme-election').ElectedOptionStrategy | null;
}

export interface SpotStatisticalBands {
  spotPrice: number;
  mean200: number;
  stdDev200: number;
  lowerBand2Sigma: number;
  upperBand2Sigma: number;
  sampleSize: number;
  zScore: number | null;
}

export interface BarrierTrackingItem {
  strike: number;
  type: 'CALL' | 'PUT';
  symbol: string;
  currentOI: number;
  prev1DOI: number | null;
  prev5DOI: number | null;
  change1DPercent: number | null;
  change5DPercent: number | null;
  isWithin2Sigma: boolean;
  distanceFromSpotPercent: number;
  flowSignal: 'ACCUMULATION' | 'UNWINDING' | 'STABLE' | 'NO_HISTORY';
}

export interface BarrierSummaryCard {
  strike: number;
  symbol: string;
  currentOI: number;
  prev1DOI: number | null;
  prev5DOI: number | null;
  change1DPercent: number | null;
  change5DPercent: number | null;
  distanceFromSpotPercent: number;
  flowSignal: 'ACCUMULATION' | 'UNWINDING' | 'STABLE' | 'NO_HISTORY';
}

export interface OITrackingCandle {
  date: number;
  dateFormatted: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OITrackingResult {
  symbol: string;
  selectedExpiration: string;
  selectedDte: number;
  isRolloverPeriod: boolean;
  availableExpirations: B3ExpirationInfo[];
  spotBands: SpotStatisticalBands;
  topCallOverall: BarrierSummaryCard | null;
  topCallWithin2Sigma: BarrierSummaryCard | null;
  topPutOverall: BarrierSummaryCard | null;
  topPutWithin2Sigma: BarrierSummaryCard | null;
  top3CallGains5D: BarrierTrackingItem[];
  top3CallLosses5D: BarrierTrackingItem[];
  top3PutGains5D: BarrierTrackingItem[];
  top3PutLosses5D: BarrierTrackingItem[];
  top3Gains5D: BarrierTrackingItem[];
  top3Losses5D: BarrierTrackingItem[];
  strikesTable: BarrierTrackingItem[];
  candles: OITrackingCandle[];
}

export interface Top10OIItem {
  strike: number;
  type: 'CALL' | 'PUT';
  symbol: string;
  currentOI: number;
  prev1DOI: number | null;
  prev5DOI: number | null;
  change1DPercent: number | null;
  change1DContracts: number | null;
  change5DPercent: number | null;
  change5DContracts: number | null;
  distanceFromSpotPercent: number;
  flowSignal: 'ACCUMULATION' | 'UNWINDING' | 'STABLE' | 'NO_HISTORY';
}

export interface Top10OIResult {
  symbol: string;
  spotPrice: number;
  selectedExpiration: string;
  selectedDte: number;
  isRolloverPeriod: boolean;
  availableExpirations: B3ExpirationInfo[];
  top10Calls: Top10OIItem[];
  top10Puts: Top10OIItem[];
  totalCallsOI: number;
  totalPutsOI: number;
  callPutRatio: number;
  dates: {
    current: string;
    d1: string;
    d5: string;
  };
}

// ─────────────────────────────────────────────────────────────
// MESA DE ESTRATÉGIAS AI — TIPOS CENTRAIS
// ─────────────────────────────────────────────────────────────

export type MarketRegimeType =
  | 'EQUILIBRIO'
  | 'NORMAL_ALTA'
  | 'NORMAL_BAIXA'
  | 'EXTENSAO_ALTA'
  | 'EXTENSAO_BAIXA'
  | 'EXTREMO_ALTA'
  | 'EXTREMO_BAIXA';

export type FlowSignalType =
  | 'ACCUMULATION_CALL'
  | 'ACCUMULATION_PUT'
  | 'UNWINDING'
  | 'NEUTRAL';

export type PCRSignalType =
  | 'BEARISH_EXTREMO'
  | 'BEARISH'
  | 'NEUTRO'
  | 'BULLISH'
  | 'BULLISH_EXTREMO';

export interface MarketRegime {
  zScore: number;
  regime: MarketRegimeType;
  regimeLabel: string;
  tailRiskIndex: number;
  tailRiskLabel: string;
  flowSignal: FlowSignalType;
  flowLabel: string;
  pcr: number;
  pcrSignal: PCRSignalType;
  pcrLabel: string;
  topCallBarrierStrike: number | null;
  topPutBarrierStrike: number | null;
  upperBand2Sigma: number;
  lowerBand2Sigma: number;
  upperBand3Sigma: number;
  lowerBand3Sigma: number;
  spotPrice: number;
  hv21: number | null;
  sampleSize: number;
  isInsufficient: boolean;
}

export type StrikeOriginType =
  | 'BARREIRA_CALL_REAL'
  | 'BARREIRA_PUT_REAL'
  | 'BANDA_2SIGMA_REAL'
  | 'BANDA_3SIGMA_REAL'
  | 'ATM_REAL'
  | 'SPREAD_CALCULADO';

export type PremiumReliabilityType =
  | 'REAL_MERCADO'
  | 'TEORICO_BS_HV_REAL'
  | 'SEM_DADOS';

export interface OptionLeg {
  action: 'COMPRAR' | 'VENDER';
  type: 'CALL' | 'PUT';
  strike: number;
  strikeOrigin: StrikeOriginType;
  strikeOriginLabel: string;
  dte: number;
  expiration: string;
  theoreticalPremium: number | null;
  marketPremium: number | null;
  premiumUsed: number | null;
  premiumReliability: PremiumReliabilityType;
  premiumReliabilityLabel: string;
  delta: number | null;
  legRationale: string;
}

export interface TailRiskLeg {
  type: 'PROTECAO_CAUDA' | 'OPORTUNIDADE_OUTLIER';
  typeLabel: string;
  triggerZScore: number;
  triggerCondition: string;
  isCurrentlyActive: boolean;
  legs: OptionLeg[];
  rationale: string;
}

export interface PayoffPoint {
  spotAtExpiry: number;
  netPayoff: number;
  currentPnL: number | null;
}

export interface PayoffReliability {
  expiryPayoffIsReal: boolean;
  expiryPayoffExplanation: string;
  currentPnLIsTheoretical: boolean;
  currentPnLExplanation: string;
  premiumWarnings: string[];
  hv21Used: number | null;
  riskFreeRateUsed: number;
  dataDate: string;
}

export interface ConvictionFactors {
  zScoreAlignment: number;
  flowAlignment: number;
  barrierAlignment: number;
  pcrAlignment: number;
  explanation: string[];
}

export type StrategyCategory = 'TATICA' | 'FLUXO' | 'RENDA_PROTECAO';
export type OperatorProfile = 'TATICO' | 'ESPECULATIVO' | 'CONSERVADOR';

export interface StrategyRecommendation {
  id: string;
  name: string;
  nameEn: string;
  category: StrategyCategory;
  targetProfiles: OperatorProfile[];
  convictionScore: number;
  convictionFactors: ConvictionFactors;
  regime: MarketRegimeType;
  legs: OptionLeg[];
  tailRisk: TailRiskLeg;
  maxRiskPerLot: number | null;
  maxReturnPerLot: number | null;
  breakEvenAtExpiry: number | null;
  returnOnRiskPercent: number | null;
  payoffPoints: PayoffPoint[];
  payoffReliability: PayoffReliability;
  rationale: string;
  alertas: string[];
  isDataInsufficient: boolean;
  insufficientDataReason?: string;
}

export interface StrategyEngineResult {
  symbol: string;
  spotPrice: number;
  selectedExpiration: string;
  selectedDte: number;
  isRolloverPeriod: boolean;
  hv21: number | null;
  regime: MarketRegime;
  strategies: StrategyRecommendation[];
  generatedAt: string;
}
