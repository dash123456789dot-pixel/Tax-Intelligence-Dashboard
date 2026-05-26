const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'wising-frontend', 'src');

let incomePath = path.join(dir, 'Income', 'Income.jsx');
let incomeLines = fs.readFileSync(incomePath, 'utf8').split('\n');

// Income.jsx fixes
// Line 83 (index 82) is </section>. Change to </main>
if (incomeLines[82].includes('</section>')) incomeLines[82] = incomeLines[82].replace('</section>', '</main>');
// Line 740 (index 739) is </div>. Change to </section>
if (incomeLines[739].includes('</div>')) incomeLines[739] = incomeLines[739].replace('</div>', '</section>');
// Line 977 (index 976) is </section>. Change to </main>
if (incomeLines[976].includes('</section>')) incomeLines[976] = incomeLines[976].replace('</section>', '</main>');
// Line 978 (index 977) is </main>. Change to </>
if (incomeLines[977].includes('</main>')) incomeLines[977] = incomeLines[977].replace('</main>', '</>');

fs.writeFileSync(incomePath, incomeLines.join('\n'));

let layer1Path = path.join(dir, 'Layer 1 Ind & US', 'Layer1India.jsx');
let layer1Lines = fs.readFileSync(layer1Path, 'utf8').split('\n');

// Layer1India fixes
// Line 1374 (index 1373) is </main>. Change to </>
if (layer1Lines[1373].includes('</main>')) layer1Lines[1373] = layer1Lines[1373].replace('</main>', '</>');
// Check for Line 860: `</div>` instead of `</section>`. Wait, Layer1India error 860 was already there before my script?
// Let's replace </section> to </div> or whatever matches.
// Earlier error: Expected `</section>` at 860:11. It was `</div>`.
if (layer1Lines[859].includes('</div>')) layer1Lines[859] = layer1Lines[859].replace('</div>', '</section>');
// Earlier error: Expected `</main>` at 1297:7. It was `</section>`.
if (layer1Lines[1296].includes('</section>')) layer1Lines[1296] = layer1Lines[1296].replace('</section>', '</main>');

fs.writeFileSync(layer1Path, layer1Lines.join('\n'));

console.log("Fixed files by line numbers.");
