const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = { randomUUID: () => 'mock-uuid-' + Math.floor(Math.random() * 1000000) };

console.log("=========================================");
console.log("STARTING PROGRAMMATIC FEATURE VERIFICATION");
console.log("=========================================");

// Mocking the DOM and Browser environment
class MockElement {
    constructor(id, tagName = 'div') {
        this._id = id;
        this.tagName = tagName;
        
        if (typeof globalThis.document !== 'undefined' && globalThis.document && globalThis.document.elements) {
            globalThis.document.elements[id] = this;
        }
        this.classList = {
            classes: new Set(),
            add: (c) => this.classList.classes.add(c),
            remove: (c) => this.classList.classes.delete(c),
            toggle: (c, force) => {
                if (force !== undefined) {
                    if (force) this.classList.classes.add(c);
                    else this.classList.classes.delete(c);
                } else {
                    if (this.classList.classes.has(c)) this.classList.classes.delete(c);
                    else this.classList.classes.add(c);
                }
            },
            contains: (c) => this.classList.classes.has(c)
        };
        this.style = {};
        this.value = '';
        this.checked = false;
        this.innerHTML = '';
        this.textContent = '';
        this.disabled = false;
        this._listeners = {};
    }
    
    set id(val) {
        this._id = val;
        if (this._document && this._document.elements) {
            this._document.elements[val] = this;
        }
    }
    get id() {
        return this._id;
    }
    
    get parentElement() {
        if (!this._parent) {
            this._parent = new MockElement(this.id + '-parent', 'div');
        }
        return this._parent;
    }
    
    addEventListener(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    appendChild(child) {
        if (!this.children) this.children = [];
        this.children.push(child);
        if (child) child._parent = this;
        return child;
    }
    
    dispatchEvent(event) {
        const listeners = this._listeners[event.type] || [];
        listeners.forEach(cb => cb(event));
    }
    
    setAttribute(name, value) {
        this[name] = value;
    }
    
    removeAttribute(name) {
        delete this[name];
    }
    
    querySelector(selector) {
        if (!this._queries) this._queries = {};
        if (!this._queries[selector]) {
            const el = new MockElement('query-' + selector);
            this._queries[selector] = el;
            this.appendChild(el);
        }
        return this._queries[selector];
    }
    
    querySelectorAll(selector) {
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            const results = [];
            const traverse = (el) => {
                if (el.children) {
                    el.children.forEach(c => {
                        if (c.classList.contains(className) || (c.className && c.className.split(/\s+/).includes(className))) {
                            results.push(c);
                        }
                        traverse(c);
                    });
                }
            };
            traverse(this);
            return results;
        }
        return [];
    }
}

class MockDocument {
    constructor() {
        this.elements = {};
        this.allElements = [];
        this._listeners = {};
    }
    
    getElementById(id) {
        if (!this.elements[id]) {
            const el = new MockElement(id);
            el._document = this;
            this.elements[id] = el;
            this.allElements.push(el);
        }
        return this.elements[id];
    }
    
    createElement(tagName) {
        const el = new MockElement('created-' + Math.floor(Math.random() * 1000000), tagName);
        el._document = this;
        this.allElements.push(el);
        return el;
    }
    
    querySelectorAll(selector) {
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            return this.allElements.filter(el => 
                el.classList.contains(className) || 
                (el.className && el.className.split(/\s+/).includes(className))
            );
        }
        if (selector === 'section > div') {
            return Object.values(this.elements);
        }
        if (selector === '#sidebar-steps button') {
            return [];
        }
        return [];
    }
    
    querySelector(selector) {
        if (selector.startsWith('#')) {
            return this.getElementById(selector.substring(1));
        }
        return null;
    }
    
    addEventListener(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }
    
    dispatchEvent(event) {
        const listeners = this._listeners[event] || [];
        listeners.forEach(cb => cb());
    }
}

const mockStorage = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, val) {
        this.store[key] = String(val);
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

const mockWindow = {
    location: { href: '' },
    scrollTo: function() {},
    addEventListener: function() {},
    onload: null
};

// Extractor helper
function getScriptCode(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
        const code = match[1].trim();
        if (!code || match[0].includes('src=')) continue;
        scripts.push(code);
    }
    // Return the main script block (usually the second or largest one)
    return scripts[scripts.length - 1];
}

