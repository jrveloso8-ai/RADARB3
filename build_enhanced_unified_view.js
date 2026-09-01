const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

// 1. Enhanced UnifiedGexBarreirasView.tsx with GEX Pillars and Sniper Checklist
const unifiedViewPath = path.join(targetBase, 'src/components/options/UnifiedGexBarreirasView.tsx');
let content = fs.readFileSync(unifiedViewPath, 'utf8');

// Insert Pre-operational checklist and diagnostics section right before the end of the return statement
const operationalBox = `
      {/* 6. PAINEL INSTITUCIONAL: PILARES OPERACIONAIS DO GEX & ENTRADA SNIPER */}
      <div className="bg-[#0c1322] border border-cyan-500/40 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-tight">
                Diretrizes Operacionais de Execução Institucional (GEX Engine)
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">
                O GEX não é análise técnica subjetiva — é a derivada de 2ª ordem que obriga os Market Makers ao Delta Hedging.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold">
            Fórmula: GEX = Γ × OI × Spot² × 100
          </span>
        </div>

        {/* 4 Cards de Diagnóstico de Campo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-[#070b14] border border-emerald-500/30 rounded-xl space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold block font-sans">1. RESISTÊNCIA (CALL WALL)</span>
            <span className="text-base font-bold text-white block">\${topCallWalls[0]?.strike.toFixed(2) || '—'}</span>
            <span className="text-[10px] text-gray-400 block font-sans">Ímã de alta & trava de balanceamento dos MMs.</span>
          </div>

          <div className="p-3.5 bg-[#070b14] border border-rose-500/30 rounded-xl space-y-1">
            <span className="text-[10px] text-rose-400 font-bold block font-sans">2. SUPORTE (PUT WALL)</span>
            <span className="text-base font-bold text-white block">\${topPutWalls[0]?.strike.toFixed(2) || '—'}</span>
            <span className="text-[10px] text-gray-400 block font-sans">Ímã de baixa & barreira matemática dos MMs.</span>
          </div>

          <div className="p-3.5 bg-[#070b14] border border-amber-500/30 rounded-xl space-y-1">
            <span className="text-[10px] text-amber-400 font-bold block font-sans">3. PIN CANDIDATE (ESCAPE OI)</span>
            <span className="text-base font-bold text-amber-300 block">\${maxPain.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400 block font-sans">Ponto de fuga secundário quando as Walls falham.</span>
          </div>

          <div className="p-3.5 bg-[#070b14] border border-purple-500/30 rounded-xl space-y-1">
            <span className="text-[10px] text-purple-400 font-bold block font-sans">4. ZERO GAMMA FLIP</span>
            <span className="text-base font-bold text-purple-300 block">\${zeroGammaFlip.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400 block font-sans">Gatilho de transição entre Supressão e Squeeze.</span>
          </div>
        </div>

        {/* Checklist Pré-Operacional GEX (5 Passos) */}
        <div className="p-4 bg-[#070b14] border border-gray-800 rounded-xl space-y-3 font-sans text-xs">
          <h5 className="font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Checklist Pré-Operacional do Trader Quantitativo:</span>
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-gray-300">
            <div className="p-2.5 bg-[#111827] rounded-lg border border-gray-800 space-y-1">
              <strong className="text-cyan-300 block font-mono">1. Localizar Call Wall e Put Wall:</strong>
              Ponderadas pela sensibilidade Gamma real (descarte leituras de OI puro estático).
            </div>

            <div className="p-2.5 bg-[#111827] rounded-lg border border-gray-800 space-y-1">
              <strong className="text-cyan-300 block font-mono">2. Diagnóstico de Encavalamento:</strong>
              {Math.abs(topCallWalls[0]?.strike - topPutWalls[0]?.strike) < spotPrice * 0.05
                ? '⚠ Walls encavaladas -> Viés de Consolidação (Montar Iron Condor e colher teta).'
                : '✓ Walls abertas -> Espaço para expansão direcional ou Straddles.'}
            </div>

            <div className="p-2.5 bg-[#111827] rounded-lg border border-gray-800 space-y-1">
              <strong className="text-cyan-300 block font-mono">3. Gatilho Sniper no Primeiro Toque:</strong>
              No 1º toque na Wall, o preço quase nunca rompe; atue na exaustão buscando reversão à média.
            </div>

            <div className="p-2.5 bg-[#111827] rounded-lg border border-gray-800 space-y-1">
              <strong className="text-cyan-300 block font-mono">4. Calendário Operacional:</strong>
              Quinta e Sexta-feira concentram os ajustes semanais de Delta Hedge institucional.
            </div>
          </div>
        </div>
      </div>
`;

content = content.replace(
  '    </div>\n  );\n}',
  operationalBox + '\n    </div>\n  );\n}'
);

fs.writeFileSync(unifiedViewPath, content, 'utf8');
console.log('UnifiedGexBarreirasView.tsx enhanced with GEX pillars and Sniper Checklist');
