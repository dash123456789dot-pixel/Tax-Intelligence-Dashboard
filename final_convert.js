const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname);
const frontDir = path.join(baseDir, 'wising-frontend', 'src');

function convertToDangerously(htmlFile, jsxFile, componentName) {
    if (!fs.existsSync(htmlFile)) return;
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Extract body content roughly
    let bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyHtml = bodyMatch ? bodyMatch[1] : htmlContent;
    
    // Strip script tags
    bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
    
    // We stringify the HTML so it's a perfectly safe JavaScript string
    const safeHtmlString = JSON.stringify(bodyHtml);
    
    const finalJsx = `import React from 'react';

export default function ${componentName}() {
    return (
        <div dangerouslySetInnerHTML={{ __html: ${safeHtmlString} }} />
    );
}
`;

    fs.writeFileSync(jsxFile, finalJsx);
    console.log(`Successfully converted ${componentName}`);
}

try {
    convertToDangerously(
        path.join(baseDir, 'Project Update', 'layer1_india.html'), 
        path.join(frontDir, 'Layer 1 Ind & US', 'Layer1India.jsx'), 
        'Layer1India'
    );
    
    convertToDangerously(
        path.join(baseDir, 'Project Update', 'income.html'), 
        path.join(frontDir, 'Income', 'Income.jsx'), 
        'Income'
    );
    
    convertToDangerously(
        path.join(baseDir, 'Project Update', 'router.html'), 
        path.join(frontDir, 'Router', 'JurisdictionRouter.jsx'), 
        'JurisdictionRouter'
    );
    
    convertToDangerously(
        path.join(baseDir, 'Project Update', 'index.html'), 
        path.join(frontDir, 'pages', 'Dashboard.jsx'), 
        'Dashboard'
    );
} catch (e) {
    console.error('Error during conversion:', e);
}