// ----------------------------------------------------
// TEST CASE 1: US Specialist L1 (layer1_us.html)
// ----------------------------------------------------
function testUSSpecialist() {
    console.log("\n--- Testing US Specialist Logic ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    // Set up standard Layer 0 router state
    storage.setItem('wising_router_state', JSON.stringify({
        jurisdiction: 'dual',
        full_name: 'Alex DualResident',
        date_of_birth: '1988-06-15',
        is_us_citizen: false,
        has_green_card: false,
        us_days: 0,
        india_days: 182
    }));
    
    // Set up standard India Specialist L1 state to simulate domestic residency
    storage.setItem('wising_layer1_india_state', JSON.stringify({
        residency_detail: {
            final_india_residency_status: 'ROR'
        },
        dtaa: {
            dtaa_treaty_residence: 'none'
        }
    }));

    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) { console.log("ALERT:", msg); },
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        Number: Number,
        parseInt: parseInt,
        parseFloat: parseFloat,
        Math: Math,
        Date: Date,
        String: String,
        Object: Object,
        Array: Array,
        RegExp: RegExp,
        tailwind: { config: {} }
    };
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.usState = usState; globalThis.evaluateUSResidencyLock = evaluateUSResidencyLock; globalThis.checkDualResidencyConflict = checkDualResidencyConflict; globalThis.onDtaaResidenceChange = onDtaaResidenceChange;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    // Run DOMContentLoaded triggers first
    doc.dispatchEvent('DOMContentLoaded');
    
    // Run page init
    if (sandbox.window.onload) {
        sandbox.window.onload();
    }
    
    console.log("Verified initial name & DOB sync:");
    console.log("  usState.profile.full_name:", sandbox.usState.profile.full_name);
    console.log("  usState.profile.date_of_birth:", sandbox.usState.profile.date_of_birth);
    if (sandbox.usState.profile.full_name !== 'Alex DualResident') {
        throw new Error("Full name not synced from router state");
    }
    
    // Test SPT Calculations
    console.log("\nTesting SPT Calculation summary updates:");
    
    // Scenario A: Stays CY=120, PY1=120, PY2=120 (Weighted = 180, unmet)
    sandbox.usState.us_residency_detail.us_days_current_year = 120;
    sandbox.usState.us_residency_detail.us_days_minus_1_year = 120;
    sandbox.usState.us_residency_detail.us_days_minus_2_years = 120;
    sandbox.evaluateUSResidencyLock();
    
    const weightedA = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const isMetA = sandbox.usState.us_residency_detail.spt_test_met;
    const badgeTextA = doc.getElementById('spt-status-badge').textContent;
    const cyTextA = doc.getElementById('spt-calc-cy').textContent;
    const weightedTextA = doc.getElementById('spt-calc-weighted').textContent;
    
    console.log(`  CY=120, PY1=120, PY2=120: Weighted = ${weightedA}, Met = ${isMetA}, Badge = "${badgeTextA}"`);
    if (weightedA !== 180 || isMetA !== false || !badgeTextA.includes("Not Met")) {
        throw new Error("SPT calculations incorrect for Scenario A");
    }
    if (cyTextA !== '120 days' || weightedTextA !== '180.00') {
        throw new Error("SPT DOM nodes not updated correctly for Scenario A");
    }
    
    // Scenario B: Stays CY=150, PY1=120, PY2=120 (Weighted = 210, met)
    sandbox.usState.us_residency_detail.us_days_current_year = 150;
    sandbox.evaluateUSResidencyLock();
    const weightedB = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const isMetB = sandbox.usState.us_residency_detail.spt_test_met;
    const badgeTextB = doc.getElementById('spt-status-badge').textContent;
    console.log(`  CY=150, PY1=120, PY2=120: Weighted = ${weightedB}, Met = ${isMetB}, Badge = "${badgeTextB}"`);
    if (weightedB !== 210 || isMetB !== true || !badgeTextB.includes("Met")) {
        throw new Error("SPT calculations incorrect for Scenario B");
    }
    
    // Scenario C: Exempt status = 'f_student', prior years < 5 (Stays reset to 0, Exempt active)
    sandbox.usState.us_residency_detail.exempt_individual_status = 'f_student';
    sandbox.usState.us_residency_detail.exempt_prior_years_count = 3;
    sandbox.evaluateUSResidencyLock();
    const weightedC = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const badgeTextC = doc.getElementById('spt-status-badge').textContent;
    console.log(`  With F Student (3 prior years): Weighted = ${weightedC}, Badge = "${badgeTextC}"`);
    if (weightedC !== 0 || !badgeTextC.includes("Active")) {
        throw new Error("SPT exempt status calculations incorrect for Scenario C");
    }
    
    // Scenario D: Exempt status = 'f_student', prior years >= 5, no override (Stays included, limit exceeded)
    sandbox.usState.us_residency_detail.exempt_prior_years_count = 5;
    sandbox.usState.us_residency_detail.exempt_student_closer_conn_exception = false;
    sandbox.evaluateUSResidencyLock();
    const weightedD = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const badgeTextD = doc.getElementById('spt-status-badge').textContent;
    console.log(`  With F Student (5 prior years, no override): Weighted = ${weightedD}, Badge = "${badgeTextD}"`);
    if (weightedD !== 210 || !badgeTextD.includes("Exceeded")) {
        throw new Error("SPT exempt status calculations incorrect for Scenario D");
    }
    
    // Scenario E: Exempt status = 'f_student', prior years >= 5, with override (Stays excluded, Exempt active)
    sandbox.usState.us_residency_detail.exempt_student_closer_conn_exception = true;
    sandbox.evaluateUSResidencyLock();
    const weightedE = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const badgeTextE = doc.getElementById('spt-status-badge').textContent;
    console.log(`  With F Student (5 prior years, override checked): Weighted = ${weightedE}, Badge = "${badgeTextE}"`);
    if (weightedE !== 0 || !badgeTextE.includes("Active")) {
        throw new Error("SPT exempt status calculations incorrect for Scenario E");
    }
    
    // Scenario F: Exempt status = 'j_scholar', prior years >= 2, no override (Stays included, limit exceeded)
    sandbox.usState.us_residency_detail.exempt_individual_status = 'j_scholar';
    sandbox.usState.us_residency_detail.exempt_prior_years_count = 2;
    sandbox.usState.us_residency_detail.exempt_scholar_lookback_exception = false;
    sandbox.evaluateUSResidencyLock();
    const weightedF = sandbox.usState.us_residency_detail.spt_day_count_weighted;
    const badgeTextF = doc.getElementById('spt-status-badge').textContent;
    console.log(`  With J Scholar (2 prior years, no override): Weighted = ${weightedF}, Badge = "${badgeTextF}"`);
    if (weightedF !== 210 || !badgeTextF.includes("Exceeded")) {
        throw new Error("SPT exempt status calculations incorrect for Scenario F");
    }
    
    // Reset exempt status and ensure stays met
    sandbox.usState.us_residency_detail.exempt_individual_status = 'none';
    sandbox.usState.us_residency_detail.exempt_prior_years_count = 0;
    sandbox.usState.us_residency_detail.exempt_student_closer_conn_exception = false;
    sandbox.usState.us_residency_detail.exempt_scholar_lookback_exception = false;
    sandbox.evaluateUSResidencyLock();
    
    // Test DTAA Dual Residency Conflict & Tie-Break Logic
    console.log("\nTesting DTAA Conflict Alert visibility and Tie-break behavior:");
    
    // Check if dual residency alert is visible (US Resident + India Resident)
    sandbox.checkDualResidencyConflict();
    const isAlertHidden = doc.getElementById('dual-residency-alert').classList.contains('hidden');
    console.log("  Dual residency alert hidden:", isAlertHidden);
    if (isAlertHidden) {
        throw new Error("Dual residency alert should be visible but is hidden");
    }
    
    // Select "Tie-Break to India"
    sandbox.onDtaaResidenceChange('india');
    console.log("  Selected Tie-Break to India:");
    console.log("    usState.us_residency_detail.dtaa_treaty_residence:", sandbox.usState.us_residency_detail.dtaa_treaty_residence);
    console.log("    usState.us_residency_detail.final_us_residency_status:", sandbox.usState.us_residency_detail.final_us_residency_status);
    
    if (sandbox.usState.us_residency_detail.final_us_residency_status !== 'NON_RESIDENT_ALIEN') {
        throw new Error("Residency status should update to NON_RESIDENT_ALIEN when tie-breaking to India");
    }
    
    // Verify alert remains visible even after tie-breaking (since domestic residency remains unchanged)
    sandbox.checkDualResidencyConflict();
    const isAlertHiddenPostTie = doc.getElementById('dual-residency-alert').classList.contains('hidden');
    console.log("  Dual residency alert hidden post tie-break:", isAlertHiddenPostTie);
    if (isAlertHiddenPostTie) {
        throw new Error("Dual residency alert should remain visible post tie-break, but it was hidden!");
    }
    
    // Check cross-page sync saved to localStorage
    const savedIndiaState = JSON.parse(storage.getItem('wising_layer1_india_state'));
    console.log("  Synced to India state dtaa_treaty_residence:", savedIndiaState?.dtaa?.dtaa_treaty_residence);
    if (savedIndiaState?.dtaa?.dtaa_treaty_residence !== 'india') {
        throw new Error("DTAA choice not synced back to India state in localStorage");
    }

    // Test Active-Duty Military MSRRA features
    console.log("\nTesting Active-Duty Military MSRRA residency logic:");
    sandbox.usState.state_residency.active_duty_military_or_spouse = true;
    sandbox.usState.state_residency.military_home_state_of_record = 'TX';
    sandbox.usState.state_residency.military_duty_station_state = 'CA';
    
    // Trigger derived field recalculation/rendering
    sandbox.usState.state_residency.primary_state_of_residence = 'TX'; // Set TX as primary
    vm.runInContext("recalculateDerivedFields()", sandbox);
    
    // Check if TX and CA are rendered
    const txInfo = vm.runInContext("getStateResidencyInfo('TX')", sandbox);
    const caInfo = vm.runInContext("getStateResidencyInfo('CA')", sandbox);
    
    console.log("  TX residency status:", txInfo.status);
    console.log("  TX residency explanation:", txInfo.explanation);
    console.log("  CA residency status:", caInfo.status);
    console.log("  CA residency explanation:", caInfo.explanation);
    
    if (!txInfo.status.includes('Military Resident')) {
        throw new Error("TX military home state status should include 'Military Resident'");
    }
    if (caInfo.status !== 'Military Duty Station (Exempt)') {
        throw new Error("CA military duty station status should be 'Military Duty Station (Exempt)'");
    }
    
    // Check that TX and CA are both in the derived list in the DOM
    const htmlOutput = doc.getElementById('div-state-status-list').innerHTML;
    if (!htmlOutput.includes('TX') || !htmlOutput.includes('CA')) {
        throw new Error("TX and CA should both be in the derived state status list DOM");
    }
    console.log("  Active-Duty Military MSRRA residency verification passed!");
}

