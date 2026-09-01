const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/quote/QuoteView.tsx';

let content = fs.readFileSync(target, 'utf8');

// Replace import to include generateCandlesticks
content = content.replace(
  `import { US_STOCKS_DATASET, USStockItem } from '@/lib/domain/us-market-data';`,
  `import { US_STOCKS_DATASET, USStockItem, generateCandlesticks } from '@/lib/domain/us-market-data';`
);

// Add candles memo
content = content.replace(
  `  const electedStrategy: ElectedStrategyData = useMemo(() => {`,
  `  const candles = useMemo(() => {
    return generateCandlesticks(currentStock.symbol, currentStock.spot, 90);
  }, [currentStock.symbol, currentStock.spot]);

  const electedStrategy: ElectedStrategyData = useMemo(() => {`
);

// Fix CandlestickChart component call
content = content.replace(
  `<CandlestickChart symbol={currentStock.symbol} currentSpot={currentStock.spot} />`,
  `<CandlestickChart candles={candles} spotPrice={currentStock.spot} />`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed CandlestickChart invocation in QuoteView.tsx');
