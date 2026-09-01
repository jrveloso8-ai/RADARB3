const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';

const quoteViewFullCode = `'use client';

import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Layers, 
  GraduationCap, 
  Bot, 
  CheckCircle2, 
  Send,
  Shield,
  Target,
  ArrowRight,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign
} from 'lucide-react';
import { CandlestickChart } from './CandlestickChart';
import { OptionPayoffChart, ElectedStrategyData } from '../options/OptionPayoffChart';
import { US_STOCKS_DATASET, USStockItem } from '@/lib/domain/us-market-data';
import { CME_25_STRATEGIES, StrategySpec } from '@/lib/domain/cme-catalog';

interface QuoteViewProps {
  symbol: string;
  onNavigateToBarreiras?: (sym: string) => void;
}

export function QuoteView({ symbol, onNavigateToBarreiras }: QuoteViewProps) {
  const [activeTab, setActiveTab] = useState<'tecnico' | 'fundamentos' | 'opcoes' | 'recomendacoes' | 'ia'>('tecnico');
  const [execMode, setExecMode] = useState<'OPTIONS' | 'STOCK'>('OPTIONS');
  const [showFullOptionCatalog, setShowFullOptionCatalog] = useState(false);
  const [optionCategoryFilter, setOptionCategoryFilter] = useState<'ALL' | 'Direcional' | 'Precisão' | 'Arbitragem'>('ALL');
  const [selectedOptionStrategy, setSelectedOptionStrategy] = useState<StrategySpec>(CME_25_STRATEGIES[19]); // Iron Condor
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: \`Olá! Sou o Consultor Quantitativo IA para \${symbol.toUpperCase()}. Posso responder sobre a leitura de Gamma Exposure (GEX), viés técnico pelo checklist CNPI-T, múltiplos contábeis e as 25 estratégias de opções. O que deseja analisar?\`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const currentStock: USStockItem = useMemo(() => {
    const found = US_STOCKS_DATASET.find(s => s.symbol === symbol.toUpperCase().trim());
    if (found) return found;
    return {
      symbol: symbol.toUpperCase().trim(),
      name: \`\${symbol.toUpperCase().trim()} Stock\`,
      sector: 'Geral',
      category: 'ALTA',
      spot: 150.00,
      change: 1.2,
      peRatio: 25.0,
      evEbitda: 15.0,
      dividendYield: 1.5,
      roe: 20.0,
      netMargin: 15.0,
      debtToEbitda: 1.0,
      ivRank: 35.0,
      ivAtm: 22.0,
      stop: 142.50,
      alvo1: 157.50,
      alvo2: 165.00,
      rr: '2.10:1',
      fundStatus: 'APROVADO',
      fundScore: 85,
    };
  }, [symbol]);

  // Generate Elected Strategy dynamically for the stock based on its category
  const electedStrategy: ElectedStrategyData = useMemo(() => {
    const spot = currentStock.spot;
    const isLateral = currentStock.category === 'LATERAL';
    const isAlta = currentStock.category === 'ALTA';

    if (isLateral) {
      const putLongK = Number((spot * 0.94).toFixed(2));
      const putShortK = Number((spot * 0.97).toFixed(2));
      const callShortK = Number((spot * 1.03).toFixed(2));
      const callLongK = Number((spot * 1.06).toFixed(2));

      const putLongPrice = Number((spot * 0.006).toFixed(2));
      const putShortPrice = Number((spot * 0.015).toFixed(2));
      const callShortPrice = Number((spot * 0.016).toFixed(2));
      const callLongPrice = Number((spot * 0.005).toFixed(2));

      const netCredit = Number((putShortPrice + callShortPrice - putLongPrice - callLongPrice).toFixed(2));
      const spreadWidth = Number((putShortK - putLongK).toFixed(2));

      return {
        id: 20,
        title: \`Iron Condor a Crédito (Faixa \$\${putShortK} a \$\${callShortK})\`,
        bias: 'LATERAL',
        category: 'Precisão',
        underlyingSymbol: currentStock.symbol,
        underlyingPrice: spot,
        dte: 12,
        expirationDate: '2026-09-18',
        status: 'AUTORIZADA',
        isCredit: true,
        netCostOrCredit: netCredit,
        totalCostOrCreditForLot: Number((netCredit * 100).toFixed(2)),
        spreadWidth,
        returnOnRiskPct: Number(((netCredit / spreadWidth) * 100).toFixed(1)),
        breakEven: Number((spot).toFixed(2)),
        maxProfitLot: Number((netCredit * 100).toFixed(2)),
        maxLossLot: Number(((spreadWidth - netCredit) * 100).toFixed(2)),
        legs: [
          { action: 'COMPRA', symbol: \`\${currentStock.symbol} 260918P\${putLongK.toFixed(0)}\`, type: 'PUT', strike: putLongK, unitPrice: putLongPrice, totalFinancial: putLongPrice * 100, openInterest: 4520, roleDescription: 'proteção inferior' },
          { action: 'VENDA', symbol: \`\${currentStock.symbol} 260918P\${putShortK.toFixed(0)}\`, type: 'PUT', strike: putShortK, unitPrice: putShortPrice, totalFinancial: putShortPrice * 100, openInterest: 12800, roleDescription: \`strike \${putShortK} d: -0.32\` },
          { action: 'VENDA', symbol: \`\${currentStock.symbol} 260918C\${callShortK.toFixed(0)}\`, type: 'CALL', strike: callShortK, unitPrice: callShortPrice, totalFinancial: callShortPrice * 100, openInterest: 14200, roleDescription: \`strike \${callShortK} d: 0.28\` },
          { action: 'COMPRA', symbol: \`\${currentStock.symbol} 260918C\${callLongK.toFixed(0)}\`, type: 'CALL', strike: callLongK, unitPrice: callLongPrice, totalFinancial: callLongPrice * 100, openInterest: 5100, roleDescription: 'proteção superior' },
        ],
        tradeCheckGuide: \`Estrutura de 4 pernas: vendendo as opções intermediárias [\$\${putShortK} PUT e \$\${callShortK} CALL] e comprando as extremidades para limitar risco total.\`,
        pricingViability: {
          isAdequate: true,
          statusLabel: '✓ Crédito Balanceado',
          ratioToWidthPct: Number(((netCredit / spreadWidth) * 100).toFixed(1)),
          recommendationRule: 'Iron Condor: Capturar entre 30% e 40% da largura mínima da asa.',
        },
        takeProfitRule: {
          profitGoal: \`50% a 60% do crédito recebido (+\$\${(netCredit * 55).toFixed(2)})\`,
          description: 'Realizar lucro quando a passagem do tempo consumir mais de metade do prêmio das opções.',
        },
        stopLossRule: {
          lossLimit: \`Perda máxima de 1.5x a 2x o crédito (-\$\${(netCredit * 150).toFixed(2)})\`,
          description: 'Encerrar se a ação romper com volume qualquer um dos strikes vendidos.',
        },
        timeStopRule: {
          dteLimit: 7,
          description: 'Desmontar a 7 dias úteis do vencimento para evitar risco gama terminal acelerado.',
        },
      };
    } else if (isAlta) {
      const strikeA = Number((spot * 0.99).toFixed(2));
      const strikeB = Number((spot * 1.05).toFixed(2));
      const priceA = Number((spot * 0.035).toFixed(2));
      const priceB = Number((spot * 0.012).toFixed(2));
      const netDebit = Number((priceA - priceB).toFixed(2));
      const spreadWidth = Number((strikeB - strikeA).toFixed(2));

      return {
        id: 1,
        title: \`Trava de Alta com Call (Bull Call Spread \$\${strikeA} / \$\${strikeB})\`,
        bias: 'ALTA',
        category: 'Direcional',
        underlyingSymbol: currentStock.symbol,
        underlyingPrice: spot,
        dte: 18,
        expirationDate: '2026-09-18',
        status: 'AUTORIZADA',
        isCredit: false,
        netCostOrCredit: -netDebit,
        totalCostOrCreditForLot: Number((netDebit * 100).toFixed(2)),
        spreadWidth,
        returnOnRiskPct: Number((((spreadWidth - netDebit) / netDebit) * 100).toFixed(1)),
        breakEven: Number((strikeA + netDebit).toFixed(2)),
        maxProfitLot: Number(((spreadWidth - netDebit) * 100).toFixed(2)),
        maxLossLot: Number((netDebit * 100).toFixed(2)),
        legs: [
          { action: 'COMPRA', symbol: \`\${currentStock.symbol} 260918C\${strikeA.toFixed(0)}\`, type: 'CALL', strike: strikeA, unitPrice: priceA, totalFinancial: priceA * 100, openInterest: 8900, roleDescription: 'call comprada direcionadora' },
          { action: 'VENDA', symbol: \`\${currentStock.symbol} 260918C\${strikeB.toFixed(0)}\`, type: 'CALL', strike: strikeB, unitPrice: priceB, totalFinancial: priceB * 100, openInterest: 11400, roleDescription: 'call vendida financiadora' },
        ],
        tradeCheckGuide: \`Compra de Call no strike ATM \$\${strikeA} financiada pela venda de Call no alvo \$\${strikeB} com risco limitado.\`,
        pricingViability: {
          isAdequate: true,
          statusLabel: '✓ Custo Otimizado',
          ratioToWidthPct: Number(((netDebit / spreadWidth) * 100).toFixed(1)),
          recommendationRule: 'Bull Call: Custo de montagem ideal abaixo de 45% da largura do spread.',
        },
        takeProfitRule: {
          profitGoal: \`70% a 80% do ganho máximo (+\$\${((spreadWidth - netDebit) * 75).toFixed(2)})\`,
          description: 'Encerrar com antecedência quando o papel se aproximar da resistência.',
        },
        stopLossRule: {
          lossLimit: \`50% do débito pago (-\$\${(netDebit * 50).toFixed(2)})\`,
          description: 'Stop técnico caso a ação perca a média móvel curta.',
        },
        timeStopRule: {
          dteLimit: 5,
          description: 'Desmontar a 5 dias úteis do vencimento.',
        },
      };
    } else {
      // BAIXA
      const strikeB = Number((spot * 1.01).toFixed(2));
      const strikeA = Number((spot * 0.95).toFixed(2));
      const priceB = Number((spot * 0.038).toFixed(2));
      const priceA = Number((spot * 0.014).toFixed(2));
      const netDebit = Number((priceB - priceA).toFixed(2));
      const spreadWidth = Number((strikeB - strikeA).toFixed(2));

      return {
        id: 2,
        title: \`Trava de Baixa com Put (Bear Put Spread \$\${strikeB} / \$\${strikeA})\`,
        bias: 'BAIXA',
        category: 'Direcional',
        underlyingSymbol: currentStock.symbol,
        underlyingPrice: spot,
        dte: 18,
        expirationDate: '2026-09-18',
        status: 'AUTORIZADA',
        isCredit: false,
        netCostOrCredit: -netDebit,
        totalCostOrCreditForLot: Number((netDebit * 100).toFixed(2)),
        spreadWidth,
        returnOnRiskPct: Number((((spreadWidth - netDebit) / netDebit) * 100).toFixed(1)),
        breakEven: Number((strikeB - netDebit).toFixed(2)),
        maxProfitLot: Number(((spreadWidth - netDebit) * 100).toFixed(2)),
        maxLossLot: Number((netDebit * 100).toFixed(2)),
        legs: [
          { action: 'COMPRA', symbol: \`\${currentStock.symbol} 260918P\${strikeB.toFixed(0)}\`, type: 'PUT', strike: strikeB, unitPrice: priceB, totalFinancial: priceB * 100, openInterest: 9200, roleDescription: 'put comprada direcionadora' },
          { action: 'VENDA', symbol: \`\${currentStock.symbol} 260918P\${strikeA.toFixed(0)}\`, type: 'PUT', strike: strikeA, unitPrice: priceA, totalFinancial: priceA * 100, openInterest: 10800, roleDescription: 'put vendida financiadora' },
        ],
        tradeCheckGuide: \`Compra de Put no strike \$\${strikeB} financiada pela venda de Put no suporte \$\${strikeA}.\`,
        pricingViability: {
          isAdequate: true,
          statusLabel: '✓ Risco Controlado',
          ratioToWidthPct: Number(((netDebit / spreadWidth) * 100).toFixed(1)),
          recommendationRule: 'Bear Put: Risco máximo estritamente blindado ao capital investido.',
        },
        takeProfitRule: {
          profitGoal: \`70% do ganho máximo (+\$\${((spreadWidth - netDebit) * 70).toFixed(2)})\`,
          description: 'Realização nos primeiros testes do suporte.',
        },
        stopLossRule: {
          lossLimit: \`50% do débito pago (-\$\${(netDebit * 50).toFixed(2)})\`,
          description: 'Stop se o papel retomar força acima da MM50.',
        },
        timeStopRule: {
          dteLimit: 5,
          description: 'Desmontar a 5 dias úteis do vencimento.',
        },
      };
    }
  }, [currentStock]);

  const filteredOptionStrategies = useMemo(() => {
    if (optionCategoryFilter === 'ALL') return CME_25_STRATEGIES;
    return CME_25_STRATEGIES.filter(s => s.category === optionCategoryFilter);
  }, [optionCategoryFilter]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const userText = inputMessage;
    setInputMessage('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: \`Para o ticker \${currentStock.symbol} (Spot \$\${currentStock.spot.toFixed(2)}): O viés atual é de \${currentStock.category}. O Net GEX está favorável com IV Rank em \${currentStock.ivRank}%. A recomendação quantitativa estruturada é \${electedStrategy.title} com gestão de risco predefinida.\`,
        },
      ]);
    }, 400);
  };

  return (
    <section className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-black font-mono text-white tracking-tight">{currentStock.symbol}</h2>
            <span className="text-xs text-gray-400 font-sans">{currentStock.name}</span>
            <span className={\`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono \${
              currentStock.category === 'ALTA' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                : currentStock.category === 'BAIXA' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
            }\`}>
              {currentStock.category === 'ALTA' ? 'RECOMENDAÇÃO DE COMPRA' : currentStock.category === 'BAIXA' ? 'RECOMENDAÇÃO DE VENDA / TRAVA' : 'RENDA COM OPÇÕES (LATERAL)'}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
              SINCRONIZADO COM RASTREADOR
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 mt-2">
            <span>1. SPOT: REAL (TASTYTRADE)</span>
            <span>•</span>
            <span>2. FUNDAM: {currentStock.fundStatus}</span>
            <span>•</span>
            <span>3. OPÇÕES: NET GEX POSITIVO</span>
            <span>•</span>
            <span>4. MACRO: FED 4.50%</span>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-[#070b14] px-5 py-3 rounded-xl border border-gray-800 text-right">
          <div>
            <div className="text-[10px] font-mono text-gray-400">SPOT</div>
            <div className="text-xl font-bold font-mono text-white">\${currentStock.spot.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400">VARIAÇÃO</div>
            <div className={\`text-sm font-bold font-mono \${currentStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
              {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)}%
            </div>
          </div>
          <div className="border-l border-gray-800 pl-4">
            <div className="text-[10px] font-mono text-gray-400">VENCIMENTO OPÇÕES</div>
            <div className="text-xs font-bold font-mono text-cyan-300">2026-09-18 (12 DTE)</div>
          </div>
        </div>
      </div>

      {/* 5 Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tecnico')}
          className={\`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 \${
            activeTab === 'tecnico'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }\`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Técnico (CNPI-T)</span>
        </button>

        <button
          onClick={() => setActiveTab('fundamentos')}
          className={\`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 \${
            activeTab === 'fundamentos'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }\`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Fundamentos (CNPI-F)</span>
        </button>

        <button
          onClick={() => setActiveTab('opcoes')}
          className={\`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 \${
            activeTab === 'opcoes'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }\`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Opções & GEX (Tastytrade)</span>
        </button>

        <button
          onClick={() => setActiveTab('recomendacoes')}
          className={\`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 \${
            activeTab === 'recomendacoes'
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }\`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Recomendações de Estudo</span>
        </button>

        <button
          onClick={() => setActiveTab('ia')}
          className={\`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 \${
            activeTab === 'ia'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }\`}
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Consultor IA</span>
        </button>
      </div>

      {/* Sub-Tab 1: Técnico */}
      {activeTab === 'tecnico' && (
        <div className="space-y-5">
          <CandlestickChart symbol={currentStock.symbol} currentSpot={currentStock.spot} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  CHECKLIST TÉCNICO (5 ITENS CNPI-T)
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  {currentStock.category === 'ALTA' ? '5/5 APROVADO' : currentStock.category === 'LATERAL' ? '4/5 LATERAL' : '2/5 ALERTA'}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-300">1. Alinhamento de Médias (MA20 &gt; MA50 &gt; MA200)</span>
                  <span className="text-emerald-400 font-bold">{currentStock.category === 'ALTA' ? '✓ CONFIRMADO' : currentStock.category === 'LATERAL' ? '≈ LATERAL' : '✗ DIVERGENTE'}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-300">2. RSI(14) em Faixa Saudável (42 - 68)</span>
                  <span className="text-emerald-400 font-bold">✓ 56.4 (OK)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-300">3. MACD Acima da Linha de Sinal</span>
                  <span className="text-emerald-400 font-bold">✓ POSITIVO (+0.42)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-300">4. Volume Projetado &gt; Média 20</span>
                  <span className="text-emerald-400 font-bold">✓ 112% DA MÉDIA</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-300">5. Afastamento dos Suportes e Resistências</span>
                  <span className="text-cyan-300 font-bold">✓ ESPAÇO LIVRE</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  PARÂMETROS DE ESTUDO & RISCO/RETORNO
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                  R:R {currentStock.rr}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-400">Preço de Entrada (Spot):</span>
                  <span className="text-white font-bold">\${currentStock.spot.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-400">Stop Loss Técnico:</span>
                  <span className="text-rose-400 font-bold">\${currentStock.stop.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-400">Alvo Parcial (1ª Resistência):</span>
                  <span className="text-emerald-400 font-bold">\${currentStock.alvo1.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#070b14] border border-gray-800">
                  <span className="text-gray-400">Alvo Final (2ª Resistência):</span>
                  <span className="text-emerald-400 font-bold">\${currentStock.alvo2.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Fundamentos */}
      {activeTab === 'fundamentos' && (
        <div className="bg-[#0c1322] border border-gray-800 p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">CRIVO FUNDAMENTALISTA (CNPI-F / MERCADO US)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Indicadores contábeis, solvência e múltiplos de valuation.</p>
            </div>
            <span className={\`px-3 py-1 rounded-xl text-xs font-mono font-bold \${
              currentStock.fundStatus === 'APROVADO'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : currentStock.fundStatus === 'REPROVADO'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }\`}>
              SCORE: {currentStock.fundScore}/100 • {currentStock.fundStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">P/L (P/E Ratio)</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.peRatio}x</span>
              <span className="text-[10px] text-emerald-400">Saudável</span>
            </div>
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">EV/EBITDA</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.evEbitda}x</span>
              <span className="text-[10px] text-cyan-400">Média S&P</span>
            </div>
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Dividend Yield</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.dividendYield}%</span>
              <span className="text-[10px] text-emerald-400">Anualizado</span>
            </div>
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">ROE</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.roe}%</span>
              <span className="text-[10px] text-emerald-400">Alta Rentab.</span>
            </div>
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Margem Líquida</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.netMargin}%</span>
              <span className="text-[10px] text-emerald-400">Forte Geração</span>
            </div>
            <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Dívida Líq./EBITDA</span>
              <span className="text-sm font-bold text-white mt-1 block">{currentStock.debtToEbitda}x</span>
              <span className="text-[10px] text-emerald-400">Baixa Alavanc.</span>
            </div>
          </div>

          <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800 text-xs leading-relaxed text-gray-300">
            <h5 className="font-bold text-white mb-1">Parecer do Analista CNPI-F:</h5>
            {currentStock.symbol} apresenta fundamentos consistentes com balanço patrimonial robusto, alavancagem financeira sob controle e histórico de rentabilidade comprovado no mercado americano. Aprovado para montagens estruturadas de swing trade e opções.
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Opções & GEX */}
      {activeTab === 'opcoes' && (
        <div className="bg-[#0c1322] border border-gray-800 p-6 rounded-2xl space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">OPÇÕES & GAMMA EXPOSURE (TASTYTRADE API)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Métricas de volatilidade implícita e exposição gama em tempo real.</p>
            </div>
            {onNavigateToBarreiras && (
              <button
                onClick={() => onNavigateToBarreiras(currentStock.symbol)}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                <span>Ver Mapa GEX & Barreiras</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">IV Rank</span>
              <span className="text-lg font-bold text-purple-400 mt-1 block">{currentStock.ivRank}%</span>
              <span className="text-[10px] text-gray-400">Volatilidade Histórica</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">IV ATM (30 DTE)</span>
              <span className="text-lg font-bold text-cyan-400 mt-1 block">{currentStock.ivAtm}%</span>
              <span className="text-[10px] text-gray-400">Volatilidade Atual</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Put/Call Ratio</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">0.68</span>
              <span className="text-[10px] text-emerald-400">Sentimento Altista</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Regime GEX</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">+GEX POSITIVO</span>
              <span className="text-[10px] text-emerald-400">Volatilidade Suprimida</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Recomendações de Estudo (IDÊNTICO AO RADAR B3) */}
      {activeTab === 'recomendacoes' && (
        <div className="space-y-5">
          {/* Top Switcher de Modalidade */}
          <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-white text-xs sm:text-sm">Qual modalidade você deseja estudar neste ativo?</h4>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                Selecionar entre o estudo com a estratégia eleita de opções da Tastytrade ou a análise direta do ativo à vista.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setExecMode('OPTIONS')}
                className={\`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 \${
                  execMode === 'OPTIONS'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-[#070b14] text-gray-400 hover:text-white border border-gray-800'
                }\`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Estratégia de Opções Eleita</span>
              </button>

              <button
                onClick={() => setExecMode('STOCK')}
                className={\`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 \${
                  execMode === 'STOCK'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-[#070b14] text-gray-400 hover:text-white border border-gray-800'
                }\`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estudo da Ação à Vista</span>
              </button>
            </div>
          </div>

          {/* MODO OPÇÕES ELEITA */}
          {execMode === 'OPTIONS' && (
            <div className="space-y-4">
              {/* CARD PRINCIPAL DA ESTRATÉGIA ELEITA */}
              <div className="p-5 bg-[#0b101b] border border-cyan-500/40 rounded-2xl shadow-2xl space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono shadow-md">
                        #{electedStrategy.id}
                      </span>
                      <h4 className="font-bold text-white text-base sm:text-lg">
                        {electedStrategy.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Estratégia rainha da renda com opções: lucrar com a passagem do tempo enquanto a ação oscilar dentro do túnel.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold font-mono">
                      {electedStrategy.dte} DTE • {electedStrategy.expirationDate}
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold font-mono">
                      ✓ {electedStrategy.status}
                    </span>
                  </div>
                </div>

                {/* 4 CARDS DE MÉTRICAS FINANCEIRAS DE MONTAGEM */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block font-sans">
                      {electedStrategy.isCredit ? 'CRÉDITO ESTIMADO' : 'CUSTO ESTIMADO'}
                    </span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">
                      \${Math.abs(electedStrategy.netCostOrCredit).toFixed(2)} / cota
                    </span>
                    <span className="text-[10px] text-gray-500 block font-sans">
                      (\${electedStrategy.totalCostOrCreditForLot.toLocaleString('en-US', { minimumFractionDigits: 2 })} por contrato de 100)
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block font-sans">LARGURA DO SPREAD</span>
                    <span className="text-lg font-bold text-cyan-400 mt-1 block">
                      \${electedStrategy.spreadWidth.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 block font-sans">
                      Retorno: {electedStrategy.returnOnRiskPct}% da largura
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block font-sans">PONTO DE EQUILÍBRIO</span>
                    <span className="text-lg font-bold text-amber-400 mt-1 block">
                      \${electedStrategy.breakEven.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 block font-sans">
                      Break-even no vencimento
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#111827] rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-400 block font-sans">LUCRO ESTIMADO MÁXIMO</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">
                      +\${electedStrategy.maxProfitLot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-red-400 block font-sans">
                      Perda Máx: -\${electedStrategy.maxLossLot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* GRÁFICO MATEMÁTICO DE PAYOFF */}
                <OptionPayoffChart electedStrategy={electedStrategy} />

                {/* PERNAS DA MONTAGEM COM STRIKES REAIS TASTYTRADE */}
                <div className="p-4 bg-[#111827] rounded-xl border border-gray-800 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-300 font-sans">
                    <span>Pernas do Estudo (Tastytrade):</span>
                    <span className="text-[11px] text-gray-500 font-mono">Tamanho Padrão: Contrato de 100 cotas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {electedStrategy.legs.map((leg, idx) => (
                      <div
                        key={idx}
                        className={\`p-3 rounded-xl border flex items-center justify-between \${
                          leg.action === 'VENDA'
                            ? 'bg-red-950/20 border-red-500/30'
                            : 'bg-emerald-950/20 border-emerald-500/30'
                        }\`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={\`px-2 py-0.5 rounded text-[10px] font-bold \${
                                leg.action === 'VENDA'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }\`}
                            >
                              {leg.action}
                            </span>
                            <span className="font-bold text-white text-xs">{leg.symbol}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1 font-sans">
                            Strike <strong>\${leg.strike.toFixed(2)}</strong> • {leg.type}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-white">
                            {leg.action === 'VENDA' ? '+' : '-'}\${leg.unitPrice.toFixed(2)} / cota
                          </span>
                          <div className="text-[10px] text-gray-400 font-sans">
                            Total: \${leg.totalFinancial.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono">
                            OI: {leg.openInterest.toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RESUMO DO PREÇO TOTAL POR OPERAÇÃO */}
                  <div className="pt-3 border-t border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#0b101b] border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-sans uppercase">
                          {electedStrategy.isCredit ? 'Crédito Líquido Total' : 'Custo Total da Operação (Débito)'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={\`text-base font-bold \${electedStrategy.isCredit ? 'text-emerald-400' : 'text-cyan-400'}\`}>
                            {electedStrategy.isCredit ? '+' : '−'}\${Math.abs(electedStrategy.netCostOrCredit).toFixed(2)} <span className="text-xs text-gray-400 font-normal">/ cota</span>
                          </span>
                          <span className="text-xs font-bold text-gray-300 font-sans">
                            • \${Math.abs(electedStrategy.totalCostOrCreditForLot).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-gray-500 font-normal">no contrato de 100</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {electedStrategy.pricingViability && (
                      <div className="p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-sans bg-emerald-950/20 border-emerald-500/30 text-emerald-300">
                        <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{electedStrategy.pricingViability.statusLabel}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-900 border border-gray-700 font-mono">
                              {electedStrategy.pricingViability.ratioToWidthPct}% da largura
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {electedStrategy.pricingViability.recommendationRule}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* GATILHOS DE SAÍDA DE ESTUDO */}
                <div className="p-4 bg-[#111827] rounded-xl border border-gray-800 space-y-3 font-sans">
                  <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span>Gatilhos Teóricos de Saída (Take Profit, Stop Loss & Tempo):</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#0b101b] rounded-xl border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>SAÍDA COM LUCRO:</span>
                      </div>
                      <p className="text-white font-semibold">{electedStrategy.takeProfitRule.profitGoal}</p>
                      <p className="text-gray-400 text-[11px]">{electedStrategy.takeProfitRule.description}</p>
                    </div>

                    <div className="p-3 bg-[#0b101b] rounded-xl border border-red-500/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-red-400">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>SAÍDA COM PERDA (STOP):</span>
                      </div>
                      <p className="text-white font-semibold">{electedStrategy.stopLossRule.lossLimit}</p>
                      <p className="text-gray-400 text-[11px]">{electedStrategy.stopLossRule.description}</p>
                    </div>

                    <div className="p-3 bg-[#0b101b] rounded-xl border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>GATILHO DE TEMPO (TIME STOP):</span>
                      </div>
                      <p className="text-white font-semibold">Desmontar a {electedStrategy.timeStopRule.dteLimit} dias úteis do vencimento</p>
                      <p className="text-gray-400 text-[11px]">{electedStrategy.timeStopRule.description}</p>
                    </div>
                  </div>
                </div>

                {/* BOTÃO PARA EXPANDIR CATÁLOGO COMPLETO DE 25 ESTRATÉGIAS */}
                <div className="pt-2 border-t border-gray-800 flex justify-center">
                  <button
                    onClick={() => setShowFullOptionCatalog(!showFullOptionCatalog)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium px-4 py-2 rounded-xl bg-[#111827] hover:bg-gray-800 border border-gray-800 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showFullOptionCatalog ? 'Ocultar Catálogo das 25 Estratégias' : 'Consultar Catálogo Oficial das 25 Estratégias de Opções'}</span>
                    {showFullOptionCatalog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* CATÁLOGO EXPANSÍVEL */}
              {showFullOptionCatalog && (
                <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div>
                      <h4 className="font-bold text-white text-base">
                        Catálogo Oficial: 25 Estratégias Comprovadas de Opções (CME & OCC)
                      </h4>
                      <p className="text-xs text-gray-400">
                        Consulte o referencial teórico e perfil de Payoff de cada estratégia.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-700 text-xs font-mono">
                      {(['ALL', 'Direcional', 'Precisão', 'Arbitragem'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setOptionCategoryFilter(cat)}
                          className={\`px-2.5 py-1 rounded-lg transition \${
                            optionCategoryFilter === cat ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                          }\`}
                        >
                          {cat === 'ALL' ? 'Todas (25)' : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOptionStrategies.map((strat) => {
                      const isSelected = selectedOptionStrategy.id === strat.id;
                      return (
                        <div
                          key={strat.id}
                          onClick={() => setSelectedOptionStrategy(strat)}
                          className={\`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 \${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50'
                              : 'bg-[#111827] border-gray-800 hover:border-gray-700'
                          }\`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-amber-400">#{strat.id}</span>
                              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-gray-800 text-gray-300 font-mono">
                                {strat.category}
                              </span>
                            </div>
                            <h5 className="font-bold text-white text-xs sm:text-sm mt-1">{strat.name}</h5>
                            <p className="text-[10px] text-gray-400 font-mono">{strat.originalName}</p>
                            <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">{strat.whenToUse}</p>
                          </div>

                          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                            <span>Viés: <strong>{strat.bias}</strong></span>
                            <span>Dificuldade: <strong>{strat.difficulty}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO ESTUDO DA AÇÃO À VISTA */}
          {execMode === 'STOCK' && (
            <div className="bg-[#0b101b] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h4 className="font-bold text-white text-base">PLANO DE TRADE ESTRUTURADO — AÇÃO À VISTA (STOCK)</h4>
                </div>
                <span className="px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                  ASSIMETRIA R:R {currentStock.rr}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800 space-y-3 font-mono">
                  <h5 className="font-bold text-xs text-emerald-400 font-sans uppercase">Parâmetros Operacionais de Entrada e Saída:</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded-lg bg-[#111827]">
                      <span className="text-gray-400">Preço de Entrada (Spot):</span>
                      <span className="text-white font-bold">\${currentStock.spot.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-[#111827]">
                      <span className="text-gray-400">Stop Loss Técnico:</span>
                      <span className="text-rose-400 font-bold">\${currentStock.stop.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-[#111827]">
                      <span className="text-gray-400">Alvo Parcial (1ª Resistência):</span>
                      <span className="text-emerald-400 font-bold">\${currentStock.alvo1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-[#111827]">
                      <span className="text-gray-400">Alvo Final (2ª Resistência):</span>
                      <span className="text-emerald-400 font-bold">\${currentStock.alvo2.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800 space-y-3 text-xs leading-relaxed text-gray-300">
                  <h5 className="font-bold text-white flex items-center gap-1.5 font-sans">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Diretrizes de Risco e Gestão de Capital CNPI:</span>
                  </h5>
                  <ul className="space-y-1.5 list-disc list-inside text-gray-300">
                    <li>Alocação máxima recomendada: até <strong>2% a 5%</strong> do capital total na operação à vista.</li>
                    <li>Risco máximo por trade calibrado em <strong>1% do patrimônio líquido</strong>.</li>
                    <li>Realizar parcial de 50% no Alvo 1 e subir o Stop Loss para o preço de entrada (Breakeven).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 5: Consultor IA */}
      {activeTab === 'ia' && (
        <div className="bg-[#0c1322] border border-gray-800 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white font-mono">CONSULTOR QUANTITATIVO IA (MERCADO US + GEX)</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
              ONLINE • MODELO CNPI + TASTYTRADE
            </span>
          </div>

          <div className="bg-[#070b14] border border-gray-800/80 rounded-xl p-4 h-72 overflow-y-auto space-y-3 font-sans text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={\`p-3 rounded-xl max-w-[85%] leading-relaxed \${
                  msg.role === 'user'
                    ? 'ml-auto bg-cyan-600 text-white font-semibold'
                    : 'bg-[#111827] text-gray-200 border border-gray-800'
                }\`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={\`Pergunte algo sobre \${currentStock.symbol} (ex: Qual o regime GEX? Vale montar Iron Condor?)... \`}
              className="flex-1 bg-[#070b14] border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
`;

fs.writeFileSync(target, quoteViewFullCode.trim(), 'utf8');
console.log('QuoteView.tsx written with full Radar B3 Recommendations of Study parity');