// ----------------------------------------------------
// TEST CASE 2: India Specialist L1 State Persistence
// ----------------------------------------------------
function testIndiaSpecialist() {
    console.log("\n--- Testing India Specialist Logic ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_india.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    // Set up active router state
    storage.setItem('wising_router_state', JSON.stringify({
        jurisdiction: 'dual',
        full_name: 'Rohan Sharma',
        date_of_birth: '1975-10-20'
    }));
    
    // Pre-populate India Specialist State in localStorage to test recovery
    const savedStateMock = {
        profile: {
            pan: 'ABCDE1234F',
            pan_aadhaar_linked: true,
            tax_regime: 'NEW'
        },
        residency_detail: {
            days_in_india_current_year: 150,
            days_in_india_preceding_4_years_gte_365: true,
            employment_or_crew_status: 'none'
        },
        deductions: {
            s80C: { elss_inr: 50000, ppf_inr: 30000, principal_home_loan_inr: null },
            s80D: { self_family_premium_inr: 25000, parents_premium_inr: 50000, parents_are_senior: true }
        },
        bank_accounts: [
            { id: 'b1', name: 'ICICI Bank', account_number: '123456', ifsc: 'ICIC0001234', balance: 500000 },
            { id: 'b2', name: 'HDFC Bank', account_number: '789012', ifsc: 'HDFC0007890', balance: 1200000 }
        ]
    };
    storage.setItem('wising_layer1_india_state', JSON.stringify(savedStateMock));
    
    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) { console.log("ALERT:", msg); },
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        Number: Number,
        parseInt: parseInt,
        parseFloat: parseFloat,
        Math: Math,
        Date: Date,
        String: String,
        Object: Object,
        Array: Array,
        RegExp: RegExp,
        tailwind: { config: {} }
    };
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.state = state; globalThis.runResidencySolver = runResidencySolver; globalThis.restoreIndiaDOMFromState = restoreIndiaDOMFromState; globalThis.restoreBankAccountsDOM = restoreBankAccountsDOM;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_india.html [Script]' });
    
    // Run window.onload to restore state
    if (sandbox.window.onload) {
        sandbox.window.onload();
    }
    
    console.log("Verified merged India L1 state:");
    console.log("  state.profile.full_name:", sandbox.state.profile.full_name);
    console.log("  state.profile.pan:", sandbox.state.profile.pan);
    console.log("  state.deductions.s80C.elss_inr:", sandbox.state.deductions.s80C.elss_inr);
    console.log("  state.deductions.s80C.ppf_inr:", sandbox.state.deductions.s80C.ppf_inr);
    console.log("  state.deductions.s80D.parents_are_senior:", sandbox.state.deductions.s80D.parents_are_senior);
    console.log("  state.bank_accounts length:", sandbox.state.bank_accounts.length);
    
    if (sandbox.state.profile.full_name !== 'Rohan Sharma') {
        throw new Error("Full name not synced from router state");
    }
    if (sandbox.state.profile.pan !== 'ABCDE1234F') {
        throw new Error("PAN state not restored from localStorage");
    }
    if (sandbox.state.deductions.s80C.elss_inr !== 50000) {
        throw new Error("80C ELSS deduction state not restored");
    }
    if (sandbox.state.deductions.s80D.parents_are_senior !== true) {
        throw new Error("80D parents senior checkbox state not restored");
    }
    if (sandbox.state.bank_accounts.length !== 2) {
        throw new Error("Bank accounts state not restored");
    }
    
    // Verify restored inputs in DOM
    const panInputVal = doc.getElementById('prof-pan').value;
    const panLinkedVal = doc.getElementById('prof-aadhaar-linked').checked;
    const elssInputVal = doc.getElementById('ded-elss').value;
    const seniorCheckedVal = doc.getElementById('ded-80d-senior').checked;
    
    console.log("Verified restored DOM values:");
    console.log("  #prof-pan.value:", panInputVal);
    console.log("  #prof-aadhaar-linked.checked:", panLinkedVal);
    console.log("  #ded-elss.value:", elssInputVal);
    console.log("  #ded-80d-senior.checked:", seniorCheckedVal);
    
    if (panInputVal !== 'ABCDE1234F') {
        throw new Error("PAN input DOM value not restored");
    }
    if (panLinkedVal !== true) {
        throw new Error("Aadhaar linked checkbox DOM state not restored");
    }
    if (elssInputVal != '50000' && elssInputVal != '50,000') {
        throw new Error("80C ELSS input DOM value not restored");
    }
    if (seniorCheckedVal !== true) {
        throw new Error("80D parents senior checkbox DOM state not restored");
    }
}

