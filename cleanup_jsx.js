const fs = require('fs');
const path = require('path');

function cleanJsxFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix the self-closing tags that were incorrectly paired with closing tags
    const badClosings = ['circle', 'path', 'rect', 'polyline', 'line', 'polygon'];
    badClosings.forEach(tag => {
        const regex = new RegExp(`/><\\/${tag}>`, 'g');
        content = content.replace(regex, '/>');
    });

    // Fix unescaped > and < in text
    // Replace " > " with " &gt; "
    content = content.replace(/ > /g, ' &gt; ');
    // " >0 " -> " &gt; 0"
    content = content.replace(/ >0/g, ' &gt; 0');
    // "<14" -> "&lt;14"
    content = content.replace(/<14/g, '&lt;14');
    
    // Also fix the case in JurisdictionRouter.jsx
    content = content.replace(/india_days > 0/g, 'india_days &gt; 0');

    // Remove empty class attributes
    content = content.replace(/className=""/g, '');

    fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            cleanJsxFile(fullPath);
        }
    });
}

walkDir(path.join(__dirname, 'wising-frontend', 'src'));
console.log('JSX cleanup complete.');
