const fs = require('fs');
const path = require('path');
const HTMLtoJSX = require('html-to-jsx');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const converter = new HTMLtoJSX({
    createClass: false,
});

function convertFile(htmlFile, jsxFile, componentName) {
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Parse the HTML
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Remove scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    
    // Get the body content or specific main container
    let bodyHtml = document.body.innerHTML;
    
    // Fix common unescaped entities that JSDOM might leave
    bodyHtml = bodyHtml.replace(/0% -> answer False/g, '0% -&gt; answer False');
    bodyHtml = bodyHtml.replace(/global income >\$250k/g, 'global income &gt;$250k');
    
    // Convert to JSX
    let jsxContent = converter.convert(bodyHtml);
    
    // Ensure all style objects are valid (HTMLtoJSX handles this, but sometimes inline styles have issues)
    
    const finalJsx = `import React from 'react';

export default function ${componentName}() {
    return (
        <>
            ${jsxContent}
        </>
    );
}
`;

    fs.writeFileSync(jsxFile, finalJsx);
    console.log(`Successfully converted ${componentName}`);
}

const baseDir = path.join(__dirname);
const frontDir = path.join(baseDir, 'wising-frontend', 'src');

try {
    convertFile(
        path.join(baseDir, 'layer1_india.html'), 
        path.join(frontDir, 'Layer 1 Ind & US', 'Layer1India.jsx'), 
        'Layer1India'
    );
    
    convertFile(
        path.join(baseDir, 'income.html'), 
        path.join(frontDir, 'Income', 'Income.jsx'), 
        'Income'
    );
    
    convertFile(
        path.join(baseDir, 'router.html'), 
        path.join(frontDir, 'Router', 'JurisdictionRouter.jsx'), 
        'JurisdictionRouter'
    );
    
    convertFile(
        path.join(baseDir, 'index.html'), 
        path.join(frontDir, 'pages', 'Dashboard.jsx'), 
        'Dashboard'
    );
} catch (e) {
    console.error('Error during conversion:', e);
}
