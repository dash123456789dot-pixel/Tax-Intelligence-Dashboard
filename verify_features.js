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
    
    prepend(child) {
        if (!this.children) this.children = [];
        this.children.unshift(child);
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
    
    closest(selector) {
        let current = this;
        const target = selector.startsWith('.') ? selector.substring(1) : selector;
        while (current) {
            if (current.id === target || current.tagName === target || (current.classList && current.classList.contains(target)) || (current.className && current.className.split(/\s+/).includes(target))) {
                return current;
            }
            current = current._parent || null;
        }
        return null;
    }
    
    remove() {
        if (this._parent && this._parent.children) {
            this._parent.children = this._parent.children.filter(c => c !== this);
        }
        if (this._document && this._document.elements) {
            delete this._document.elements[this.id];
        }
    }
    
    querySelector(selector) {
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            let found = null;
            const traverse = (el) => {
                if (found) return;
                if (el.children) {
                    for (const c of el.children) {
                        if (c.classList.contains(className) || (c.className && c.className.split(/\s+/).includes(className))) {
                            found = c;
                            return;
                        }
                        traverse(c);
                    }
                }
            };
            traverse(this);
            if (found) return found;
        } else if (selector.startsWith('#')) {
            const id = selector.substring(1);
            let found = null;
            const traverse = (el) => {
                if (found) return;
                if (el.children) {
                    for (const c of el.children) {
                        if (c.id === id) {
                            found = c;
                            return;
                        }
                        traverse(c);
                    }
                }
            };
            traverse(this);
            if (found) return found;
        }

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
        this.body = new MockElement('body', 'body');
        this.body._document = this;
        this.allElements.push(this.body);
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
    // Return all inline scripts concatenated together
    let joined = scripts.join('\n;\n');
    // Remove the window.formatCurrency element formatter to prevent it from overwriting the number formatter due to script concatenation/hoisting in the sandbox
    joined = joined.replace(/window\.formatCurrency\s*=\s*function\s*\(\s*el\s*\)\s*\{[\s\S]*?\}\s*;?/g, '// Overridden window.formatCurrency');
    return joined;
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
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
        other_sources: {
            miscellaneous_income_inr: 75000,
            has_other_sources_income: true
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.state = state; globalThis.runResidencySolver = runResidencySolver; globalThis.restoreIndiaDOMFromState = restoreIndiaDOMFromState; globalThis.restoreBankAccountsDOM = restoreBankAccountsDOM; globalThis.updateOSField = updateOSField;";
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
    console.log("  DEBUG: state.other_sources =", JSON.stringify(sandbox.state.other_sources));
    console.log("  DEBUG: doc.getElementById('os-misc') =", doc.getElementById('os-misc') ? { id: doc.getElementById('os-misc').id, value: doc.getElementById('os-misc').value } : null);
    
    
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

    // Verify miscellaneous income restoration
    const miscInputVal = doc.getElementById('os-misc').value;
    console.log("  #os-misc.value:", miscInputVal);
    if (miscInputVal != '75000' && miscInputVal != '75,000') {
        throw new Error("Miscellaneous income input DOM value not restored");
    }

    // Verify tax calculation update on input change
    const initialNormalSlab = sandbox.state.surcharge_buckets.income_normal_slab_inr || 0;
    console.log("  Initial normal slab income:", initialNormalSlab);
    
    // Simulate updating miscellaneous income to 120,000
    sandbox.updateOSField('miscellaneous_income_inr', '120000');
    
    const updatedNormalSlab = sandbox.state.surcharge_buckets.income_normal_slab_inr || 0;
    console.log("  Updated normal slab income after misc increase:", updatedNormalSlab);
    if (updatedNormalSlab !== initialNormalSlab - 75000 + 120000) {
        throw new Error("Normal slab tax base did not increase correctly by the difference in miscellaneous income");
    }
    console.log("  Miscellaneous / Other Income verification passed!");
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
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
    cardEl.querySelector('.se-exp-other').value = 5000;
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
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

    // Scenario C: Partnership Assets & Depreciation (Form 1065 entity-level tracking)
    console.log("\nTesting Partnership Entity-Level Asset Depreciation & Branch Aggregation:");
    sandbox.usState.income_us_source.self_employment = [];
    sandbox.usState.income_us_source.s_corporations_k1 = [];
    sandbox.usState.income_us_source.wages_w2 = [];
    
    sandbox.usState.income_us_source.partnerships_k1 = [
        {
            id: 'part-k1-depr-test',
            has_part_income: true,
            partner_type: 'general',
            material_participation: 'active',
            ordinary_income_usd: 100000,
            tax_basis_usd: 200000,
            at_risk_basis_usd: 200000,
            qbi_eligible: false,
            assets: [
                { id: 'part-asset-1', name: 'Patent', class: 'amortization-15', cost: 30000, sec179: 0, bonus: false, placed_in_service_date: '2026-01-01' }
            ],
            branches: [
                {
                    id: 'part-branch-1',
                    branch_name: 'Branch A',
                    state: 'CA',
                    ordinary_income_usd: 20000,
                    assets: [
                        { id: 'branch-asset-1', name: 'Computer', class: '5-year', cost: 10000, sec179: 0, bonus: false, placed_in_service_date: '2026-01-01' }
                    ]
                }
            ]
        }
    ];

    const biz8 = sandbox.calculateBusinessIncomes();
    console.log("  Partnership Active Business Income:", biz8.activeBusinessIncome);
    
    // Calculations:
    // Main asset depreciation: 30,000 * 0.0667 = 2001.
    // Branch asset depreciation: 10,000 * 0.2000 = 2000.
    // Total asset depreciation = 4001.
    // Adjusted main ordinary income = 100,000 - 4001 = 95,999.
    // Branch ordinary income = 20,000 (note: branch deductions do not reduce branch ordinary income directly in this version, but branch assets are aggregated and calculated).
    // Total partnership active income = 115,999.
    if (biz8.activeBusinessIncome !== 115999) {
        throw new Error(`Partnership active business income mismatch: expected 115999, got ${biz8.activeBusinessIncome}`);
    }
    console.log("  Partnership Entity-Level Asset Depreciation & Branch Aggregation passed!");

    console.log("  Advanced Business Taxation features verification passed!");
}

function test1099Compliance() {
    console.log("\n--- Testing 1099 Form Selector Compliance Panel ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.migrate1099Legacy = migrate1099Legacy; globalThis.normalizePartK1Item = normalizePartK1Item; globalThis.normalizeScorpK1Item = normalizeScorpK1Item; globalThis.normalizeCcorpItem = normalizeCcorpItem; globalThis.addPartK1Row = addPartK1Row; globalThis.addScorpK1Row = addScorpK1Row; globalThis.addCcorpRow = addCcorpRow; globalThis.addCcorpShareholderRow = addCcorpShareholderRow; globalThis.syncPartK1State = syncPartK1State; globalThis.syncCcorpState = syncCcorpState; globalThis.usState = usState;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    // 1. Test migrate1099Legacy function
    console.log("  Testing migrate1099Legacy:");
    const legacyItem = { requires_1099_filing: true, filed_1099_forms: true };
    const migrated = sandbox.migrate1099Legacy(legacyItem);
    console.log("    Migrated legacy output:", migrated);
    if (!Array.isArray(migrated) || migrated.length !== 1 || migrated[0].form !== '1099-NEC' || migrated[0].filed !== true) {
        throw new Error("migrate1099Legacy failed to convert legacy 1099 flags");
    }
    
    // 2. Test Normalizer functions
    console.log("  Testing normalizer schema preservation:");
    const emptyPart = sandbox.normalizePartK1Item(null);
    if (!Array.isArray(emptyPart.forms_1099) || emptyPart.forms_1099.length !== 0) {
        throw new Error("normalizePartK1Item (null) should return empty forms_1099 array");
    }
    
    const populatedPart = sandbox.normalizePartK1Item({
        requires_1099_filing: true,
        filed_1099_forms: false
    });
    if (!Array.isArray(populatedPart.forms_1099) || populatedPart.forms_1099.length !== 1 || populatedPart.forms_1099[0].form !== '1099-NEC' || populatedPart.forms_1099[0].filed !== false) {
        throw new Error("normalizePartK1Item failed to preserve/migrate forms_1099");
    }
    
    // Scorp Normalizer
    const emptyScorp = sandbox.normalizeScorpK1Item(null);
    if (!Array.isArray(emptyScorp.forms_1099) || emptyScorp.forms_1099.length !== 0) {
        throw new Error("normalizeScorpK1Item (null) should return empty forms_1099 array");
    }
    
    // C-Corp Normalizer
    const emptyCcorp = sandbox.normalizeCcorpItem(null);
    if (!Array.isArray(emptyCcorp.forms_1099) || emptyCcorp.forms_1099.length !== 0) {
        throw new Error("normalizeCcorpItem (null) should return empty forms_1099 array");
    }

    // 3. Test DOM restoration and rendering for null data vs populated data
    console.log("  Testing DOM restoration and row builder population:");
    sandbox.addPartK1Row(null); // add new blank card
    const listEl = doc.getElementById('div-part-k1-list');
    const wrapper = listEl.children[0];
    const firstCard = wrapper.querySelector('.part-k1-card') || wrapper.children[0];
    const panelHost = firstCard.querySelector('.part-1099-panel-host');
    if (!panelHost || !panelHost.innerHTML.includes('part-1099-none')) {
        throw new Error("Blank Partnership card did not render 1099 panel checkboxes with None option");
    }
    
    // Check that 'None' checkbox is checked by default when forms_1099 is empty by looking at innerHTML
    if (!panelHost.innerHTML.includes('id="part-1099-none-') || !panelHost.innerHTML.includes('checked')) {
        throw new Error("None checkbox should be checked by default in blank 1099 panel");
    }

    // 4. Test C-Corp Shareholders Normalizer and DOM population
    console.log("  Testing C-Corp Shareholders Normalizer and DOM population:");
    const ccorpWithSh = sandbox.normalizeCcorpItem({
        id: 'ccorp-sh-test',
        business_name: 'Test Shareholdings Inc',
        shareholders: [
            { id: 'sh-1', name: 'John Doe', tin: '123-45-6789', percent: 45 }
        ]
    });
    if (ccorpWithSh.shareholders.length !== 1 || ccorpWithSh.shareholders[0].name !== 'John Doe' || ccorpWithSh.shareholders[0].percent !== 45) {
        throw new Error("normalizeCcorpItem failed to normalize shareholders array correctly");
    }

    const ccorpListEl = doc.getElementById('div-ccorp-list');
    ccorpListEl.innerHTML = '';
    ccorpListEl.children = [];
    
    sandbox.addCcorpRow(ccorpWithSh);
    
    const ccorpWrapper = ccorpListEl.children[0];
    const ccorpCard = ccorpWrapper.querySelector('.ccorp-card') || ccorpWrapper.children[0];
    const shRow = ccorpCard.querySelector('.ccorp-shareholder-row');
    if (!shRow) {
        throw new Error("C-Corp card did not render shareholder row upon restoration");
    }
    if (shRow.querySelector('.sh-name').value !== 'John Doe' || shRow.querySelector('.sh-tin').value !== '123-45-6789' || shRow.querySelector('.sh-percent').value != '45') {
        throw new Error("C-Corp shareholder row fields not populated correctly upon restoration");
    }
    
    sandbox.addCcorpShareholderRow('ccorp-sh-test');
    const shRows = ccorpCard.querySelectorAll('.ccorp-shareholder-row');
    if (shRows.length !== 2) {
        throw new Error("Failed to add new shareholder row dynamically");
    }
    
    shRows[1].querySelector('.sh-name').value = 'Alice Smith';
    shRows[1].querySelector('.sh-tin').value = '987-65-4321';
    shRows[1].querySelector('.sh-percent').value = '55';
    
    sandbox.syncCcorpState();
    
    const savedCcorpList = sandbox.usState.income_us_source.c_corporations_1120;
    const savedCcorp = savedCcorpList.find(c => c.id === 'ccorp-sh-test');
    if (!savedCcorp || savedCcorp.shareholders.length !== 2) {
        throw new Error("C-Corp shareholders not serialized correctly in syncCcorpState");
    }
    if (savedCcorp.shareholders[1].name !== 'Alice Smith' || savedCcorp.shareholders[1].percent !== 55) {
        throw new Error("C-Corp shareholder details not matching in serialized state");
    }

    console.log("  1099 Form Selector Compliance Panel & C-Corp Shareholders verification passed!");

    // 5. Test S-Corp Shareholders restoration, dynamic addition, and sync
    console.log("  Testing S-Corp Shareholders Normalizer and DOM population:");
    const scorpWithSh = sandbox.normalizeScorpK1Item({
        id: 'scorp-sh-test',
        business_name: 'Test S-Corp Inc',
        shareholders: [
            { id: 'sc-sh-1', name: 'Bob Jones', tin: '456-78-9012', percent: 60, is_taxpayer: true }
        ]
    });
    if (scorpWithSh.shareholders.length !== 1 || scorpWithSh.shareholders[0].name !== 'Bob Jones' || scorpWithSh.shareholders[0].percent !== 60 || !scorpWithSh.shareholders[0].is_taxpayer) {
        throw new Error("normalizeScorpK1Item failed to normalize shareholders array correctly");
    }

    const scorpListEl = doc.getElementById('div-scorp-k1-list');
    scorpListEl.innerHTML = '';
    scorpListEl.children = [];
    
    sandbox.addScorpK1Row(scorpWithSh);
    
    const scorpWrapper = scorpListEl.children[0];
    const scorpCard = scorpWrapper.querySelector('.scorp-k1-card') || scorpWrapper.children[0];
    const scorpShRow = scorpCard.querySelector('.scorp-shareholder-row');
    if (!scorpShRow) {
        throw new Error("S-Corp card did not render shareholder row upon restoration");
    }
    if (scorpShRow.querySelector('.sh-name').value !== 'Bob Jones' || scorpShRow.querySelector('.sh-tin').value !== '456-78-9012' || scorpShRow.querySelector('.sh-percent').value != '60' || !scorpShRow.querySelector('.sh-is-taxpayer').checked) {
        throw new Error("S-Corp shareholder row fields not populated correctly upon restoration");
    }
    
    sandbox.addScorpShareholderRow('scorp-sh-test');
    const scorpShRows = scorpCard.querySelectorAll('.scorp-shareholder-row');
    if (scorpShRows.length !== 2) {
        throw new Error("Failed to add new S-Corp shareholder row dynamically");
    }
    
    scorpShRows[1].querySelector('.sh-name').value = 'Eve White';
    scorpShRows[1].querySelector('.sh-tin').value = '654-32-1098';
    scorpShRows[1].querySelector('.sh-percent').value = '40';
    scorpShRows[1].querySelector('.sh-is-taxpayer').checked = false;
    
    sandbox.syncScorpK1State();
    
    const savedScorpList = sandbox.usState.income_us_source.s_corporations_k1;
    const savedScorp = savedScorpList.find(c => c.id === 'scorp-sh-test');
    if (!savedScorp || savedScorp.shareholders.length !== 2) {
        throw new Error("S-Corp shareholders not serialized correctly in syncScorpK1State");
    }
    if (savedScorp.shareholders[1].name !== 'Eve White' || savedScorp.shareholders[1].percent !== 40 || savedScorp.shareholders[1].is_taxpayer) {
        throw new Error("S-Corp shareholder details not matching in serialized state");
    }

    // 6. Test Partnership Partners restoration, dynamic addition, and sync
    console.log("  Testing Partnership Partners Normalizer and DOM population:");
    const partWithPt = sandbox.normalizePartK1Item({
        id: 'part-pt-test',
        business_name: 'Test Partnership LP',
        partners: [
            { id: 'part-pt-1', name: 'Charlie Green', tin: '789-01-2345', type: 'limited', entity_type: 'individual', profit_end: 45, is_taxpayer: true }
        ]
    });
    if (partWithPt.partners.length !== 1 || partWithPt.partners[0].name !== 'Charlie Green' || partWithPt.partners[0].profit_end !== 45 || !partWithPt.partners[0].is_taxpayer) {
        throw new Error("normalizePartK1Item failed to normalize partners array correctly");
    }

    const partListEl = doc.getElementById('div-part-k1-list');
    partListEl.innerHTML = '';
    partListEl.children = [];
    
    sandbox.addPartK1Row(partWithPt);
    
    const partWrapper = partListEl.children[0];
    const partCard = partWrapper.querySelector('.part-k1-card') || partWrapper.children[0];
    const partPtRow = partCard.querySelector('.part-partner-row');
    if (!partPtRow) {
        throw new Error("Partnership card did not render partner row upon restoration");
    }
    if (partPtRow.querySelector('.partner-name').value !== 'Charlie Green' || partPtRow.querySelector('.partner-tin').value !== '789-01-2345' || partPtRow.querySelector('.partner-profit-end').value != '45' || !partPtRow.querySelector('.partner-is-taxpayer').checked) {
        throw new Error("Partnership partner row fields not populated correctly upon restoration");
    }
    
    sandbox.addPartPartnerRow('part-pt-test');
    const partPtRows = partCard.querySelectorAll('.part-partner-row');
    if (partPtRows.length !== 2) {
        throw new Error("Failed to add new Partnership partner row dynamically");
    }
    
    partPtRows[1].querySelector('.partner-name').value = 'Dave Brown';
    partPtRows[1].querySelector('.partner-tin').value = '543-21-0987';
    partPtRows[1].querySelector('.partner-type').value = 'general';
    partPtRows[1].querySelector('.partner-entity-type').value = 'corporation';
    partPtRows[1].querySelector('.partner-profit-end').value = '55';
    partPtRows[1].querySelector('.partner-is-taxpayer').checked = false;
    
    sandbox.syncPartK1State();
    
    const savedPartList = sandbox.usState.income_us_source.partnerships_k1;
    const savedPart = savedPartList.find(c => c.id === 'part-pt-test');
    if (!savedPart || savedPart.partners.length !== 2) {
        throw new Error("Partnership partners not serialized correctly in syncPartK1State");
    }
    if (savedPart.partners[1].name !== 'Dave Brown' || savedPart.partners[1].profit_end !== 55 || savedPart.partners[1].type !== 'general' || savedPart.partners[1].entity_type !== 'corporation') {
        throw new Error("Partnership partner details not matching in serialized state");
    }

    // 7. Test Calculation Scaling Engine
    console.log("  Testing tax allocation scaling engine for pass-through entities:");
    // Setup state for calculations
    sandbox.usState.profile.tax_entity_type = 'individual';
    sandbox.usState.income_us_source.s_corporations_k1 = [
        {
            id: 'sc-calc-test',
            has_scorp_income: true,
            ordinary_income_usd: 10000,
            shareholders: [
                { id: 'sh-c-1', name: 'Taxpayer', percent: 40, is_taxpayer: true },
                { id: 'sh-c-2', name: 'Other', percent: 60, is_taxpayer: false }
            ]
        }
    ];
    sandbox.usState.income_us_source.partnerships_k1 = [];
    sandbox.usState.income_us_source.self_employment = [];
    sandbox.usState.income_us_source.farming_schedule_f = [];
    sandbox.usState.income_us_source.c_corporations_1120 = [];
    sandbox.usState.income_us_source.wages_w2 = [];
    
    let res = sandbox.calculateBusinessIncomes();
    if (res.activeBusinessIncome !== 4000) {
        throw new Error("Expected scaled S-Corp ordinary income to be 4000 (40% of 10000), got: " + res.activeBusinessIncome);
    }

    // Check default behavior (empty drawer = 100%)
    sandbox.usState.income_us_source.s_corporations_k1[0].shareholders = [];
    res = sandbox.calculateBusinessIncomes();
    if (res.activeBusinessIncome !== 10000) {
        throw new Error("Expected S-Corp ordinary income to default to 10000 (100% of 10000) with empty shareholders list, got: " + res.activeBusinessIncome);
    }

    // Check no taxpayer marked (0%)
    sandbox.usState.income_us_source.s_corporations_k1[0].shareholders = [
        { id: 'sh-c-1', name: 'Taxpayer', percent: 40, is_taxpayer: false },
        { id: 'sh-c-2', name: 'Other', percent: 60, is_taxpayer: false }
    ];
    res = sandbox.calculateBusinessIncomes();
    if (res.activeBusinessIncome !== 0) {
        throw new Error("Expected S-Corp ordinary income to scale to 0 (0%) with no taxpayer marked, got: " + res.activeBusinessIncome);
    }
}

// ----------------------------------------------------
// TEST CASE 7: DTAA Bridge (dtaa_bridge.html)
// ----------------------------------------------------
function testDtaaBridge() {
    console.log("\n--- Testing DTAA Bridge compileStatePayload ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/dtaa_bridge.html');

    // ── Scenario A: US Treaty Winner ─────────────────────────────────────────
    console.log("  Scenario A: Treaty Residency Winner = US");
    {
        const doc = new MockDocument();
        const win = Object.assign({}, mockWindow);
        const storage = Object.assign({}, mockStorage);
        storage.store = {};

        const indiaPayload = {
            residency_detail: { residency_classification: 'ROR' },
            dtaa: { dtaa_treaty_residence: 'us', dtaa_forced_nr: true, tax_residency_country: 'US' },
            tax_summary: { total_payable_inr: 250000 },
            profile: { full_name: 'Raj Sharma', tax_regime: 'NEW' }
        };
        const usPayload = {
            us_residency_detail: { residency_classification: 'RESIDENT_ALIEN', dtaa_treaty_residence: 'us', dtaa_forced_nra: false },
            tax_summary: { total_payable_usd: 18000 },
            profile: { full_name: 'Raj Sharma', filing_status: 'Single' }
        };
        const routerPayload = {
            jurisdiction: 'dual',
            base_tax_year: 2025,
            tie_breaker_winner: 'us'
        };

        storage.setItem('wising_layer1_india_state', JSON.stringify(indiaPayload));
        storage.setItem('wising_us_state', JSON.stringify(usPayload));
        storage.setItem('wising_router_state', JSON.stringify(routerPayload));

        const sandbox = {
            document: doc,
            window: win,
            localStorage: storage,
            crypto: crypto,
            alert: function(msg) { console.log("ALERT:", msg); },
            console: console,
            setTimeout: function() {},
            setInterval: function() {},
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
        Object.assign(sandbox, win);
        sandbox.window = sandbox;
        sandbox.self = sandbox;
        sandbox.globalThis = sandbox;

        // Pre-create the DOM elements evaluateResidencyGating() needs
        doc.getElementById('panel-india-to-us');
        doc.getElementById('panel-us-to-india');
        doc.getElementById('txt-gating-desc');
        doc.getElementById('sel-tie-breaker').value = 'us';
        doc.getElementById('json-visualizer');

        vm.createContext(sandbox);
        const codeWithExports = code + "\n; globalThis._compileStatePayload = compileStatePayload; globalThis._bridgeState = bridgeState;";
        vm.runInContext(codeWithExports, sandbox, { filename: 'dtaa_bridge.html [Script]' });

        // Simulate onload (populates indiaState / usState / routerState module vars)
        if (sandbox.window.onload) sandbox.window.onload();

        // Compile the DTAA payload
        sandbox._compileStatePayload();

        const rawCompiled = storage.getItem('wising_compiled_dtaa_state');
        if (!rawCompiled) throw new Error("Scenario A: wising_compiled_dtaa_state not written to localStorage");

        const compiled = JSON.parse(rawCompiled);

        // Structural assertions
        if (!compiled.compiled_timestamp) throw new Error("Scenario A: missing compiled_timestamp");
        if (compiled.base_tax_year !== 2025) throw new Error("Scenario A: base_tax_year mismatch – got " + compiled.base_tax_year);
        if (compiled.determined_jurisdiction !== 'dual') throw new Error("Scenario A: jurisdiction mismatch");
        if (compiled.treaty_residency_winner !== 'us') throw new Error("Scenario A: treaty_residency_winner should be 'us'");

        // Silo assertions
        if (!compiled.layer1_india_silo) throw new Error("Scenario A: layer1_india_silo is null");
        if (compiled.layer1_india_silo.residency_detail.residency_classification !== 'ROR')
            throw new Error("Scenario A: India silo residency_classification mismatch");

        if (!compiled.layer1_us_silo) throw new Error("Scenario A: layer1_us_silo is null");
        if (compiled.layer1_us_silo.us_residency_detail.residency_classification !== 'RESIDENT_ALIEN')
            throw new Error("Scenario A: US silo residency_classification mismatch");

        // Bridge state assertions (default values)
        if (!compiled.cross_border_reconciled_variables) throw new Error("Scenario A: cross_border_reconciled_variables missing");
        if (typeof compiled.cross_border_reconciled_variables.apportionment_us_ratio !== 'number')
            throw new Error("Scenario A: bridgeState.apportionment_us_ratio is not a number");
        if (!compiled.cross_border_reconciled_variables.treaty_documents)
            throw new Error("Scenario A: bridgeState.treaty_documents missing");

        console.log(`    ✓ compiled_timestamp present: ${compiled.compiled_timestamp}`);
        console.log(`    ✓ treaty_residency_winner: ${compiled.treaty_residency_winner}`);
        console.log(`    ✓ India silo ROR classification preserved`);
        console.log(`    ✓ US silo RESIDENT_ALIEN classification preserved`);
        console.log(`    ✓ bridge variables apportionment_us_ratio: ${compiled.cross_border_reconciled_variables.apportionment_us_ratio}`);
    }

    // ── Scenario B: India Treaty Winner ──────────────────────────────────────
    console.log("  Scenario B: Treaty Residency Winner = India");
    {
        const doc = new MockDocument();
        const win = Object.assign({}, mockWindow);
        const storage = Object.assign({}, mockStorage);
        storage.store = {};

        const routerPayload = {
            jurisdiction: 'dual',
            base_tax_year: 2024,
            tie_breaker_winner: 'india'
        };
        storage.setItem('wising_router_state', JSON.stringify(routerPayload));
        // No India / US state saved — silos should be null

        const sandbox = {
            document: doc,
            window: win,
            localStorage: storage,
            crypto: crypto,
            alert: function(msg) {},
            console: console,
            setTimeout: function() {},
            setInterval: function() {},
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
        Object.assign(sandbox, win);
        sandbox.window = sandbox;
        sandbox.self = sandbox;
        sandbox.globalThis = sandbox;

        doc.getElementById('panel-india-to-us');
        doc.getElementById('panel-us-to-india');
        doc.getElementById('txt-gating-desc');
        doc.getElementById('sel-tie-breaker').value = 'india';
        doc.getElementById('json-visualizer');

        vm.createContext(sandbox);
        const codeWithExports = code + "\n; globalThis._compileStatePayload = compileStatePayload; globalThis._bridgeState = bridgeState;";
        vm.runInContext(codeWithExports, sandbox, { filename: 'dtaa_bridge.html [Script B]' });

        if (sandbox.window.onload) sandbox.window.onload();
        sandbox._compileStatePayload();

        const compiled = JSON.parse(storage.getItem('wising_compiled_dtaa_state'));

        if (compiled.treaty_residency_winner !== 'india') throw new Error("Scenario B: treaty_residency_winner should be 'india'");
        if (compiled.base_tax_year !== 2024) throw new Error("Scenario B: base_tax_year should be 2024");
        if (compiled.layer1_india_silo !== null) throw new Error("Scenario B: india silo should be null when no state saved");
        if (compiled.layer1_us_silo !== null) throw new Error("Scenario B: us silo should be null when no state saved");

        console.log(`    ✓ treaty_residency_winner: ${compiled.treaty_residency_winner}`);
        console.log(`    ✓ base_tax_year: ${compiled.base_tax_year}`);
        console.log(`    ✓ silos correctly null when no layer1 state available`);
    }

    // ── Scenario C: No tie-breaker, no router state (defaults) ───────────────
    console.log("  Scenario C: No router state (all defaults)");
    {
        const doc = new MockDocument();
        const win = Object.assign({}, mockWindow);
        const storage = Object.assign({}, mockStorage);
        storage.store = {};

        const sandbox = {
            document: doc,
            window: win,
            localStorage: storage,
            crypto: crypto,
            alert: function(msg) {},
            console: console,
            setTimeout: function() {},
            setInterval: function() {},
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
        Object.assign(sandbox, win);
        sandbox.window = sandbox;
        sandbox.self = sandbox;
        sandbox.globalThis = sandbox;

        doc.getElementById('panel-india-to-us');
        doc.getElementById('panel-us-to-india');
        doc.getElementById('txt-gating-desc');
        doc.getElementById('sel-tie-breaker').value = 'none';
        doc.getElementById('json-visualizer');

        vm.createContext(sandbox);
        const codeWithExports = code + "\n; globalThis._compileStatePayload = compileStatePayload;";
        vm.runInContext(codeWithExports, sandbox, { filename: 'dtaa_bridge.html [Script C]' });

        if (sandbox.window.onload) sandbox.window.onload();
        sandbox._compileStatePayload();

        const compiled = JSON.parse(storage.getItem('wising_compiled_dtaa_state'));

        if (compiled.determined_jurisdiction !== 'none') throw new Error("Scenario C: jurisdiction should default to 'none'");
        if (compiled.treaty_residency_winner !== 'none') throw new Error("Scenario C: treaty_residency_winner should default to 'none'");
        if (compiled.base_tax_year !== 2025) throw new Error("Scenario C: base_tax_year should default to 2025");
 
        console.log(`    ✓ determined_jurisdiction defaults to: ${compiled.determined_jurisdiction}`);
        console.log(`    ✓ treaty_residency_winner defaults to: ${compiled.treaty_residency_winner}`);
        console.log(`    ✓ base_tax_year defaults to: ${compiled.base_tax_year}`);
    }
 
    console.log("  DTAA Bridge compileStatePayload verification passed!");
}

function testScorpCcorpBranches() {
    console.log("\n--- Testing S-Corp and C-Corp Branches Features ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) {},
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.usState = usState; globalThis.calculateBusinessIncomes = calculateBusinessIncomes; globalThis.normalizeScorpK1Item = normalizeScorpK1Item; globalThis.normalizeCcorpItem = normalizeCcorpItem;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    doc.dispatchEvent('DOMContentLoaded');
    if (sandbox.window.onload) sandbox.window.onload();

    // 1. Check Normalizers
    const normScorp = sandbox.normalizeScorpK1Item(null);
    if (!Array.isArray(normScorp.branches)) {
        throw new Error("normalizeScorpK1Item(null) should initialize empty branches array");
    }
    const normCcorp = sandbox.normalizeCcorpItem(null);
    if (!Array.isArray(normCcorp.branches)) {
        throw new Error("normalizeCcorpItem(null) should initialize empty branches array");
    }
    console.log("  ✓ Normalizers initialize branches array");

    // 2. S-Corp branches test
    sandbox.usState.income_us_source.s_corporations_k1 = [
        {
            id: 'scorp-k1-test-1',
            has_scorp_income: true,
            material_participation: 'active',
            ordinary_income_usd: 10000,
            sec179_deduction_usd: 2000,
            tax_basis_usd: 50000,
            branches: [
                {
                    id: 'scorp-branch-1',
                    branch_name: 'Branch A',
                    state: 'TX',
                    ordinary_income_usd: 5000,
                    sec179_deduction_usd: 1000,
                    assets: [
                        {
                            id: 'scorp-branch-asset-1',
                            name: 'Branch Computer',
                            class: '5-year',
                            cost: 10000,
                            sec179: 3000,
                            bonus: false
                        }
                    ]
                }
            ]
        }
    ];

    let biz = sandbox.calculateBusinessIncomes();
    // Expected:
    // Consolidated ordinary income = 10000 + 5000 = 15000
    // Consolidated S-Corp sec179 deduction = 2000 + 1000 = 3000
    // Asset Depr: 3000 sec179 + 7000 * 20% MACRS = 4400.
    // Net operating income = 15000 - 4400 = 10600.
    // Active Business Income = ordAllowed - sec179 = 10600 - 3000 = 7600.
    if (biz.activeBusinessIncome !== 7600) {
        throw new Error(`S-Corp branch activeBusinessIncome mismatch: expected 7600, got ${biz.activeBusinessIncome}`);
    }
    console.log("  ✓ S-Corp branch activeBusinessIncome: " + biz.activeBusinessIncome);

    // 2.5 Partnership branches test
    sandbox.usState.income_us_source.s_corporations_k1 = [];
    sandbox.usState.income_us_source.partnerships_k1 = [
        {
            id: 'part-k1-test-1',
            has_part_income: true,
            material_participation: 'active',
            ordinary_income_usd: 20000,
            sec179_deduction_usd: 4000,
            tax_basis_usd: 100000,
            partners: [
                { id: 'partner-1', name: 'Taxpayer', tin: '123-45-6789', type: 'limited', entity_type: 'individual', profit_end: 50.0, is_taxpayer: true }
            ],
            branches: [
                {
                    id: 'part-branch-1',
                    branch_name: 'Part Branch A',
                    state: 'NY',
                    ordinary_income_usd: 10000,
                    sec179_deduction_usd: 2000,
                    assets: [
                        {
                            id: 'part-branch-asset-1',
                            name: 'Branch Machine',
                            class: '7-year',
                            cost: 20000,
                            sec179: 5000,
                            bonus: false
                        }
                    ]
                }
            ]
        }
    ];

    biz = sandbox.calculateBusinessIncomes();
    // Expected:
    // Consolidated ordinary income = 20000 + 10000 = 30000. Scaled by 50% = 15000.
    // Consolidated Partnership sec179 deduction = 4000 + 2000 = 6000. Scaled by 50% = 3000.
    // Asset Depr: 5000 sec179 + 15000 * 14.29% MACRS = 7143.5. Scaled by 50% = 3571.75.
    // ordAllowed = 15000 - 3571.75 = 11428.25.
    // netOperating = 11428.25 - 3000 = 8428.25.
    if (biz.activeBusinessIncome !== 8428.25) {
        throw new Error(`Partnership branch activeBusinessIncome mismatch: expected 8428.25, got ${biz.activeBusinessIncome}`);
    }
    console.log("  ✓ Partnership branch activeBusinessIncome: " + biz.activeBusinessIncome);

    // 3. C-Corp branches test
    sandbox.usState.income_us_source.s_corporations_k1 = [];
    sandbox.usState.income_us_source.c_corporations_1120 = [
        {
            id: 'ccorp-test-1',
            has_ccorp: true,
            gross_receipts_usd: 50000,
            cogs_usd: 10000,
            operating_expenses_usd: 5000,
            branches: [
                {
                    id: 'ccorp-branch-1',
                    branch_name: 'C-Branch A',
                    state: 'CA',
                    gross_receipts_usd: 20000,
                    cogs_usd: 5000,
                    operating_expenses_usd: 2000,
                    assets: [
                        {
                            id: 'ccorp-branch-asset-1',
                            name: 'Branch Desk',
                            class: '5-year',
                            cost: 5000,
                            sec179: 1000,
                            bonus: false
                        }
                    ]
                }
            ]
        }
    ];

    biz = sandbox.calculateBusinessIncomes();
    // Expected C-Corp values:
    // gross = 50000 + 20000 = 70000
    // cogs = 10000 + 5000 = 15000
    // opex = 5000 + 2000 = 7000
    // Depr = 1000 sec179 + 4000 * 20% MACRS = 1800
    // taxable = 70000 - 15000 - 7000 - 1800 = 46200
    // corpTax = 46200 * 21% = 9702
    if (biz.cCorpTax !== 9702) {
        throw new Error(`C-Corp branch tax mismatch: expected 9702, got ${biz.cCorpTax}`);
    }
        console.log("  ✓ C-Corp branch tax: " + biz.cCorpTax);
}

function testItemizedCalculations() {
    console.log("\n--- Testing Entity-Level Itemized Recalculations ---");
    const code = getScriptCode('C:/Users/saarthak/.gemini/antigravity/scratch/tax-dashboard/layer1_us.html');
    
    const doc = new MockDocument();
    const win = Object.assign({}, mockWindow);
    const storage = Object.assign({}, mockStorage);
    storage.clear();
    
    const sandbox = {
        document: doc,
        window: win,
        localStorage: storage,
        crypto: crypto,
        alert: function(msg) {},
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
    Object.assign(sandbox, win);
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    
    vm.createContext(sandbox);
    const codeWithExports = code + "\n; globalThis.calculatePartCoreProfit = calculatePartCoreProfit; globalThis.calculateScorpCoreProfit = calculateScorpCoreProfit; globalThis.calculateCcorpCoreProfit = calculateCcorpCoreProfit; globalThis.calculateTrustCoreProfit = calculateTrustCoreProfit;";
    vm.runInContext(codeWithExports, sandbox, { filename: 'layer1_us.html [Script]' });
    
    doc.dispatchEvent('DOMContentLoaded');
    if (sandbox.window.onload) sandbox.window.onload();

    // 1. Test Partnership (calculatePartCoreProfit)
    const partCard = doc.createElement('div');
    partCard.id = 'part-card-1';
    doc.body.appendChild(partCard);
    
    const partGross = doc.createElement('input'); partGross.classList.add('part-gross-revenue'); partGross.value = '100,000'; partCard.appendChild(partGross);
    const partReturns = doc.createElement('input'); partReturns.classList.add('part-returns-allowances'); partReturns.value = '5,000'; partCard.appendChild(partReturns);
    const partCogs = doc.createElement('input'); partCogs.classList.add('part-cogs-itemized'); partCogs.value = '15,000'; partCard.appendChild(partCogs);
    const partMisc = doc.createElement('input'); partMisc.classList.add('part-misc-income'); partMisc.value = '2,000'; partCard.appendChild(partMisc);
    
    const partWages = doc.createElement('input'); partWages.classList.add('part-exp-wages'); partWages.value = '20,000'; partCard.appendChild(partWages);
    const partRent = doc.createElement('input'); partRent.classList.add('part-exp-rent'); partRent.value = '10,000'; partCard.appendChild(partRent);
    
    const partTotalExp = doc.createElement('input'); partTotalExp.classList.add('part-total-expenses'); partCard.appendChild(partTotalExp);
    const partBox1 = doc.createElement('input'); partBox1.classList.add('part-box1'); partCard.appendChild(partBox1);
    
    sandbox.calculatePartCoreProfit('part-card-1');
    
    if (Number(partTotalExp.value) !== 45000) {
        throw new Error(`Partnership itemized total expenses mismatch: expected 45000, got ${partTotalExp.value}`);
    }
    if (Number(partBox1.value) !== 52000) {
        throw new Error(`Partnership itemized core profit mismatch: expected 52000, got ${partBox1.value}`);
    }
    console.log("  ✓ Partnership itemized calculation verified successfully!");

    // 2. Test S-Corp (calculateScorpCoreProfit)
    const scorpCard = doc.createElement('div');
    scorpCard.id = 'scorp-card-1';
    doc.body.appendChild(scorpCard);
    
    const scorpGross = doc.createElement('input'); scorpGross.classList.add('scorp-gross-revenue'); scorpGross.value = '150,000'; scorpCard.appendChild(scorpGross);
    const scorpReturns = doc.createElement('input'); scorpReturns.classList.add('scorp-returns-allowances'); scorpReturns.value = '10,000'; scorpCard.appendChild(scorpReturns);
    const scorpCogs = doc.createElement('input'); scorpCogs.classList.add('scorp-cogs-itemized'); scorpCogs.value = '25,000'; scorpCard.appendChild(scorpCogs);
    const scorpMisc = doc.createElement('input'); scorpMisc.classList.add('scorp-misc-income'); scorpMisc.value = '5,000'; scorpCard.appendChild(scorpMisc);
    
    const scorpOfficer = doc.createElement('input'); scorpOfficer.classList.add('scorp-exp-officer'); scorpOfficer.value = '30,000'; scorpCard.appendChild(scorpOfficer);
    const scorpRent = doc.createElement('input'); scorpRent.classList.add('scorp-exp-rent'); scorpRent.value = '15,000'; scorpCard.appendChild(scorpRent);
    
    const scorpTotalExp = doc.createElement('input'); scorpTotalExp.classList.add('scorp-total-expenses'); scorpCard.appendChild(scorpTotalExp);
    const scorpBox1 = doc.createElement('input'); scorpBox1.classList.add('scorp-box1'); scorpCard.appendChild(scorpBox1);
    
    sandbox.calculateScorpCoreProfit('scorp-card-1');
    
    if (Number(scorpTotalExp.value) !== 70000) {
        throw new Error(`S-Corp itemized total expenses mismatch: expected 70000, got ${scorpTotalExp.value}`);
    }
    if (Number(scorpBox1.value) !== 75000) {
        throw new Error(`S-Corp itemized core profit mismatch: expected 75000, got ${scorpBox1.value}`);
    }
    console.log("  ✓ S-Corp itemized calculation verified successfully!");

    // 3. Test C-Corp (calculateCcorpCoreProfit)
    const ccorpCard = doc.createElement('div');
    ccorpCard.id = 'ccorp-card-1';
    doc.body.appendChild(ccorpCard);
    
    const ccorpGross = doc.createElement('input'); ccorpGross.classList.add('ccorp-gross-revenue'); ccorpGross.value = '200,000'; ccorpCard.appendChild(ccorpGross);
    const ccorpReturns = doc.createElement('input'); ccorpReturns.classList.add('ccorp-returns-allowances'); ccorpReturns.value = '8,000'; ccorpCard.appendChild(ccorpReturns);
    const ccorpCogs = doc.createElement('input'); ccorpCogs.classList.add('ccorp-cogs-itemized'); ccorpCogs.value = '40,000'; ccorpCard.appendChild(ccorpCogs);
    const ccorpMisc = doc.createElement('input'); ccorpMisc.classList.add('ccorp-misc-income'); ccorpMisc.value = '10,000'; ccorpCard.appendChild(ccorpMisc);
    
    const ccorpWages = doc.createElement('input'); ccorpWages.classList.add('ccorp-exp-wages'); ccorpWages.value = '50,000'; ccorpCard.appendChild(ccorpWages);
    const ccorpRent = doc.createElement('input'); ccorpRent.classList.add('ccorp-exp-rent'); ccorpRent.value = '20,000'; ccorpCard.appendChild(ccorpRent);
    
    const ccorpMainGross = doc.createElement('input'); ccorpMainGross.classList.add('ccorp-gross'); ccorpCard.appendChild(ccorpMainGross);
    const ccorpMainReturns = doc.createElement('input'); ccorpMainReturns.classList.add('ccorp-returns'); ccorpCard.appendChild(ccorpMainReturns);
    const ccorpMainCogs = doc.createElement('input'); ccorpMainCogs.classList.add('ccorp-cogs'); ccorpCard.appendChild(ccorpMainCogs);
    const ccorpMainMisc = doc.createElement('input'); ccorpMainMisc.classList.add('ccorp-misc'); ccorpCard.appendChild(ccorpMainMisc);
    const ccorpMainOpex = doc.createElement('input'); ccorpMainOpex.classList.add('ccorp-opex'); ccorpCard.appendChild(ccorpMainOpex);
    const ccorpMainWages = doc.createElement('input'); ccorpMainWages.classList.add('ccorp-wages'); ccorpCard.appendChild(ccorpMainWages);
    const ccorpMainRent = doc.createElement('input'); ccorpMainRent.classList.add('ccorp-rent'); ccorpCard.appendChild(ccorpMainRent);
    
    const ccorpTotalExp = doc.createElement('input'); ccorpTotalExp.classList.add('ccorp-total-expenses'); ccorpCard.appendChild(ccorpTotalExp);
    
    sandbox.calculateCcorpCoreProfit('ccorp-card-1');
    
    const parseVal = (val) => Number(String(val).replace(/,/g, '')) || 0;
    
    if (parseVal(ccorpTotalExp.value) !== 110000) {
        throw new Error(`C-Corp itemized total expenses mismatch: expected 110000, got ${ccorpTotalExp.value}`);
    }
    if (parseVal(ccorpMainGross.value) !== 200000) {
        throw new Error(`C-Corp main gross receipts mismatch: expected 200000, got ${ccorpMainGross.value}`);
    }
    if (parseVal(ccorpMainCogs.value) !== 40000) {
        throw new Error(`C-Corp main COGS mismatch: expected 40000, got ${ccorpMainCogs.value}`);
    }
    if (parseVal(ccorpMainOpex.value) !== 70000) {
        throw new Error(`C-Corp main operating expenses mismatch: expected 70000, got ${ccorpMainOpex.value}`);
    }
    if (parseVal(ccorpMainWages.value) !== 50000) {
        throw new Error(`C-Corp main wages mismatch: expected 50000, got ${ccorpMainWages.value}`);
    }
    if (parseVal(ccorpMainRent.value) !== 20000) {
        throw new Error(`C-Corp main rent mismatch: expected 20000, got ${ccorpMainRent.value}`);
    }
    console.log("  ✓ C-Corp itemized calculation verified successfully!");

    // 4. Test Trust & Estate (calculateTrustCoreProfit)
    const trustCard = doc.createElement('div');
    trustCard.id = 'trust-card-1';
    doc.body.appendChild(trustCard);
    
    const trustGross = doc.createElement('input'); trustGross.classList.add('trust-gross-revenue'); trustGross.value = '120,000'; trustCard.appendChild(trustGross);
    const trustReturns = doc.createElement('input'); trustReturns.classList.add('trust-returns-allowances'); trustReturns.value = '2,000'; trustCard.appendChild(trustReturns);
    const trustCogs = doc.createElement('input'); trustCogs.classList.add('trust-cogs-itemized'); trustCogs.value = '10,000'; trustCard.appendChild(trustCogs);
    const trustMisc = doc.createElement('input'); trustMisc.classList.add('trust-misc-income'); trustMisc.value = '4,000'; trustCard.appendChild(trustMisc);
    
    const trustFidFees = doc.createElement('input'); trustFidFees.classList.add('trust-fiduciary-fees'); trustFidFees.value = '3,000'; trustCard.appendChild(trustFidFees);
    const trustProfFees = doc.createElement('input'); trustProfFees.classList.add('trust-professional-fees'); trustProfFees.value = '2,000'; trustCard.appendChild(trustProfFees);
    const trustAdminExp = doc.createElement('input'); trustAdminExp.classList.add('trust-admin-expenses'); trustAdminExp.value = '1,500'; trustCard.appendChild(trustAdminExp);
    
    const trustWages = doc.createElement('input'); trustWages.classList.add('trust-exp-wages'); trustWages.value = '15,000'; trustCard.appendChild(trustWages);
    const trustRent = doc.createElement('input'); trustRent.classList.add('trust-exp-rent'); trustRent.value = '8,000'; trustCard.appendChild(trustRent);
    
    const trustTotalExp = doc.createElement('input'); trustTotalExp.classList.add('trust-total-expenses'); trustCard.appendChild(trustTotalExp);
    const trustBox1 = doc.createElement('input'); trustBox1.classList.add('trust-box1'); trustCard.appendChild(trustBox1);
    
    sandbox.calculateTrustCoreProfit('trust-card-1');
    
    if (parseVal(trustTotalExp.value) !== 39500) {
        throw new Error(`Trust/Estate itemized total expenses mismatch: expected 39500, got ${trustTotalExp.value}`);
    }
    if (parseVal(trustBox1.value) !== 82500) {
        throw new Error(`Trust/Estate itemized ordinary income mismatch: expected 82500, got ${trustBox1.value}`);
    }
    console.log("  ✓ Trust/Estate itemized calculation verified successfully!");
}

try {
    testUSSpecialist();
    testIndiaSpecialist();
    testW2Restructuring();
    testSelfEmploymentRestructuring();
    testBusinessTaxation();
    test1099Compliance();
    testScorpCcorpBranches();
    testItemizedCalculations();
    testDtaaBridge();
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
