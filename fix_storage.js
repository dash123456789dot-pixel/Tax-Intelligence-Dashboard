const fs = require('fs');
const path = require('path');

const routerFile = path.join(__dirname, 'wising-frontend', 'src', 'Router', 'JurisdictionRouter.jsx');
let routerContent = fs.readFileSync(routerFile, 'utf8');

// Replace the routerState initialization
const oldRouterStateInit = `const routerState = {
        // Inputs
        is_indian_citizen: null,
        is_pio_or_oci: null,
        india_days: null,
        has_india_source_income_or_assets: null,
        is_us_citizen: null,
        has_green_card: null,
        was_in_us_this_year: null,
        us_days: null,
        has_us_source_income_or_assets: null,
        liable_to_tax_in_another_country: null,
        left_india_for_employment_this_year: null,

        // Derived Outputs
        india_flag: false,
        us_flag: false,
        jurisdiction: "none"
    };`;

const newRouterStateInit = `let savedState = localStorage.getItem('wising_router_state');
    let routerState = savedState ? JSON.parse(savedState) : {
        is_indian_citizen: null,
        is_pio_or_oci: null,
        india_days: null,
        has_india_source_income_or_assets: null,
        is_us_citizen: null,
        has_green_card: null,
        was_in_us_this_year: null,
        us_days: null,
        has_us_source_income_or_assets: null,
        liable_to_tax_in_another_country: null,
        left_india_for_employment_this_year: null,
        india_flag: false,
        us_flag: false,
        jurisdiction: "none"
    };
    
    // Attach to window so event handlers can access it if needed (though it's in scope)
    window.routerState = routerState;`;

// Replace currentQuestionIndex logic in INITIALIZATION to auto-advance
const oldInit = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    evaluateFlags();
    renderQuestionnaireSlide();`;

const newInit = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    evaluateFlags();
    updateActiveQuestionsList();
    if (savedState) {
        // auto advance to first unanswered question
        currentQuestionIndex = 0;
        for(let i=0; i<activeQuestions.length; i++) {
            if (routerState[activeQuestions[i]] !== null) {
                currentQuestionIndex = i + 1;
            } else {
                break;
            }
        }
        if (currentQuestionIndex > activeQuestions.length) {
            currentQuestionIndex = activeQuestions.length;
        }
    }
    renderQuestionnaireSlide();`;

routerContent = routerContent.replace(oldRouterStateInit, newRouterStateInit);
routerContent = routerContent.replace(oldInit, newInit);

// Also replace `const routerState` with `let routerState` just in case, wait I already did.
// BUT I need to replace `const allQuestionIds` to avoid 'Identifier has already been declared' on remount
// Actually, since the script is injected and removed, it's fine, but let's just make it a var or remove the script properly.
// The easiest fix for "Identifier has already been declared" when navigating back and forth is to use IIFE or `var`.
// We can wrap the whole script in an IIFE `(function() { ... })();` but wait, `renderQuestionnaireSlide` and others must be on `window`.
// In my `fix_router_script.js`, I exported them to window! So an IIFE is PERFECT.
// Let's wrap the injected script content in an IIFE.
const scriptStart = 'script.innerHTML = `\\n';
const scriptEnd = '            `;';
// Instead of complex string manipulation, I'll just replace 'const routerState' with 'var routerState' and 'const allQuestionIds' with 'var allQuestionIds' and 'let activeQuestions' with 'var activeQuestions'
routerContent = routerContent.replace(/const allQuestionIds/g, 'var allQuestionIds');
routerContent = routerContent.replace(/let activeQuestions/g, 'var activeQuestions');
routerContent = routerContent.replace(/let currentQuestionIndex/g, 'var currentQuestionIndex');

fs.writeFileSync(routerFile, routerContent);
console.log("Updated JurisdictionRouter.jsx state preservation.");

process.exit(0);

// Now update Layer1India.jsx
const layer1File = path.join(__dirname, 'wising-frontend', 'src', 'Layer 1 Ind & US', 'Layer1India.jsx');
let layer1Content = fs.readFileSync(layer1File, 'utf8');

// I need to find the INITIALIZATION section in Layer1India.jsx script
const layer1InitHook = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {`;
    
const layer1NewInit = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    // Try to load router state first
    const rStateStr = localStorage.getItem('wising_router_state');
    if (rStateStr) {
        try {
            const rState = JSON.parse(rStateStr);
            if (rState.is_indian_citizen !== null) state.residency.is_indian_citizen = rState.is_indian_citizen;
            if (rState.india_days !== null) state.residency.current_year_india_days = rState.india_days;
            if (rState.left_india_for_employment_this_year !== null) state.residency.employment_or_crew_status = rState.left_india_for_employment_this_year;
            if (rState.is_pio_or_oci !== null) state.residency.is_pio = rState.is_pio_or_oci;
            if (rState.has_india_source_income_or_assets !== null) {
                // Not mapped directly, but could be used
            }
        } catch (e) {
            console.error(e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {`;

if (layer1Content.includes(layer1InitHook)) {
    layer1Content = layer1Content.replace(layer1InitHook, layer1NewInit);
    fs.writeFileSync(layer1File, layer1Content);
    console.log("Updated Layer1India.jsx state preservation (DOMContentLoaded).");
} else {
    // If we're inside React, DOMContentLoaded might not fire or the script doesn't have it.
    // Let's check what INITIALIZATION looks like in layer1_india.html
    const fallbackInitHook = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    evaluateResidency();`;
    
    const fallbackNewInit = `    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    // Try to load router state first
    const rStateStr = localStorage.getItem('wising_router_state');
    if (rStateStr) {
        try {
            const rState = JSON.parse(rStateStr);
            if (rState.is_indian_citizen !== null) state.residency.is_indian_citizen = rState.is_indian_citizen;
            if (rState.india_days !== null) state.residency.current_year_india_days = rState.india_days;
            if (rState.left_india_for_employment_this_year !== null) state.residency.employment_or_crew_status = rState.left_india_for_employment_this_year;
            if (rState.is_pio_or_oci !== null) state.residency.is_pio = rState.is_pio_or_oci;
            
            // Sync UI elements to match state
            const citiSel = document.getElementById('res-citizen');
            if (citiSel) citiSel.value = rState.is_indian_citizen ? 'yes' : 'no';
            
            const daysInput = document.getElementById('res-cy-days');
            if (daysInput && rState.india_days !== null) daysInput.value = rState.india_days;
            
            const empSel = document.getElementById('res-emp-crew');
            if (empSel && rState.left_india_for_employment_this_year !== null) empSel.value = rState.left_india_for_employment_this_year ? 'yes' : 'no';
            
        } catch (e) {
            console.error(e);
        }
    }
    
    evaluateResidency();`;

    if (layer1Content.includes(fallbackInitHook)) {
        layer1Content = layer1Content.replace(fallbackInitHook, fallbackNewInit);
        fs.writeFileSync(layer1File, layer1Content);
        console.log("Updated Layer1India.jsx state preservation (direct eval).");
    } else {
        console.log("Could not find INITIALIZATION hook in Layer1India.jsx");
    }
}
