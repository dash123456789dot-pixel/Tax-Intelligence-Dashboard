const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'wising-frontend', 'src', 'pages', 'Dashboard.jsx');

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Using a regex to match the entire <header> ... </header> block
    // We must be careful because regex on HTML can be tricky, but since we know it's <header class="sticky ...">...</header>
    content = content.replace(/<header[\s\S]*?<\/header>/, '');
    fs.writeFileSync(file, content);
    console.log("Removed header from Dashboard.jsx");
} else {
    console.log("Dashboard.jsx not found");
}

// Also let's check Income.jsx and Layer1India.jsx to see if they also have a duplicate header, just in case
const incomeFile = path.join(__dirname, 'wising-frontend', 'src', 'Income', 'Income.jsx');
if (fs.existsSync(incomeFile)) {
    let incomeContent = fs.readFileSync(incomeFile, 'utf8');
    incomeContent = incomeContent.replace(/<header[\s\S]*?<\/header>/, '');
    fs.writeFileSync(incomeFile, incomeContent);
    console.log("Removed header from Income.jsx");
}

const layer1File = path.join(__dirname, 'wising-frontend', 'src', 'Layer 1 Ind & US', 'Layer1India.jsx');
if (fs.existsSync(layer1File)) {
    let layer1Content = fs.readFileSync(layer1File, 'utf8');
    layer1Content = layer1Content.replace(/<header[\s\S]*?<\/header>/, '');
    fs.writeFileSync(layer1File, layer1Content);
    console.log("Removed header from Layer1India.jsx");
}

const routerFile = path.join(__dirname, 'wising-frontend', 'src', 'Router', 'JurisdictionRouter.jsx');
if (fs.existsSync(routerFile)) {
    let routerContent = fs.readFileSync(routerFile, 'utf8');
    routerContent = routerContent.replace(/<header[\s\S]*?<\/header>/, '');
    fs.writeFileSync(routerFile, routerContent);
    console.log("Removed header from JurisdictionRouter.jsx");
}