function testW2Restructuring() {
    console.log("\n--- Testing W-2 Wages Restructuring ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    // Set up standard Layer 0 router state
    storage.setItem('wising_router_state', JSON.stringify({
        jurisdiction: 'dual',
        full_name: 'Alex DualResident',
        date_of_birth: '1988-06-15',
        is_us_citizen: false,
        has_green_card: false,
        us_days: 0,
        india_days: 182
    }));

    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) { console.log("ALERT:", msg); },
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        Number: Number,
        parseInt: parseInt,
        parseFloat: parseFloat,
        Math: Math,
        Date: Date,
        String: String,
        Object: Object,
        Array: Array,
        RegExp: RegExp,
        tailwind: { config: {} }
    };
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.usState = usState; globalThis.addW2Row = addW2Row; globalThis.syncW2sState = syncW2sState; globalThis.recalculateDerivedFields = recalculateDerivedFields; globalThis.calculateEstimatedAgi = calculateEstimatedAgi; globalThis.normalizeW2Data = normalizeW2Data;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    doc.dispatchEvent('DOMContentLoaded');
    if (sandbox.window.onload) sandbox.window.onload();

    // 1. Test normalization of old flat format
    const oldFlatData = {
        employer_name: "Old Corp",
        wages_tips_compensation_usd: 80000,
        federal_income_tax_withheld_usd: 12000,
        social_security_wages_usd: 80000,
        social_security_tax_withheld_usd: 4960,
        medicare_wages_usd: 80000,
        medicare_tax_withheld_usd: 1160,
        state_code: "NY",
        state_wages_usd: 80000,
        state_tax_withheld_usd: 4000
    };

    const normalized = sandbox.normalizeW2Data(oldFlatData);
    console.log("  Normalized Employer Name:", normalized.employer_name);
    console.log("  Normalized Wages Box 1:", normalized.wages_box1_usd);
    console.log("  Normalized Federal Tax:", normalized.tax_details_collapsed_by_default.federal_tax_withheld_usd);
    console.log("  Normalized State Code:", normalized.state_and_local_taxes[0]?.state_code_box15);

    if (normalized.employer_name !== "Old Corp" || normalized.wages_box1_usd !== 80000 || normalized.tax_details_collapsed_by_default.federal_tax_withheld_usd !== 12000 || normalized.state_and_local_taxes[0]?.state_code_box15 !== "NY") {
        throw new Error("Old flat W-2 data normalization failed");
    }

    // 2. Add W-2 row with new format data
    const newFormatData = {
        employer_name: "New Corp",
        wages_box1_usd: 100000,
        tax_details_collapsed_by_default: {
            employer_ein: "12-3456789",
            federal_tax_withheld_usd: 15000,
            ss_wages_box3_usd: 100000,
            ss_tax_withheld_usd: 6200,
            medicare_wages_box5_usd: 100000,
            medicare_tax_withheld_usd: 1450
        },
        has_state_taxes: true,
        state_and_local_taxes: [
            {
                state_code_box15: "CA",
                state_wages_box16_usd: 100000,
                state_tax_withheld_box17_usd: 5000,
                local_wages_box18_usd: 100000,
                local_tax_withheld_box19_usd: 1000,
                locality_name_box20: "SF"
            }
        ],
        has_special_box12_benefits: true,
        box_12_benefits: [
            { code: "D", amount_usd: 19500 }
        ],
        is_statutory_employee: true
    };

    sandbox.addW2Row(newFormatData);
    console.log("  Added W-2 row successfully");
    console.log("  usState.income_us_source.wages_w2 length:", sandbox.usState.income_us_source.wages_w2.length);

    if (sandbox.usState.income_us_source.wages_w2.length !== 1) {
        throw new Error("W-2 row was not added to state list");
    }

    const savedW2 = sandbox.usState.income_us_source.wages_w2[0];
    console.log("  Saved Employer Name:", savedW2.employer_name);
    console.log("  Saved Wages Box 1:", savedW2.wages_box1_usd);
    console.log("  Saved Federal Tax:", savedW2.tax_details_collapsed_by_default.federal_tax_withheld_usd);
    console.log("  Saved State Code:", savedW2.state_and_local_taxes[0]?.state_code_box15);
    console.log("  Saved Local Tax:", savedW2.state_and_local_taxes[0]?.local_tax_withheld_box19_usd);
    console.log("  Saved Box 12 Code:", savedW2.box_12_benefits[0]?.code);
    console.log("  Saved Statutory Employee status:", savedW2.is_statutory_employee);

    if (savedW2.employer_name !== "New Corp" || savedW2.wages_box1_usd !== 100000) {
        throw new Error("Saved W-2 core data mismatch");
    }
    if (savedW2.tax_details_collapsed_by_default.federal_tax_withheld_usd !== 15000) {
        throw new Error("Saved W-2 tax details mismatch");
    }
    if (savedW2.state_and_local_taxes[0]?.state_code_box15 !== "CA" || savedW2.state_and_local_taxes[0]?.local_tax_withheld_box19_usd !== 1000) {
        throw new Error("Saved W-2 state/local taxes mismatch");
    }
    if (savedW2.box_12_benefits[0]?.code !== "D") {
        throw new Error("Saved W-2 Box 12 benefits mismatch");
    }
    if (savedW2.is_statutory_employee !== true) {
        throw new Error("Saved W-2 statutory employee mismatch");
    }

    // 3. Test derived calculations (AGI, withholding)
    const agi = sandbox.calculateEstimatedAgi();
    const federalWithholding = sandbox.usState.withholding_and_estimated.federal_withholding_total_usd;
    const stateWithholding = sandbox.usState.withholding_and_estimated.state_withholding_total_usd;

    console.log("  Estimated AGI calculated:", agi);
    console.log("  Federal Withholding total:", federalWithholding);
    console.log("  State Withholding total:", stateWithholding);

    if (agi !== 100000) {
        throw new Error(`AGI calculation mismatch: expected 100000, got ${agi}`);
    }
    if (federalWithholding !== 15000) {
        throw new Error(`Federal withholding mismatch: expected 15000, got ${federalWithholding}`);
    }
    if (stateWithholding !== 5000) {
        throw new Error(`State withholding mismatch: expected 5000, got ${stateWithholding}`);
    }

    console.log("  W-2 Restructuring verification passed!");
}

