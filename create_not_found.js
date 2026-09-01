const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/app/not-found.tsx';

const notFoundCode = `import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold font-mono text-cyan-400">Página Não Encontrada (404)</h2>
      <p className="text-xs text-gray-400 mt-2">O recurso solicitado não existe no Radar Tastytrade.</p>
      <Link
        href="/"
        className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-mono font-bold transition text-white"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
`;

fs.writeFileSync(target, notFoundCode.trim(), 'utf8');
console.log('Created not-found.tsx');
