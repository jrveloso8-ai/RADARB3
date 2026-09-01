const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';

let content = fs.readFileSync(target, 'utf8');

// Replace top declaration cleanly
content = content.replace(
`interface QuoteViewProps {
  initialSymbol?: string;
  symbol?: string;
  onNavigateToGex?: (sym: string) => void;
  handleNavGex?: (sym: string) => void;
}

export function QuoteView({ initialSymbol, symbol: propSymbol, onNavigateToGex, handleNavGex }: QuoteViewProps) {
  const symbol = initialSymbol || propSymbol || 'NVDA';
  const handleNavGex = onNavigateToGex || handleNavGex;`,
`interface QuoteViewProps {
  initialSymbol?: string;
  symbol?: string;
  onNavigateToGex?: (sym: string) => void;
  onNavigateToBarreiras?: (sym: string) => void;
}

export function QuoteView({ initialSymbol, symbol: propSymbol, onNavigateToGex, onNavigateToBarreiras }: QuoteViewProps) {
  const symbol = initialSymbol || propSymbol || 'NVDA';
  const navGexFn = onNavigateToGex || onNavigateToBarreiras;`
);

content = content.replace(/handleNavGex\(/g, 'navGexFn(');
content = content.replace(/handleNavGex &&/g, 'navGexFn &&');

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed variable names in QuoteView.tsx');
