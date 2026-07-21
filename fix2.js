const fs = require('fs');
const files = [
  'src/components/layer1india/CapitalGainsStep.tsx',
  'src/components/layer1india/BusinessStep.tsx',
  'src/components/layer1india/HousePropertyStep.tsx',
  'src/components/layer1india/SalaryStep.tsx',
  'src/components/layer1india/ResidencySolverStep.tsx',
  'src/components/layer1india/FinancialSnapshotStep.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add [color-scheme:dark] to all <select> elements
    content = content.replace(/<select([^>]*?)className=["']([^"']*)["']/g, (match, p1, p2) => {
      if (!p2.includes('[color-scheme:dark]')) {
        return `<select${p1}className="${p2} [color-scheme:dark]"`;
      }
      return match;
    });

    // Add [color-scheme:dark] to all <input type="date"> elements
    content = content.replace(/<input([^>]*?)className=["']([^"']*)["']/g, (match, p1, p2) => {
      if (p1.includes('type="date"') || match.includes('type="date"')) {
        if (!p2.includes('[color-scheme:dark]')) {
          return `<input${p1}className="${p2} [color-scheme:dark]"`;
        }
      }
      return match;
    });

    fs.writeFileSync(file, content);
  }
}
console.log('Fixed all selects and date inputs.');
