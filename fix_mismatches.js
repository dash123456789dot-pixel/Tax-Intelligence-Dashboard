const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'wising-frontend', 'src');

function fixTags() {
    let incomePath = path.join(dir, 'Income', 'Income.jsx');
    let income = fs.readFileSync(incomePath, 'utf8');
    
    // In Income.jsx, opening div is mismatched with </section>. We can just replace the opening to match the closing.
    income = income.replace('<div className="col-span-12 glass-card p-10 flex flex-col border-white/5 relative">', '<section className="col-span-12 glass-card p-10 flex flex-col border-white/5 relative">');
    income = income.replace('<section className="grid grid-cols-12 gap-8">', '<main className="grid grid-cols-12 gap-8">');
    // Strip script blocks just in case any remained
    income = income.replace(/<script[\s\S]*?<\/script>/gi, '');
    fs.writeFileSync(incomePath, income);

    let layer1Path = path.join(dir, 'Layer 1 Ind & US', 'Layer1India.jsx');
    let layer1 = fs.readFileSync(layer1Path, 'utf8');
    
    // Layer1India opening <section className="flex-1 flex flex-col gap-6"> has closing </div> at 860.
    layer1 = layer1.replace('<section className="flex-1 flex flex-col gap-6">', '<div className="flex-1 flex flex-col gap-6">');
    
    // <main className="..."> has closing </section> at 1297
    layer1 = layer1.replace('<main className="max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">', '<section className="max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">');
    
    // And there's a fragment <> that has closing </main> at 1369. We can just replace the opening fragment with <main>
    layer1 = layer1.replace('<>', '<main>');
    layer1 = layer1.replace('</>', '</main>'); // And if there is any </> remaining, close the main.
    
    // Unterminated regular expression fix: remove script blocks completely
    layer1 = layer1.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Replace remaining </div></section></main> mismatches
    
    fs.writeFileSync(layer1Path, layer1);
}

fixTags();
console.log('Fixed tags by aligning openings to closings.');
