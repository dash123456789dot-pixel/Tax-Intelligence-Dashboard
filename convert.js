const fs = require('fs');
const path = require('path');

function convertHtmlToJsx(htmlContent, componentName) {
    // Basic JSX conversions
    let jsx = htmlContent
        .replace(/class=/g, 'className=')
        .replace(/for=/g, 'htmlFor=')
        .replace(/onclick=/g, 'onClick=')
        .replace(/onchange=/g, 'onChange=')
        .replace(/onsubmit=/g, 'onSubmit=')
        .replace(/<!--[\s\S]*?-->/g, ''); // remove comments

    // Self-close tags like <input>, <br>, <hr>, <img>, <meta>, <link>, <circle>, <path>, <rect>, <polyline>, <line>
    const voidElements = ['input', 'br', 'hr', 'img', 'meta', 'link', 'circle', 'path', 'rect', 'polyline', 'line', 'polygon'];
    voidElements.forEach(tag => {
        const regex = new RegExp(`<${tag}\\b([^>]*?)(?<!/)>`, 'gi');
        jsx = jsx.replace(regex, `<${tag}$1 />`);
    });

    // Remove the Universal Navigation Bar part (approximate)
    // We look for <header>...</header> and remove it.
    jsx = jsx.replace(/<header[\s\S]*?<\/header>/gi, '');

    // Convert inline styles to objects (very naive approach, mostly works if styles are simple or we can just remove them for now, but let's try a regex)
    jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
        const styleObj = {};
        styleString.split(';').forEach(rule => {
            if (!rule.trim()) return;
            let [key, value] = rule.split(':');
            if(key && value) {
                key = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                styleObj[key] = value.trim();
            }
        });
        return `style={${JSON.stringify(styleObj)}}`;
    });

    // Handle SVG specific attributes that React warns about
    jsx = jsx.replace(/viewbox/gi, 'viewBox');
    jsx = jsx.replace(/stroke-width/gi, 'strokeWidth');
    jsx = jsx.replace(/stroke-linecap/gi, 'strokeLinecap');
    jsx = jsx.replace(/stroke-linejoin/gi, 'strokeLinejoin');
    jsx = jsx.replace(/stroke-dasharray/gi, 'strokeDasharray');
    jsx = jsx.replace(/stroke-dashoffset/gi, 'strokeDashoffset');
    jsx = jsx.replace(/clip-path/gi, 'clipPath');
    jsx = jsx.replace(/fill-rule/gi, 'fillRule');
    jsx = jsx.replace(/clip-rule/gi, 'clipRule');

    // Extract the body content
    const bodyMatch = jsx.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let contentToReturn = bodyMatch ? bodyMatch[1] : jsx;

    // Wrap in component
    return `import React from 'react';\n\nconst ${componentName} = () => {\n  return (\n    <>\n      ${contentToReturn}\n    </>\n  );\n};\n\nexport default ${componentName};\n`;
}

const filesToConvert = [
    { src: 'index.html', dest: 'wising-frontend/src/pages/Dashboard.jsx', name: 'Dashboard' },
    { src: 'layer1_india.html', dest: 'wising-frontend/src/Layer 1 Ind & US/Layer1India.jsx', name: 'Layer1India' },
    { src: 'income.html', dest: 'wising-frontend/src/Income/Income.jsx', name: 'Income' },
    { src: 'router.html', dest: 'wising-frontend/src/Router/JurisdictionRouter.jsx', name: 'JurisdictionRouter' }
];

filesToConvert.forEach(({ src, dest, name }) => {
    const srcPath = path.join(__dirname, src);
    const destPath = path.join(__dirname, dest);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(srcPath)) {
        const htmlContent = fs.readFileSync(srcPath, 'utf8');
        const jsxContent = convertHtmlToJsx(htmlContent, name);
        fs.writeFileSync(destPath, jsxContent);
        console.log(`Converted ${src} to ${dest}`);
    } else {
        console.log(`Source file ${src} not found.`);
    }
});
