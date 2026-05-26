const fs = require('fs');
const path = require('path');

const jsxFile = path.join(__dirname, 'wising-frontend', 'src', 'Router', 'JurisdictionRouter.jsx');
let content = fs.readFileSync(jsxFile, 'utf8');

content = content.replace(/layer1_india\.html/g, '/layer1-india');
content = content.replace(/income\.html/g, '/income');
content = content.replace(/router\.html/g, '/router');
content = content.replace(/index\.html/g, '/');

fs.writeFileSync(jsxFile, content);
console.log("Updated URLs in JurisdictionRouter.jsx to match React Router paths.");
