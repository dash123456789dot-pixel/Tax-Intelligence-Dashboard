const fs = require('fs');

const htmlFile = 'layer1_india.html'; // Root file which is up to date
const jsxFile = 'wising-frontend/src/Layer 1 Ind & US/Layer1India.jsx';

let htmlContent = fs.readFileSync(htmlFile, 'utf8');
let jsxContent = fs.readFileSync(jsxFile, 'utf8');

// Helper to extract a function body based on its name
function extractFunction(content, funcName) {
    const regex = new RegExp(`function \\s*${funcName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    const match = regex.exec(content);
    if (!match) return null;

    let startIndex = match.index;
    let braceCount = 0;
    let endIndex = startIndex;
    let foundFirstBrace = false;

    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            foundFirstBrace = true;
        } else if (content[i] === '}') {
            braceCount--;
        }

        if (foundFirstBrace && braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }

    return content.substring(startIndex, endIndex);
}

// 1. syncExpensesWarning
const newSync = extractFunction(htmlContent, 'syncExpensesWarning');
const oldSync = extractFunction(jsxContent, 'syncExpensesWarning');
if (newSync && oldSync) {
    jsxContent = jsxContent.replace(oldSync, newSync);
    console.log('Replaced syncExpensesWarning');
}

// 2. validateS44ADAEligibility
const newValidate = extractFunction(htmlContent, 'validateS44ADAEligibility');
const oldValidate = extractFunction(jsxContent, 'validateS44ADAEligibility');
if (newValidate && oldValidate) {
    jsxContent = jsxContent.replace(oldValidate, newValidate);
    console.log('Replaced validateS44ADAEligibility');
}

// 3. renderBusinessEntries
const newRender = extractFunction(htmlContent, 'renderBusinessEntries');
const oldRender = extractFunction(jsxContent, 'renderBusinessEntries');
if (newRender && oldRender) {
    // Replace backticks with escaped backticks since it's going inside a template literal
    let safeRender = newRender.replace(/\\`/g, '\\`'); // escape backticks
    jsxContent = jsxContent.replace(oldRender, safeRender);
    console.log('Replaced renderBusinessEntries');
}

// 4. evaluateSurchargeBuckets - this one might have the hasS44AE check added.
const newSurcharge = extractFunction(htmlContent, 'evaluateSurchargeBuckets');
const oldSurcharge = extractFunction(jsxContent, 'evaluateSurchargeBuckets');
if (newSurcharge && oldSurcharge) {
    jsxContent = jsxContent.replace(oldSurcharge, newSurcharge);
    console.log('Replaced evaluateSurchargeBuckets');
}

fs.writeFileSync(jsxFile, jsxContent, 'utf8');
console.log('Successfully updated JS logic for Step 2a');
