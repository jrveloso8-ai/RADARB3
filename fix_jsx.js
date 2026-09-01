const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/panorama/PanoramaView.tsx';
let content = fs.readFileSync(target, 'utf8');
content = content.replace('<span class="text-amber-400">50 - Neutro</span>', '<span className="text-amber-400">50 - Neutro</span>');
fs.writeFileSync(target, content, 'utf8');
console.log('Fixed JSX attribute in PanoramaView');