function testSelfEmploymentRestructuring() {
    console.log("\n--- Testing Self-Employment Restructuring ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    // Set up standard Layer 0 router state
    storage.setItem('wising_router_state', JSON.stringify({
        jurisdiction: 'dual',
        full_name: 'Alex DualResident',
        date_of_birth: '1988-06-15'
    }));

    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) { console.log("ALERT:", msg); },
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        Number: Number,
        parseInt: parseInt,
        parseFloat: parseFloat,
        Math: Math,
        Date: Date,
        String: String,
        Object: Object,
        Array: Array,
        RegExp: RegExp,
        tailwind: { config: {} }
    };
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.usState = usState; globalThis.addW2Row = addW2Row; globalThis.syncW2sState = syncW2sState; globalThis.addSeBusinessRow = addSeBusinessRow; globalThis.syncSeState = syncSeState; globalThis.recalculateDerivedFields = recalculateDerivedFields; globalThis.calculateEstimatedAgi = calculateEstimatedAgi; globalThis.normalizeSeData = normalizeSeData; globalThis.updateStatutoryW2Dropdowns = updateStatutoryW2Dropdowns; globalThis.stepIds = stepIds;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    doc.dispatchEvent('DOMContentLoaded');
    if (sandbox.window.onload) sandbox.window.onload();

    // Test that step-business is registered in stepIds
    console.log("  Registered steps in US Specialist:", sandbox.stepIds);
    if (!sandbox.stepIds.includes('step-business')) {
        throw new Error("step-business is not registered in stepIds list");
    }

    // 1. Test normalization of legacy object format
    const legacySE = {
        has_se_income: true,
        gross_receipts_usd: 15000,
        expenses_usd: 3000,
        qbi_eligible: true,
        is_specified_service_trade: true
    };

    const normalized = sandbox.normalizeSeData(legacySE);
    console.log("  Normalized SE length:", normalized.length);
    console.log("  Normalized SE business gross:", normalized[0]?.gross_receipts_usd);
    console.log("  Normalized SE business qbi:", normalized[0]?.qbi_eligible);

    if (!Array.isArray(normalized) || normalized.length !== 1) {
        throw new Error("Legacy SE normalization should return a single-item array");
    }
    if (normalized[0].gross_receipts_usd !== 15000 || normalized[0].qbi_eligible !== true || normalized[0].is_specified_service_trade !== true) {
        throw new Error("Legacy SE field mapping failed");
    }

    // Initialize toggle checkbox
    const toggleChk = doc.getElementById('se-has-toggle');
    toggleChk.checked = true;

    // 2. Add W-2 statutory row
    const statW2Data = {
        id: "w2-stat-1",
        employer_name: "Statutory Corp",
        wages_box1_usd: 80000,
        is_statutory_employee: true
    };
    sandbox.addW2Row(statW2Data);

    // 3. Add SE Business Row
    const businessData = {
        business_name: "Tech Consulting",
        naics_code: "541511",
        gross_receipts_usd: 10000,
        expenses_usd: 4000,
        qbi_eligible: true,
        is_specified_service_trade: true,
        statutory_w2_link_id: "w2-stat-1"
    };

    sandbox.addSeBusinessRow(businessData);
    console.log("  Added SE Business row successfully");
    console.log("  usState.income_us_source.self_employment length:", sandbox.usState.income_us_source.self_employment.length);

    if (sandbox.usState.income_us_source.self_employment.length !== 1) {
        throw new Error("SE business was not added to the state array");
    }

    const savedSE = sandbox.usState.income_us_source.self_employment[0];
    console.log("  Saved Business Name:", savedSE.business_name);
    console.log("  Saved NAICS Code:", savedSE.naics_code);
    console.log("  Saved Gross Receipts:", savedSE.gross_receipts_usd);
    console.log("  Saved Expenses:", savedSE.expenses_usd);
    console.log("  Saved Link ID:", savedSE.statutory_w2_link_id);

    if (savedSE.business_name !== "Tech Consulting" || savedSE.naics_code !== "541511") {
        throw new Error("Saved SE data name or NAICS mismatch");
    }
    if (savedSE.statutory_w2_link_id !== "w2-stat-1") {
        throw new Error("Saved SE statutory link ID mismatch");
    }

    // 4. Verify derived calculations with statutory link active
    let agi = sandbox.calculateEstimatedAgi();
    console.log("  AGI with statutory link active (80k W2 + 10k Gross - 4k Exp):", agi);
    // Statutory W2 wages (80k) + SE net (6k) = 86k.
    if (agi !== 86000) {
        throw new Error(`AGI calculation with statutory link mismatch: expected 86000, got ${agi}`);
    }

    // Change SE business financials to simulate net loss (gross = 0, expenses = 5000)
    const cardEl = doc.getElementById(savedSE.id);
    cardEl.querySelector('.se-gross').value = 0;
    cardEl.querySelector('.se-expenses').value = 5000;
    sandbox.syncSeState();

    agi = sandbox.calculateEstimatedAgi();
    console.log("  AGI with statutory link loss (80k W2 + 0k Gross - 5k Exp):", agi);
    // Statutory loss of 5k should reduce W-2 wages: 80k - 5k = 75k.
    if (agi !== 75000) {
        throw new Error(`AGI calculation with statutory link loss mismatch: expected 75000, got ${agi}`);
    }

    // 5. Test calculations with statutory link cleared (regular loss)
    cardEl.querySelector('.se-w2-link').value = "";
    sandbox.syncSeState();

    agi = sandbox.calculateEstimatedAgi();
    console.log("  AGI without statutory link loss (80k W2 + 0k Gross - 5k Exp, regular loss ignored):", agi);
    // Without statutory link, AGI should remain 80k.
    if (agi !== 80000) {
        throw new Error(`AGI calculation without statutory link loss mismatch: expected 80000, got ${agi}`);
    }

    console.log("  Self-Employment Restructuring verification passed!");
}

