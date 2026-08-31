'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-12 border-t border-gray-800 bg-[#070b14]/90 backdrop-blur-md py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-300 flex items-center justify-center md:justify-start gap-1.5 font-sans">
              <span>AVISO LEGAL & CARÁTER ESTRITAMENTE EDUCACIONAL</span>
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              O sistema destina-se exclusivamente a fins de estudo, pesquisa e análise quantitativa.
              Nenhum dado, indicador, modelo ou veredito apresentado constitui recomendação de compra, venda ou execução de ativos e valores mobiliários.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono shrink-0">
          <span className="flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Radar de Estudos B3</span>
          </span>
          <span>•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
};
