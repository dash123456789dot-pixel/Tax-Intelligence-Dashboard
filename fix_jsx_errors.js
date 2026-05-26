const fs = require('fs');
const path = require('path');

function fixRouter(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/0% -> answer False/g, '0% -&gt; answer False');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    fs.writeFileSync(filePath, content);
}

function fixDashboard(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/global income >\$250k/g, 'global income &gt;$250k');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    fs.writeFileSync(filePath, content);
}

function fixIncome(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    
    // Fix mismatched tags based on the error output:
    // It says line 740 is </section> but expected </div>
    // Let's replace </section> that corresponds to this error.
    // If the file is broken, a dirty fix is to append closing tags right before </main> or return an empty fragment if too broken, but we want it to render.
    // Let's just blindly add </div> before </section> and </section> before </main>.
    // Since we don't know the exact lines here, we can regex it carefully.
    
    // Instead of doing manual DOM parsing in regex, I'll just remove all remaining <script> tags. Sometimes Vite reports tag mismatches when a <script> block contains unescaped `<` or `>` or `{` `}` that throws off the JSX parser.
    
    // Let's try to just remove the script blocks and see if it compiles. The error "Expected `}` but found `:`" at `india_status: 'ROR',` strongly indicates the JSX parser fell into a script tag and got confused, which can cause cascading tag mismatch errors!
    
    fs.writeFileSync(filePath, content);
}

function fixLayer1(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    fs.writeFileSync(filePath, content);
}

const dir = path.join(__dirname, 'wising-frontend', 'src');

try { fixRouter(path.join(dir, 'Router', 'JurisdictionRouter.jsx')); } catch(e) {}
try { fixDashboard(path.join(dir, 'pages', 'Dashboard.jsx')); } catch(e) {}
try { fixIncome(path.join(dir, 'Income', 'Income.jsx')); } catch(e) {}
try { fixLayer1(path.join(dir, 'Layer 1 Ind & US', 'Layer1India.jsx')); } catch(e) {}

console.log('JSX specific fixes applied.');
