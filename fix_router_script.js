const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'Project Update', 'router.html');
const jsxPath = path.join(__dirname, 'wising-frontend', 'src', 'Router', 'JurisdictionRouter.jsx');

if (!fs.existsSync(htmlPath) || !fs.existsSync(jsxPath)) {
    console.error("Files not found");
    process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract the script
const scriptTags = htmlContent.match(/<script>[\s\S]*?<\/script>/g);
let logicScript = '';
for (const tag of scriptTags) {
    if (tag.includes('state') || tag.includes('activeStep')) {
        logicScript = tag.replace('<script>', '').replace('</script>', '').trim();
        break;
    }
}

if (!logicScript) {
    console.error("Could not find logic script in router.html");
    process.exit(1);
}

// Convert global let/const to var so they don't crash on remount
logicScript = logicScript.replace(/const state = /g, 'window.router_state = window.router_state || ');
logicScript = logicScript.replace(/state\./g, 'window.router_state.');
logicScript = logicScript.replace(/let activeStep = /g, 'var activeStep = ');

// Replace window.onload declaration to run immediately instead of waiting for onload event
logicScript = logicScript.replace('window.onload = function() {', 'function initOnload() {');

// Call initOnload() immediately after the block ends
logicScript = logicScript + '\ninitOnload();\n';

let jsxContent = fs.readFileSync(jsxPath, 'utf8');

if (!jsxContent.includes('useEffect')) {
    const importStatement = `import React, { useEffect } from 'react';\n`;
    jsxContent = jsxContent.replace(`import React from 'react';`, importStatement);

    const useEffectCode = `
    useEffect(() => {
        const scriptId = 'router-logic';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.innerHTML = \`(function() {
${logicScript.replace(/`/g, '\\`').replace(/\$/g, '\\$')}
})();\`;
            document.body.appendChild(script);
        }

        return () => {
            const script = document.getElementById('router-logic');
            if (script) script.remove();
        };
    }, []);
`;

    jsxContent = jsxContent.replace(`export default function JurisdictionRouter() {`, `export default function JurisdictionRouter() {${useEffectCode}`);
    fs.writeFileSync(jsxPath, jsxContent);
    console.log("Successfully injected the router script into JurisdictionRouter.jsx");
} else {
    console.log("useEffect already present in JurisdictionRouter");
}
