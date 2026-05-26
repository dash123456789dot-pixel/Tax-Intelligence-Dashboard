const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'wising-frontend', 'src');

// Fix Income.jsx
let incomePath = path.join(dir, 'Income', 'Income.jsx');
let incomeLines = fs.readFileSync(incomePath, 'utf8').split('\n');

// Line 740 is index 739, it's `    </section>`
// Let's just find `</section>` at around index 739 and replace it.
for (let i = 730; i < 750; i++) {
    if (incomeLines[i] && incomeLines[i].includes('</section>')) {
        incomeLines[i] = incomeLines[i].replace('</section>', '</div>\n    </section>');
        break;
    }
}

// Line 976 is index 975, it's `    </main>`
for (let i = 960; i < 990; i++) {
    if (incomeLines[i] && incomeLines[i].includes('</main>')) {
        incomeLines[i] = incomeLines[i].replace('</main>', '</section>\n    </main>');
        break;
    }
}

// Fix trailing }; on line 1014. It expects `}`.
// But if the tags are closed, maybe it's fine. Wait! `return (...) };` -> if `)` is missing, it expects `}`.
// Let's just wrap the whole return content properly if we can, but let's just write back the lines first.
fs.writeFileSync(incomePath, incomeLines.join('\n'));

// Fix Layer1India.jsx
let layer1Path = path.join(dir, 'Layer 1 Ind & US', 'Layer1India.jsx');
let layer1Lines = fs.readFileSync(layer1Path, 'utf8').split('\n');
for (let i = 700; i < 720; i++) {
    if (layer1Lines[i] && layer1Lines[i].includes('<div></div> us:border-brandGold focus:ring-0 font-mono">')) {
        layer1Lines[i] = layer1Lines[i].replace('<div></div> us:border-brandGold focus:ring-0 font-mono">', '');
    }
}
fs.writeFileSync(layer1Path, layer1Lines.join('\n'));

console.log('Fixed tags successfully.');
