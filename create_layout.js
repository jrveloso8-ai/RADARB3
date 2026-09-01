const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

const layout = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RADAR TASTYTRADE PRO IA - Terminal Quantitativo de Opções e Ações US',
  description: 'Sistema profissional de análise quantitativa de opções, Gamma Exposure (GEX) e cotações da bolsa americana integrado à Tastytrade Open API.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen flex flex-col bg-[#070b14] text-gray-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
`;

const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #070b14;
  --foreground: #f3f4f6;
}

body {
  background-color: #070b14;
  color: #f3f4f6;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #090e18;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1f293d;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #374151;
}
`;

fs.writeFileSync(path.join(targetBase, 'src/app/layout.tsx'), layout, 'utf8');
fs.writeFileSync(path.join(targetBase, 'src/app/globals.css'), globalsCss, 'utf8');
console.log('layout.tsx and globals.css written');