function testBusinessTaxation() {
    console.log("\n--- Testing Advanced Business Taxation Features ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    // Set up standard Layer 0 router state
    storage.setItem('wising_router_state', JSON.stringify({
        jurisdiction: 'us',
        full_name: 'Jane BizOwner',
        date_of_birth: '1980-01-01',
        is_us_citizen: true,
        has_green_card: false,
        us_days: 365
    }));

    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) { console.log("ALERT:", msg); },
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        Number: Number,
        parseInt: parseInt,
        parseFloat: parseFloat,
        Math: Math,
        Date: Date,
        String: String,
        Object: Object,
        Array: Array,
        RegExp: RegExp,
        tailwind: { config: {} }
    };
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.usState = usState; globalThis.calculateBusinessIncomes = calculateBusinessIncomes; globalThis.calculateEstimatedAgi = calculateEstimatedAgi; globalThis.recalculateDerivedFields = recalculateDerivedFields;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    doc.dispatchEvent('DOMContentLoaded');
    if (sandbox.window.onload) sandbox.window.onload();

    // 1. Set up Sole Prop / LLC (Schedule C) with gross > $100K to trigger Wayfair economic nexus
    sandbox.usState.income_us_source.self_employment = [
        {
            id: 'se-test-1',
            business_name: 'SoleProp1',
            naics_code: '541511',
            has_se_income: true,
            gross_receipts_usd: 120000,
            expenses_usd: 20000,
            qbi_eligible: true,
            is_specified_service_trade: false,
            new_assets_placed_usd: 50000, // 20% bonus depreciation = 10,000
            sec179_expense_usd: 5000,
            vehicle_miles: 1000, // 1000 * $0.68 = $680
            home_office_sqft: 200, // 200 * $5 = $1,000
            wages_paid_usd: 10000
        }
    ];

    // 2. Set up Partnership (Form 1065 K-1) with a Passive loss and active income
    sandbox.usState.income_us_source.partnerships_k1 = [
        {
            id: 'part-k1-1',
            has_part_income: true,
            partner_type: 'general',
            material_participation: 'active',
            ordinary_income_usd: 400000, // huge active income
            tax_basis_usd: 500000,
            qbi_eligible: true,
            qbi_wages_usd: 5000,
            qbi_ubia_usd: 100000
        },
        {
            id: 'part-k1-2',
            has_part_income: true,
            partner_type: 'limited',
            material_participation: 'passive',
            ordinary_income_usd: -50000, // passive loss
            tax_basis_usd: 100000,
            qbi_eligible: false
        }
    ];

    // 3. Set up S-Corp (Form 1120-S K-1) with passive income to offset passive loss
    sandbox.usState.income_us_source.s_corporations_k1 = [
        {
            id: 'scorp-k1-1',
            has_scorp_income: true,
            material_participation: 'passive',
            ordinary_income_usd: 30000, // passive income
            tax_basis_usd: 100000,
            qbi_eligible: false
        }
    ];

    // 4. Set up C-Corp (Form 1120) to compute corporate-level tax and dividend flow
    sandbox.usState.income_us_source.c_corporations_1120 = [
        {
            id: 'ccorp-1',
            has_ccorp: true,
            gross_receipts_usd: 500000,
            cogs_usd: 200000,
            operating_expenses_usd: 100000,
            nol_carryover_usd: 50000,
            dividends_paid_usd: 20000 // flows to personal AGI
        }
    ];

    // Run math solver
    const biz = sandbox.calculateBusinessIncomes();
    console.log("  Computed Business Results:");
    console.log("    netSeIncome:", biz.netSeIncome);
    console.log("    seTax:", biz.seTax);
    console.log("    seDeduction:", biz.seDeduction);
    console.log("    passiveIncome:", biz.passiveIncome);
    console.log("    passiveLosses:", biz.passiveLosses);
    console.log("    allowedPassiveLoss:", biz.allowedPassiveLoss);
    console.log("    activeBusinessIncome:", biz.activeBusinessIncome);
    console.log("    activeBusinessLosses:", biz.activeBusinessLosses);
    console.log("    cCorpTax:", biz.cCorpTax);
    console.log("    qbiDeduction:", biz.qbiDeduction);
    console.log("    totalBusinessAgiFlow:", biz.totalBusinessAgiFlow);
    console.log("    nexusAlerts:", biz.nexusAlerts);

    // Assertions:
    // 1. Wayfair threshold check:
    if (biz.nexusAlerts.length === 0 || !biz.nexusAlerts[0].includes("SoleProp1")) {
        throw new Error("Wayfair economic nexus alert should have triggered for SoleProp1");
    }

    // 2. Passive loss limiting:
    // Passive Income = 30,000 (S-corp)
    // Passive Losses = 50,000 (Partnership K-1 limited loss)
    // Allowed Passive Loss = min(50000, 30000) = 30,000.
    if (biz.allowedPassiveLoss !== 30000) {
        throw new Error(`Allowed passive loss mismatch: expected 30000, got ${biz.allowedPassiveLoss}`);
    }

    // C-Corp tax: taxable = (500000 - 200000 - 100000 - 50000) = 150000. corpTax = 150000 * 21% = 31,500.
    if (biz.cCorpTax !== 31500) {
        throw new Error(`C-Corp tax mismatch: expected 31500, got ${biz.cCorpTax}`);
    }

    // Call recalculateDerivedFields to test DOM elements updates and flags visibility
    sandbox.recalculateDerivedFields();
    
    const passiveFlagEl = doc.getElementById('biz-flag-passive-loss');
    console.log("  Passive flag hidden:", passiveFlagEl.classList.contains('hidden'));
    if (passiveFlagEl.classList.contains('hidden')) {
        throw new Error("Passive activity loss flag should be visible because of suspended loss");
    }
    const passiveAmtText = doc.getElementById('biz-flag-passive-amt').textContent;
    console.log("  Passive suspended amount in DOM:", passiveAmtText);
    if (!passiveAmtText.includes('20,000')) {
        throw new Error("Passive suspended loss amount in DOM should be $20,000.00");
    }

    // Test Excess Business Loss (Form 461)
    // Let's set a huge active business loss. EBL limit for Single in 2026 is $305,000.
    sandbox.usState.income_us_source.partnerships_k1.push({
        id: 'part-k1-3',
        has_part_income: true,
        partner_type: 'limited',
        material_participation: 'active',
        ordinary_income_usd: -1000000,
        tax_basis_usd: 1000000,
        qbi_eligible: false
    });

    const biz3 = sandbox.calculateBusinessIncomes();
    console.log("  Computed Business Results with HUGE loss (-1,000,000):");
    console.log("    disallowedEbl:", biz3.disallowedEbl);
    if (biz3.disallowedEbl !== 219680) {
        throw new Error(`Disallowed EBL mismatch: expected 219680, got ${biz3.disallowedEbl}`);
    }

    sandbox.recalculateDerivedFields();
    const eblFlagEl = doc.getElementById('biz-flag-ebl');
    console.log("  EBL flag hidden:", eblFlagEl.classList.contains('hidden'));
    if (eblFlagEl.classList.contains('hidden')) {
        throw new Error("EBL flag should be visible because of disallowed excess business loss");
    }
    const eblAmtText = doc.getElementById('biz-flag-ebl-amt').textContent;
    console.log("  EBL disallowed amount in DOM:", eblAmtText);
    if (!eblAmtText.includes('219,680')) {
        throw new Error("EBL disallowed amount in DOM should be $219,680.00");
    }

    // 5. Test Section 179 Global Limitation, Phase-out, and Active Income Limit
    console.log("\nTesting Section 179 Global Limitation & Phase-out:");
    sandbox.usState.income_us_source.self_employment = [
        {
            id: 'se-test-nexus',
            has_se_income: true,
            assets: [
                { id: 'asset-huge', name: 'Huge Machine', class: '7-year', cost: 3200000, sec179: 1200000, bonus: false }
            ]
        }
    ];
    sandbox.usState.income_us_source.partnerships_k1 = [];
    sandbox.usState.income_us_source.s_corporations_k1 = [];
    sandbox.usState.income_us_source.wages_w2 = [];
    
    let biz4 = sandbox.calculateBusinessIncomes();
    console.log("  Disallowed Section 179 due to Phase-out:", biz4.disallowedSec179);
    console.log("  Suspended Section 179 due to Active Income Limit:", biz4.suspendedSec179IncomeLimit);
    
    // Placed in service: 3.2M. Excess: 200,000. Cap reduced from 1.2M to 1.0M. Disallowed phase-out: 1.2M - 1.0M = 200,000.
    if (biz4.disallowedSec179 !== 200000) {
        throw new Error(`Section 179 disallowed phase-out mismatch: expected 200000, got ${biz4.disallowedSec179}`);
    }
    // Active income is 0, so all 1.0M allowed after phase-out is suspended.
    if (biz4.suspendedSec179IncomeLimit !== 1000000) {
        throw new Error(`Section 179 suspended active income limit mismatch: expected 1000000, got ${biz4.suspendedSec179IncomeLimit}`);
    }

    // Set W-2 wages to 150K; should reduce suspended amount by 150K to 850K
    sandbox.usState.income_us_source.wages_w2 = [{ wages_box1_usd: 150000 }];
    let biz4WithW2 = sandbox.calculateBusinessIncomes();
    console.log("  Suspended Section 179 with 150K W-2 wages:", biz4WithW2.suspendedSec179IncomeLimit);
    if (biz4WithW2.suspendedSec179IncomeLimit !== 850000) {
        throw new Error(`Section 179 suspended with W-2 wages mismatch: expected 850000, got ${biz4WithW2.suspendedSec179IncomeLimit}`);
    }

    // Add residential real estate asset claiming Sec 179; should be gated/ignored completely
    sandbox.usState.income_us_source.self_employment[0].assets.push({
        id: 'asset-re',
        name: 'Rental Condo',
        class: '27.5-year',
        cost: 500000,
        sec179: 100000,
        bonus: false
    });
    let biz4WithRe = sandbox.calculateBusinessIncomes();
    console.log("  Disallowed Section 179 with real estate added:", biz4WithRe.disallowedSec179);
    // Real estate Sec 179 should be ignored, so global counts do not increase
    if (biz4WithRe.disallowedSec179 !== 200000) {
        throw new Error(`Section 179 real estate gating failed: disallowed phase-out should remain 200000`);
    }

    // 6. Test At-Risk and Tax Basis Limitation (Form 6198)
    console.log("\nTesting At-Risk & Tax Basis Limitation:");
    sandbox.usState.income_us_source.self_employment = [];
    sandbox.usState.income_us_source.partnerships_k1 = [
        {
            id: 'part-basis-test',
            has_part_income: true,
            material_participation: 'active',
            ordinary_income_usd: -50000,
            tax_basis_usd: 40000,
            at_risk_basis_usd: 30000
        }
    ];
    const biz5 = sandbox.calculateBusinessIncomes();
    console.log("  Disallowed Loss due to Basis / At-Risk:", biz5.disallowedBasisAndAtRisk);
    // Loss -50,000 limited to lesser of tax_basis (40k) and at_risk_basis (30k) -> allowed loss is 30k. Disallowed is 20k.
    if (biz5.disallowedBasisAndAtRisk !== 20000) {
        throw new Error(`Basis/At-Risk disallowed loss mismatch: expected 20000, got ${biz5.disallowedBasisAndAtRisk}`);
    }

    // 7. Test Active Rental Exception $25,000 and MAGI Phase-out (Form 8582)
    console.log("\nTesting Active Rental Exception ($25K Allowance) and MAGI Phase-out:");
    // Set up active AGI around $120,000 (MAGI = W-2 + portfolio/other)
    sandbox.usState.income_us_source.wages_w2 = [
        { wages_box1_usd: 120000 }
    ];
    sandbox.usState.income_us_source.partnerships_k1 = [
        {
            id: 'part-rental-test',
            has_part_income: true,
            material_participation: 'passive',
            active_rental_participant: true,
            net_rental_real_estate_usd: -20000
        }
    ];
    const biz6 = sandbox.calculateBusinessIncomes();
    console.log("  Passive Income:", biz6.passiveIncome);
    console.log("  Passive Losses:", biz6.passiveLosses);
    console.log("  Allowed Passive/Rental Loss:", biz6.allowedPassiveLoss);
    // MAGI = 120k. Allowance: 25k - (120k-100k)*0.5 = 15k. Rental loss of 20k capped at 15k.
    if (biz6.allowedPassiveLoss !== 15000) {
        throw new Error(`Allowed passive rental loss exception mismatch: expected 15000, got ${biz6.allowedPassiveLoss}`);
    }

    // 8. Test Self-Employed Retirement Dynamic age 50+ Catch-up Cap
    console.log("\nTesting Self-Employed Retirement Dynamic Catch-up Cap:");
    sandbox.usState.income_us_source.wages_w2 = [];
    sandbox.usState.income_us_source.self_employment = [
        {
            id: 'se-ret-test',
            has_se_income: true,
            gross_receipts_usd: 200000,
            expenses_usd: 50000
        }
    ];
    sandbox.usState.income_us_source.partnerships_k1 = [];
    sandbox.usState.income_us_source.se_retirement_deduction_usd = 80000;
    
    // Scenario A: Under age 50 (DOB 1980-01-01 -> age 46 in 2026)
    sandbox.usState.profile.date_of_birth = '1980-01-01';
    const biz7A = sandbox.calculateBusinessIncomes();
    console.log("  Under 50 retirement allowed:", biz7A.seRetirementAllowed);
    if (biz7A.seRetirementAllowed !== 73000) {
        throw new Error(`SE retirement allowed for age < 50 mismatch: expected 73000, got ${biz7A.seRetirementAllowed}`);
    }
    
    // Scenario B: Age 50+ (DOB 1970-01-01 -> age 56 in 2026)
    sandbox.usState.profile.date_of_birth = '1970-01-01';
    const biz7B = sandbox.calculateBusinessIncomes();
    console.log("  Age 50+ retirement allowed:", biz7B.seRetirementAllowed);
    if (biz7B.seRetirementAllowed !== 80000) {
        throw new Error(`SE retirement allowed for age >= 50 mismatch: expected 80000, got ${biz7B.seRetirementAllowed}`);
    }

    console.log("  Advanced Business Taxation features verification passed!");
}

try {
    testUSSpecialist();
    testIndiaSpecialist();
    testW2Restructuring();
    testSelfEmploymentRestructuring();
    testBusinessTaxation();
    console.log("\n=========================================");
    console.log("ALL FEATURES VERIFIED SUCCESSFULLY!");
    console.log("=========================================");
} catch(err) {
    console.error("\n=========================================");
    console.log("VERIFICATION FAILED:");
    console.error(err.stack);
    console.log("=========================================");
    process.exit(1);
}
