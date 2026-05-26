const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'Project Update', 'layer1_india.html');
const jsxPath = path.join(__dirname, 'wising-frontend', 'src', 'Layer 1 Ind & US', 'Layer1India.jsx');

if (!fs.existsSync(htmlPath) || !fs.existsSync(jsxPath)) {
    console.error("Files not found");
    process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract the script
const scriptTags = htmlContent.match(/<script>[\s\S]*?<\/script>/g);
let logicScript = '';
for (const tag of scriptTags) {
    if (tag.includes('WIZARD WIDE JAVASCRIPT STATE ENGINE') || tag.includes('const state = {') || tag.includes('evaluateResidency')) {
        logicScript = tag.replace('<script>', '').replace('</script>', '').trim();
        break;
    }
}

if (!logicScript) {
    console.error("Could not find logic script in layer1_india.html");
    process.exit(1);
}

// Extract functions to export to window
// Because there are many, we can use regex to find all function declarations
const functionMatches = logicScript.match(/function\s+([a-zA-Z0-9_]+)\s*\(/g);
let exportStatements = '\n// Exporting functions to window for onclick handlers\n';
if (functionMatches) {
    for (const match of functionMatches) {
        const fnName = match.replace('function', '').replace('(', '').trim();
        exportStatements += `window.${fnName} = ${fnName};\n`;
    }
}
logicScript += exportStatements;

// Convert global let/const to var so they don't crash on remount
logicScript = logicScript.replace(/const state = /g, 'window.layer1_state = window.layer1_state || ');
logicScript = logicScript.replace(/state\./g, 'window.layer1_state.');
logicScript = logicScript.replace(/let activeStep = /g, 'var activeStep = ');

// Replace window.onload declaration to run immediately instead of waiting for onload event
logicScript = logicScript.replace('window.onload = function() {', 'function initOnload() {');

// Call initOnload() immediately after the block ends (using the unique ending pattern as an anchor)
logicScript += '\ninitOnload();\n';

// Redirect to /router instead of router.html in SPA mode
logicScript = logicScript.replace("window.location.href = 'router.html';", "window.location.href = '/router';");

let jsxContent = fs.readFileSync(jsxPath, 'utf8');

if (!jsxContent.includes('useEffect')) {
    const importStatement = `import React, { useEffect } from 'react';\n`;
    jsxContent = jsxContent.replace(`import React from 'react';`, importStatement);

    const useEffectCode = `
    useEffect(() => {
        const scriptId = 'layer1-india-logic';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.innerHTML = \`(function() {
${logicScript.replace(/`/g, '\\`').replace(/\$/g, '\\$')}
})();\`;
            document.body.appendChild(script);
        }

        return () => {
            const script = document.getElementById('layer1-india-logic');
            if (script) script.remove();
        };
    }, []);
`;

    jsxContent = jsxContent.replace(`export default function Layer1India() {`, `export default function Layer1India() {${useEffectCode}`);
    fs.writeFileSync(jsxPath, jsxContent);
    console.log("Successfully injected the Layer 1 India script into Layer1India.jsx");
} else {
    console.log("useEffect already present");
}
