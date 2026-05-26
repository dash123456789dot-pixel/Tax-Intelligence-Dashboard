const fs = require('fs');
const path = require('path');

// 1. Update App.jsx to redirect / to /router
const appFile = path.join(__dirname, 'wising-frontend', 'src', 'App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');

// Ensure Navigate is imported
if (!appContent.includes('Navigate')) {
    appContent = appContent.replace('import { BrowserRouter as Router, Routes, Route } from \'react-router-dom\';', 'import { BrowserRouter as Router, Routes, Route, Navigate } from \'react-router-dom\';');
}

appContent = appContent.replace('<Route path="/" element={<Dashboard />} />', '<Route path="/" element={<Navigate to="/router" replace />} />\n          <Route path="/dashboard" element={<Dashboard />} />');

fs.writeFileSync(appFile, appContent);
console.log("Updated App.jsx routing.");

// 2. Update JurisdictionRouter.jsx buttons
const routerFile = path.join(__dirname, 'wising-frontend', 'src', 'Router', 'JurisdictionRouter.jsx');
let routerContent = fs.readFileSync(routerFile, 'utf8');
routerContent = routerContent.replace('Open Tax Intelligence (India)', 'Proceed');
fs.writeFileSync(routerFile, routerContent);
console.log("Updated JurisdictionRouter.jsx buttons.");

// 3. Update Layer1India.jsx wording
const layer1File = path.join(__dirname, 'wising-frontend', 'src', 'Layer 1 Ind & US', 'Layer1India.jsx');
let layer1Content = fs.readFileSync(layer1File, 'utf8');
layer1Content = layer1Content.replace('<span>1. Profile &amp; Residency</span>', '<span>Step 1 - Profile &amp; Residency</span>');
layer1Content = layer1Content.replace('<span>1. Profile & Residency</span>', '<span>Step 1 - Profile & Residency</span>');

// Replace the specific "Proceed" button at the end of Step 1
// It looks like: <span>Proceed</span>\r\n                    <span>→</span>
layer1Content = layer1Content.replace(/<span>Proceed<\/span>(\s*<span>→<\/span>)/g, '<span>Next</span>$1');

fs.writeFileSync(layer1File, layer1Content);
console.log("Updated Layer1India.jsx wording.");

// Let's also debug prefillPersona
// Instead of complex logic, I will inject a wrapper inside the script
// If `prefillPersona` is failing, it's likely because some DOM elements are missing or state wasn't updated right.
// Since the script runs correctly, let's add a console.log inside prefillPersona to see if it's called.
let scriptFix = `window.prefillPersona = function(type) {
    console.log("Running prefillPersona for", type);
    try {
        prefillPersona(type);
        evaluateResidency(); // force update
    } catch(e) {
        console.error("prefill error:", e);
    }
};`;
// I will append this to the script block in Layer1India.jsx
if (!layer1Content.includes('window.prefillPersona = function(type)')) {
    layer1Content = layer1Content.replace('            `;', '\n' + scriptFix + '\n            `;');
    fs.writeFileSync(layer1File, layer1Content);
    console.log("Patched prefillPersona error handling.");
}
