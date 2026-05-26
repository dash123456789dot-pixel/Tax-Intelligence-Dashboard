import React, { useEffect } from 'react';


export default function JurisdictionRouter() {
    useEffect(() => {
        const scriptId = 'router-logic';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.innerHTML = `(function() {
// ═══════════════════════════════════════════════════════════════════════
    // STATE ENGINE
    // ═══════════════════════════════════════════════════════════════════════
    const routerState = {
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
    };

    const allQuestionIds = [
        "is_indian_citizen",
        "is_pio_or_oci",
        "india_days",
        "has_india_source_income_or_assets",
        "is_us_citizen",
        "has_green_card",
        "was_in_us_this_year",
        "us_days",
        "has_us_source_income_or_assets",
        "liable_to_tax_in_another_country",
        "left_india_for_employment_this_year"
    ];

    let activeQuestions = [];
    let currentQuestionIndex = 0;

    // ═══════════════════════════════════════════════════════════════════════
    // CORE DERIVED CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════
    function evaluateFlags() {
        // 1. Evaluate India Flag
        routerState.india_flag = 
            routerState.is_indian_citizen === true ||
            routerState.is_pio_or_oci === true ||
            (routerState.india_days !== null && routerState.india_days > 0) ||
            routerState.has_india_source_income_or_assets === true;

        // 2. Evaluate US Flag
        routerState.us_flag = 
            routerState.is_us_citizen === true ||
            routerState.has_green_card === true ||
            (routerState.was_in_us_this_year === true && routerState.us_days !== null && routerState.us_days > 0) ||
            routerState.has_us_source_income_or_assets === true;

        // 3. Evaluate Jurisdiction
        if (routerState.india_flag && routerState.us_flag) {
            routerState.jurisdiction = "dual";
        } else if (routerState.india_flag && !routerState.us_flag) {
            routerState.jurisdiction = "india_only";
        } else if (!routerState.india_flag && routerState.us_flag) {
            routerState.jurisdiction = "us_only";
        } else {
            routerState.jurisdiction = "none";
        }

        localStorage.setItem('wising_router_state', JSON.stringify(routerState));
    }

    function getQuestionsToShow() {
        const list = [];
        
        // Q1 (Citizen) is always shown
        list.push("is_indian_citizen");
        
        // Q2 (PIO/OCI) shown if Q1 is false
        if (routerState.is_indian_citizen === false) {
            list.push("is_pio_or_oci");
        }
        
        // Q3 (India days) always shown
        list.push("india_days");
        
        // Q4 (India assets) always shown
        list.push("has_india_source_income_or_assets");
        
        // Q5 (US Citizen) always shown
        list.push("is_us_citizen");
        
        // Q6 (Green Card) shown if Q5 is false
        if (routerState.is_us_citizen === false) {
            list.push("has_green_card");
        }
        
        // Q7 (Was in US) always shown
        list.push("was_in_us_this_year");
        
        // Q7b (US days) shown if Q7 is true
        if (routerState.was_in_us_this_year === true) {
            list.push("us_days");
        }
        
        // Q7c (US assets) always shown
        list.push("has_us_source_income_or_assets");
        
        // Q8 (Liable to tax other) shown if Q1 is true
        if (routerState.is_indian_citizen === true) {
            list.push("liable_to_tax_in_another_country");
        }
        
        // Q9 (Left for employment) shown if Q1 is true
        if (routerState.is_indian_citizen === true) {
            list.push("left_india_for_employment_this_year");
        }
        
        return list;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TYPEFORM TRANSITIONS & NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════
    function updateActiveQuestionsList() {
        activeQuestions = getQuestionsToShow();
        
        if (currentQuestionIndex >= activeQuestions.length) {
            currentQuestionIndex = activeQuestions.length; // Complete screen
        }
    }

    function renderQuestionnaireSlide() {
        updateActiveQuestionsList();
        
        // Hide all questions first
        const allSlides = document.querySelectorAll('.question-slide');
        allSlides.forEach(slide => {
            slide.classList.remove('active', 'prev-slide');
        });

        const isComplete = currentQuestionIndex >= activeQuestions.length;

        // Progress bar fill estimation
        const progressPct = isComplete ? 100 : Math.round((currentQuestionIndex / activeQuestions.length) * 100);
        document.getElementById('progress-bar-fill').style.width = \`\${progressPct}%\`;

        // Index label display
        const indexLabel = document.getElementById('question-index-disp');
        const resetTopBtn = document.getElementById('btn-reset-top');
        
        const qHeader = document.getElementById('questionnaire-header');
        const qProgress = document.getElementById('questionnaire-progress');
        const qFooter = document.getElementById('questionnaire-footer');

        if (isComplete) {
            // Hide standard questionnaire headers, progress, and footers to give report full space
            qHeader.classList.add('hidden');
            qProgress.classList.add('hidden');
            qFooter.classList.add('hidden');
            
            const completeSlide = document.getElementById('flow-complete-slide');
            completeSlide.classList.add('active');
            
            // Render Report on complete slide
            renderCompletionReport();
        } else {
            // Restore visibility of questionnaire shell components
            qHeader.classList.remove('hidden');
            qProgress.classList.remove('hidden');
            qFooter.classList.remove('hidden');
            resetTopBtn.style.display = "block";
            
            const activeId = activeQuestions[currentQuestionIndex];
            indexLabel.textContent = \`Q\${currentQuestionIndex + 1} / Q\${activeQuestions.length}\`;
            
            const activeSlide = document.querySelector(\`[data-question-id="\${activeId}"]\`);
            if (activeSlide) {
                activeSlide.classList.add('active');
                
                const numInput = activeSlide.querySelector('input[type="number"]');
                if (numInput) {
                    numInput.focus();
                }
            }

            // Mark previous slides to animate out to the top
            for (let i = 0; i < currentQuestionIndex; i++) {
                const prevId = activeQuestions[i];
                const prevSlide = document.querySelector(\`[data-question-id="\${prevId}"]\`);
                if (prevSlide) {
                    prevSlide.classList.add('prev-slide');
                }
            }

            // Sync visual button borders depending on active selection
            syncSelectedButtonBorders(activeId);
        }

        // Show/hide Back button appropriately
        const backBtn = document.getElementById('nav-btn-prev');
        if (currentQuestionIndex === 0) {
            backBtn.style.opacity = '0.2';
            backBtn.style.pointerEvents = 'none';
        } else {
            backBtn.style.opacity = '1';
            backBtn.style.pointerEvents = 'auto';
        }
    }

    function syncSelectedButtonBorders(questionId) {
        const val = routerState[questionId];
        const slide = document.querySelector(\`[data-question-id="\${questionId}"]\`);
        if (!slide) return;

        const yesBtn = slide.querySelector('.bool-btn-yes');
        const noBtn = slide.querySelector('.bool-btn-no');

        if (yesBtn && noBtn) {
            yesBtn.classList.remove('input-pill-selected');
            noBtn.classList.remove('input-pill-selected');

            if (val === true) {
                yesBtn.classList.add('input-pill-selected');
            } else if (val === false) {
                noBtn.classList.add('input-pill-selected');
            }
        }

        // Days inputs sync
        if (questionId === 'india_days' || questionId === 'us_days') {
            const inputVal = routerState[questionId];
            const numInput = document.getElementById(\`\${questionId.replace('_', '-')}-input\`);
            const sliderInput = document.getElementById(\`\${questionId.replace('_', '-')}-slider\`);
            if (numInput && sliderInput) {
                numInput.value = inputVal !== null ? inputVal : '';
                sliderInput.value = inputVal !== null ? inputVal : 0;
            }
        }
    }

    function advanceQuestion() {
        updateActiveQuestionsList();
        if (currentQuestionIndex < activeQuestions.length) {
            const activeId = activeQuestions[currentQuestionIndex];
            
            const val = routerState[activeId];
            if (val === null) {
                if (activeId === 'india_days' || activeId === 'us_days') {
                    routerState[activeId] = 0;
                    evaluateFlags();
                } else {
                    const slide = document.querySelector(\`[data-question-id="\${activeId}"]\`);
                    if (slide) {
                        slide.classList.add('translate-y-2');
                        setTimeout(() => slide.classList.remove('translate-y-2'), 150);
                    }
                    return;
                }
            }

            currentQuestionIndex++;
            renderQuestionnaireSlide();
        }
    }

    function regressQuestionnaire() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestionnaireSlide();
        }
    }

    function resetQuestionnaire() {
        for (const key in routerState) {
            if (key === 'india_flag' || key === 'us_flag') {
                routerState[key] = false;
            } else if (key === 'jurisdiction') {
                routerState[key] = 'none';
            } else {
                routerState[key] = null;
            }
        }
        currentQuestionIndex = 0;
        evaluateFlags();
        
        // Clear all DOM text elements
        document.getElementById('india-days-input').value = '';
        document.getElementById('india-days-slider').value = 0;
        document.getElementById('us-days-input').value = '';
        document.getElementById('us-days-slider').value = 0;

        renderQuestionnaireSlide();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HANDLERS FOR USER INPUTS
    // ═══════════════════════════════════════════════════════════════════════
    function handleBoolInput(questionId, value) {
        routerState[questionId] = value;
        
        // Clean up child branches if main parent changes
        if (questionId === 'is_indian_citizen') {
            if (value === true) {
                routerState.is_pio_or_oci = null;
            } else {
                routerState.liable_to_tax_in_another_country = null;
                routerState.left_india_for_employment_this_year = null;
            }
        }
        if (questionId === 'is_us_citizen') {
            if (value === true) {
                routerState.has_green_card = null;
            }
        }
        if (questionId === 'was_in_us_this_year') {
            if (value === false) {
                routerState.us_days = null;
            }
        }

        evaluateFlags();
        syncSelectedButtonBorders(questionId);

        setTimeout(() => {
            if (activeQuestions[currentQuestionIndex] === questionId) {
                advanceQuestion();
            }
        }, 300);
    }

    function handleIntInput(questionId, value) {
        const intVal = value === '' ? null : parseInt(value);
        routerState[questionId] = intVal;
        
        const sliderId = \`\${questionId.replace('_', '-')}-slider\`;
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.value = intVal !== null ? intVal : 0;
        }

        evaluateFlags();
    }

    function syncDaysSlider(questionId, value) {
        const intVal = parseInt(value);
        routerState[questionId] = intVal;

        const inputId = \`\${questionId.replace('_', '-')}-input\`;
        const input = document.getElementById(inputId);
        if (input) {
            input.value = intVal;
        }

        evaluateFlags();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER FINAL REPORT ON COMPLETION SLIDE
    // ═══════════════════════════════════════════════════════════════════════
    function renderCompletionReport() {
        const resultBadge = document.getElementById('result-badge');
        const resultDesc = document.getElementById('result-desc');
        const badgIndia = document.getElementById('res-badge-india');
        const badgUS = document.getElementById('res-badge-us');
        
        const btnIndia = document.getElementById('action-btn-india');
        const btnUS = document.getElementById('action-btn-us');

        // Hide action links initially
        btnIndia.classList.add('hidden');
        btnUS.classList.add('hidden');

        // Set colors and badges according to jurisdiction
        if (routerState.jurisdiction === 'dual') {
            resultBadge.textContent = "DUAL JURISDICTION";
            resultBadge.className = "text-2xl lg:text-3xl font-black tracking-widest uppercase bg-gradient-to-r from-brandGold to-brandCyan -webkit-background-clip: text -webkit-text-fill-color: transparent heading-silver-shimmer py-3 px-6 rounded-2xl bg-white/5 border border-brandGold/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]";
            resultDesc.innerHTML = "Exposure detected under **both India and US tax codes**.<br><span class='text-brandGold font-bold animate-pulse mt-3 inline-block'>Redirecting to India Specialist compliance workspace automatically...</span>";
            
            btnIndia.classList.remove('hidden');
            btnUS.classList.remove('hidden');
            
            setTimeout(() => {
                window.location.href = 'layer1_india.html';
            }, 1800);
        } else if (routerState.jurisdiction === 'india_only') {
            resultBadge.textContent = "INDIA ONLY";
            resultBadge.className = "text-2xl lg:text-3xl font-black tracking-widest uppercase text-brandGold py-3 px-6 rounded-2xl bg-brandGold/10 border border-brandGold/30 shadow-[0_0_20px_rgba(212,175,55,0.1)]";
            resultDesc.innerHTML = "Exposure detected under the **India tax code only**.<br><span class='text-brandGold font-bold animate-pulse mt-3 inline-block'>Redirecting to India Specialist compliance workspace automatically...</span>";
            
            btnIndia.classList.remove('hidden');
            
            setTimeout(() => {
                window.location.href = 'layer1_india.html';
            }, 1800);
        } else if (routerState.jurisdiction === 'us_only') {
            resultBadge.textContent = "US ONLY";
            resultBadge.className = "text-2xl lg:text-3xl font-black tracking-widest uppercase text-brandCyan py-3 px-6 rounded-2xl bg-brandCyan/10 border border-brandCyan/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]";
            resultDesc.innerHTML = "Exposure detected under the **US tax code only**.<br><span class='text-brandCyan font-bold animate-pulse mt-3 inline-block'>Redirecting to Salaries & RSUs (US) workspace automatically...</span>";
            
            btnUS.classList.remove('hidden');
            
            setTimeout(() => {
                window.location.href = 'income.html';
            }, 1800);
        } else {
            resultBadge.textContent = "NONE";
            resultBadge.className = "text-2xl lg:text-3xl font-black tracking-widest uppercase text-white/20 py-3 px-6 rounded-2xl bg-white/5 border border-white/10";
            resultDesc.textContent = "No tax exposure detected in either region. Instantiation of specialist compliance modules is locked. Surfaced for manual review.";
        }

        // India exposure status badges
        if (routerState.india_flag) {
            badgIndia.textContent = "ACTIVE";
            badgIndia.className = "px-2 py-0.5 rounded text-[9px] font-black bg-brandGold/20 border border-brandGold/40 text-brandGold uppercase shadow-[0_0_10px_rgba(212,175,55,0.15)]";
        } else {
            badgIndia.textContent = "INACTIVE";
            badgIndia.className = "px-2 py-0.5 rounded text-[9px] font-black border border-white/15 bg-white/5 text-white/30 uppercase";
        }

        // US exposure status badges
        if (routerState.us_flag) {
            badgUS.textContent = "ACTIVE";
            badgUS.className = "px-2 py-0.5 rounded text-[9px] font-black bg-brandCyan/20 border border-brandCyan/40 text-brandCyan uppercase shadow-[0_0_10px_rgba(6,182,212,0.15)]";
        } else {
            badgUS.textContent = "INACTIVE";
            badgUS.className = "px-2 py-0.5 rounded text-[9px] font-black border border-white/15 bg-white/5 text-white/30 uppercase";
        }

        // Render checklist rows
        renderChecklistReportRow('res-chk-india-citizen', routerState.is_indian_citizen === true, routerState.is_indian_citizen);
        renderChecklistReportRow('res-chk-india-pio', routerState.is_pio_or_oci === true, routerState.is_pio_or_oci);
        renderChecklistReportRow('res-chk-india-days', routerState.india_days !== null && routerState.india_days > 0, routerState.india_days);
        renderChecklistReportRow('res-chk-india-source', routerState.has_india_source_income_or_assets === true, routerState.has_india_source_income_or_assets);

        const chkLiable = document.getElementById('res-chk-india-liable');
        const chkEmployment = document.getElementById('res-chk-india-employment');
        if (routerState.is_indian_citizen === true) {
            chkLiable.classList.remove('hidden');
            chkEmployment.classList.remove('hidden');
            renderChecklistReportRow('res-chk-india-liable', routerState.liable_to_tax_in_another_country === true, routerState.liable_to_tax_in_another_country);
            renderChecklistReportRow('res-chk-india-employment', routerState.left_india_for_employment_this_year === true, routerState.left_india_for_employment_this_year);
        } else {
            chkLiable.classList.add('hidden');
            chkEmployment.classList.add('hidden');
        }

        renderChecklistReportRow('res-chk-us-citizen', routerState.is_us_citizen === true, routerState.is_us_citizen);
        renderChecklistReportRow('res-chk-us-gc', routerState.has_green_card === true, routerState.has_green_card);
        renderChecklistReportRow('res-chk-us-days', routerState.was_in_us_this_year === true && routerState.us_days !== null && routerState.us_days > 0, routerState.us_days);
        renderChecklistReportRow('res-chk-us-source', routerState.has_us_source_income_or_assets === true, routerState.has_us_source_income_or_assets);
    }

    function renderChecklistReportRow(elementId, isMet, val) {
        const item = document.getElementById(elementId);
        if (!item) return;

        item.classList.remove('text-white/40', 'text-brandGreen', 'font-semibold', 'text-white/20');

        if (val === null) {
            item.innerHTML = \`<span>[ ]</span> <span>\${item.innerText.substring(4)}</span>\`;
            item.classList.add('text-white/20');
        } else if (isMet) {
            item.innerHTML = \`<span class="text-brandGreen font-bold font-mono">[x]</span> <span class="text-white/80">\${item.innerText.substring(4)}</span>\`;
            item.classList.add('text-brandGreen', 'font-semibold');
        } else {
            item.innerHTML = \`<span>[o]</span> <span class="text-white/40">\${item.innerText.substring(4)}</span>\`;
            item.classList.add('text-white/40');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // KEYBOARD NAVIGATION LISTENERS
    // ═══════════════════════════════════════════════════════════════════════
    window.addEventListener('keydown', function(e) {
        if (document.activeElement.tagName === 'INPUT' && e.key !== 'Enter') {
            return;
        }

        const activeId = activeQuestions[currentQuestionIndex];
        const isComplete = currentQuestionIndex >= activeQuestions.length;

        if (isComplete) return;

        if (e.key === 'y' || e.key === 'Y' || e.key === '1') {
            const slide = document.querySelector(\`[data-question-id="\${activeId}"]\`);
            if (slide && slide.querySelector('.bool-btn-yes')) {
                handleBoolInput(activeId, true);
            }
        } else if (e.key === 'n' || e.key === 'N' || e.key === '2') {
            const slide = document.querySelector(\`[data-question-id="\${activeId}"]\`);
            if (slide && slide.querySelector('.bool-btn-no')) {
                handleBoolInput(activeId, false);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            advanceQuestion();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            regressQuestionnaire();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            advanceQuestion();
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STABLE HOVER NAVIGATION SIDEBAR MENU
    // ═══════════════════════════════════════════════════════════════════════
    (function() {
        const trigger = document.getElementById('nav-trigger-zone');
        const menu = document.getElementById('sidebar-menu');
        let timeout;

        const openMenu = () => {
            clearTimeout(timeout);
            menu.classList.remove('opacity-0', 'invisible', 'pointer-events-none');
            menu.classList.add('opacity-100', 'visible', 'pointer-events-auto');
        };

        const closeMenu = () => {
            timeout = setTimeout(() => {
                menu.classList.remove('opacity-100', 'visible', 'pointer-events-auto');
                menu.classList.add('opacity-0', 'invisible', 'pointer-events-none');
            }, 150);
        };

        trigger.addEventListener('mouseenter', openMenu);
        trigger.addEventListener('mouseleave', closeMenu);
        menu.addEventListener('mouseenter', openMenu);
        menu.addEventListener('mouseleave', closeMenu);
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    evaluateFlags();
    renderQuestionnaireSlide();
initOnload();

})();`;
            document.body.appendChild(script);
        }

        return () => {
            const script = document.getElementById('router-logic');
            if (script) script.remove();
        };
    }, []);

    return (
        <div dangerouslySetInnerHTML={{ __html: "\r\n\r\n<div id=\"dashboard-shell\">\r\n<!-- BEGIN: Navigation -->\r\n<header class=\"sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/5\">\r\n    <div class=\"max-w-[1440px] mx-auto px-4 lg:px-8 h-20 flex items-center justify-between\">\r\n        <div class=\"flex items-center space-x-4 lg:space-x-12\">\r\n            <div id=\"nav-trigger-zone\" class=\"relative group py-6 -my-6 cursor-pointer\">\r\n                <button class=\"text-white flex flex-col justify-center items-start gap-1.5 focus:outline-none\">\r\n                    <span class=\"w-6 h-[2px] bg-current rounded-full\"></span>\r\n                    <span class=\"w-4 h-[2px] bg-current rounded-full transition-all group-hover:w-6\"></span>\r\n                    <span class=\"w-6 h-[2px] bg-current rounded-full\"></span>\r\n                </button>\r\n                <!-- Sidebar Menu Drawer -->\r\n                <div id=\"sidebar-menu\" class=\"fixed left-0 top-20 bottom-0 w-80 bg-black opacity-0 invisible transition-all duration-300 z-50 border-r border-white/5 pointer-events-none\">\r\n                    <div class=\"flex flex-col text-[11px] font-bold tracking-[0.15em] uppercase text-white/50 pt-6\">\r\n                        <a href=\"index.html\" class=\"flex items-center px-10 py-5 hover:bg-white/5 transition-colors\">Tax Intelligence</a>\r\n                        <a href=\"income.html\" class=\"flex items-center px-10 py-5 hover:bg-white/5 transition-colors\">Salaries & RSUs</a>\r\n                        <a href=\"router.html\" class=\"flex items-center px-10 py-5 bg-[#111] text-white border-l-4 border-white transition-colors\">Jurisdiction Router</a>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <a href=\"index.html\" class=\"flex items-center space-x-3 hover:opacity-80 transition-opacity\">\r\n                <div class=\"w-8 h-8 shrink-0 bg-brandGold rounded flex items-center justify-center text-black font-black text-lg\">W</div>\r\n                <span class=\"hidden sm:inline text-xs font-black uppercase tracking-[0.4em] text-white\">Wising Intelligence</span>\r\n            </a>\r\n        </div>\r\n        <div class=\"flex items-center space-x-4 lg:space-x-8\">\r\n            <div class=\"hidden sm:flex items-center space-x-4\">\r\n                <span class=\"w-2 h-2 rounded-full bg-brandGreen animate-pulse\"></span>\r\n                <span class=\"text-[10px] font-black text-white/40 uppercase tracking-widest\">Router Mode: Active</span>\r\n            </div>\r\n            <div class=\"hidden sm:block w-px h-6 bg-white/10\"></div>\r\n            <button class=\"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50\">\r\n                <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle></svg>\r\n            </button>\r\n        </div>\r\n    </div>\r\n</header>\r\n\r\n<main class=\"max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-16 flex items-center justify-center min-h-[calc(100vh-80px)]\">\r\n\r\n    <!-- CENTERED TYPEFORM CARD -->\r\n    <div id=\"questionnaire-card\" class=\"w-full max-w-3xl flex flex-col justify-between glass-card p-6 lg:p-12 relative overflow-hidden min-h-[460px] lg:min-h-[520px] transition-all duration-500\">\r\n        \r\n        <!-- Header: Section indicator + Reset -->\r\n        <div id=\"questionnaire-header\" class=\"flex justify-between items-center mb-6 relative z-10\">\r\n            <div>\r\n                <span class=\"px-2 py-1 bg-brandGold/20 border border-brandGold/40 text-[9px] font-black text-brandGold uppercase tracking-widest rounded-md\">Layer 0 Router v4.0</span>\r\n                <span id=\"question-index-disp\" class=\"text-xs font-bold text-white/40 ml-4 font-mono\">Q1 / Q9</span>\r\n            </div>\r\n            <button id=\"btn-reset-top\" onclick=\"resetQuestionnaire()\" class=\"text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest px-3 py-1.5 border border-white/10 hover:border-white/30 rounded-lg transition-all\">\r\n                Reset Flow\r\n            </button>\r\n        </div>\r\n\r\n        <!-- Progress Bar -->\r\n        <div id=\"questionnaire-progress\" class=\"w-full bg-white/5 h-1 rounded-full overflow-hidden mb-8 relative z-10\">\r\n            <div id=\"progress-bar-fill\" class=\"bg-brandGold h-full w-[10%] transition-all duration-300\"></div>\r\n        </div>\r\n\r\n        <!-- Dynamic Questions Container -->\r\n        <div id=\"questions-viewport\" class=\"flex-grow relative min-h-[280px]\">\r\n            \r\n            <!-- Q1: Indian Citizen -->\r\n            <div data-question-id=\"is_indian_citizen\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 01</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-8 tracking-tight font-display\">Are you an Indian citizen?</h2>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('is_indian_citizen', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('is_indian_citizen', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Flag Role: Contributes to India Flag. Gates employment-departure & other country liability questions.</p>\r\n            </div>\r\n\r\n            <!-- Q2: PIO or OCI -->\r\n            <div data-question-id=\"is_pio_or_oci\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 02 (Conditional)</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-8 tracking-tight font-display\">Are you a Person of Indian Origin (PIO) or OCI cardholder?</h2>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('is_pio_or_oci', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('is_pio_or_oci', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Enabled if: Non-Indian Citizen. Flag Role: Pre-filled for the 120-day visitor path (s.6(6)(c)).</p>\r\n            </div>\r\n\r\n            <!-- Q3: India Days -->\r\n            <div data-question-id=\"india_days\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 03</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-2 tracking-tight font-display\">How many days were you physically present in India this tax year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-6 uppercase tracking-widest font-mono\">1 April 2025 – 31 March 2026</p>\r\n                <div class=\"space-y-6\">\r\n                    <div class=\"relative max-w-sm\">\r\n                        <input type=\"number\" min=\"0\" max=\"366\" placeholder=\"0\" id=\"india-days-input\" oninput=\"handleIntInput('india_days', this.value)\" class=\"w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-3xl font-black text-white focus:border-brandGold/50 outline-none transition-colors\">\r\n                        <span class=\"absolute right-4 top-1/2 -translate-y-1/2 font-bold text-white/20\">Days</span>\r\n                    </div>\r\n                    <input type=\"range\" min=\"0\" max=\"366\" value=\"0\" id=\"india-days-slider\" oninput=\"syncDaysSlider('india_days', this.value)\" class=\"w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brandGold\">\r\n                </div>\r\n                <div class=\"flex gap-4 mt-8\">\r\n                    <button onclick=\"advanceQuestion()\" class=\"px-6 py-3 bg-brandGold text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center gap-2\">\r\n                        <span>Continue</span>\r\n                        <kbd class=\"hidden sm:inline px-1.5 py-0.5 bg-black/10 rounded text-[9px] font-mono text-black/50 border border-black/5\">Enter</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Flag Role: india_days > 0 contributes to india_flag. Pre-filled into layer1_india residency engine.</p>\r\n            </div>\r\n\r\n            <!-- Q4: India Source Income or Assets -->\r\n            <div data-question-id=\"has_india_source_income_or_assets\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 04</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-4 tracking-tight font-display\">Do you have any India-source income or Indian-situs assets this year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-8 leading-relaxed\">INCLUDES: NRO/NRE interest, Indian dividends, rental income, capital gains, salary/pension, property, bank accounts, demat holdings, or mutual funds.</p>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('has_india_source_income_or_assets', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('has_india_source_income_or_assets', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">v4.0 Rule: Replaces the old 15L threshold. Any amount of India-source income creates taxing rights.</p>\r\n            </div>\r\n\r\n            <!-- Q5: US Citizen -->\r\n            <div data-question-id=\"is_us_citizen\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandCyan font-bold text-xs uppercase tracking-widest mb-3\">Question 05</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-8 tracking-tight font-display\">Are you a US citizen?</h2>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('is_us_citizen', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('is_us_citizen', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Flag Role: If true, us_flag is set to true unconditionally. US has worldwide taxing rights for all citizens.</p>\r\n            </div>\r\n\r\n            <!-- Q6: US Green Card -->\r\n            <div data-question-id=\"has_green_card\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandCyan font-bold text-xs uppercase tracking-widest mb-3\">Question 06 (Conditional)</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-8 tracking-tight font-display\">Do you hold a valid US Green Card (Form I-551)?</h2>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('has_green_card', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('has_green_card', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Enabled if: Non-US Citizen. Note: An unsurrendered Green Card creates taxing rights even if expired.</p>\r\n            </div>\r\n\r\n            <!-- Q7: Was in US this year -->\r\n            <div data-question-id=\"was_in_us_this_year\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandCyan font-bold text-xs uppercase tracking-widest mb-3\">Question 07</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-4 tracking-tight font-display\">Were you physically present in the United States at any point this calendar year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-8 uppercase tracking-widest font-mono\">1 January 2026 – 31 December 2026</p>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('was_in_us_this_year', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('was_in_us_this_year', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Evaluated completely independently of India days. No cross-crossing gates.</p>\r\n            </div>\r\n\r\n            <!-- Q7b: US Days -->\r\n            <div data-question-id=\"us_days\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandCyan font-bold text-xs uppercase tracking-widest mb-3\">Question 07b (Conditional)</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-2 tracking-tight font-display\">Exactly how many days were you in the US this calendar year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-6 uppercase tracking-widest font-mono\">1 January 2026 – 31 December 2026</p>\r\n                <div class=\"space-y-6\">\r\n                    <div class=\"relative max-w-sm\">\r\n                        <input type=\"number\" min=\"0\" max=\"365\" placeholder=\"0\" id=\"us-days-input\" oninput=\"handleIntInput('us_days', this.value)\" class=\"w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-3xl font-black text-white focus:border-brandCyan/50 outline-none transition-colors\">\r\n                        <span class=\"absolute right-4 top-1/2 -translate-y-1/2 font-bold text-white/20\">Days</span>\r\n                    </div>\r\n                    <input type=\"range\" min=\"0\" max=\"365\" value=\"0\" id=\"us-days-slider\" oninput=\"syncDaysSlider('us_days', this.value)\" class=\"w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brandCyan\">\r\n                </div>\r\n                <div class=\"flex gap-4 mt-8\">\r\n                    <button onclick=\"advanceQuestion()\" class=\"px-6 py-3 bg-brandCyan text-black font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center gap-2\">\r\n                        <span>Continue</span>\r\n                        <kbd class=\"hidden sm:inline px-1.5 py-0.5 bg-black/10 rounded text-[9px] font-mono text-black/50 border border-black/5\">Enter</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Flag Role: us_days > 0 and was_in_us = true contributes to us_flag.</p>\r\n            </div>\r\n\r\n            <!-- Q7c: US Source Income or Assets -->\r\n            <div data-question-id=\"has_us_source_income_or_assets\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandCyan font-bold text-xs uppercase tracking-widest mb-3\">Question 07c</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-4 tracking-tight font-display\">Do you have any US-source income or US-situs assets this year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-8 leading-relaxed\">INCLUDES: US salary, RSU vesting, US rental, US dividends, US bank interest, US brokerage accounts, or US real estate holdings.</p>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('has_us_source_income_or_assets', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('has_us_source_income_or_assets', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandCyan/50 rounded-xl bg-white/5 hover:bg-brandCyan/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Triggers US filing obligation through ECI / FDAP or withholding events.</p>\r\n            </div>\r\n\r\n            <!-- Q8: Liable to Tax in Another Country -->\r\n            <div data-question-id=\"liable_to_tax_in_another_country\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 08 (Pass-Through)</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-4 tracking-tight font-display\">Are you personally liable to pay income tax in any other country this year?</h2>\r\n                <p class=\"text-xs text-white/40 mb-8 leading-relaxed font-semibold\">Note: collected to pre-fill Deemed Resident path s.6(1A). UAE personal income tax is 0% -&gt; answer False.</p>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('liable_to_tax_in_another_country', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('liable_to_tax_in_another_country', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Does not affect routing. Enabled for: Indian Citizens only (s.6(1A) Deemed Residency blocker).</p>\r\n            </div>\r\n\r\n            <!-- Q9: Left India for Employment -->\r\n            <div data-question-id=\"left_india_for_employment_this_year\" class=\"question-slide flex flex-col justify-center\">\r\n                <span class=\"text-brandGold font-bold text-xs uppercase tracking-widest mb-3\">Question 09 (Pass-Through)</span>\r\n                <h2 class=\"text-2xl lg:text-3xl font-bold text-white mb-8 tracking-tight font-display\">Did you leave India this year specifically for employment abroad or as a ship crew member?</h2>\r\n                <div class=\"flex flex-col sm:flex-row gap-4\">\r\n                    <button onclick=\"handleBoolInput('left_india_for_employment_this_year', true)\" class=\"bool-btn-yes flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>Yes</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">Y</kbd>\r\n                    </button>\r\n                    <button onclick=\"handleBoolInput('left_india_for_employment_this_year', false)\" class=\"bool-btn-no flex-1 py-4 border border-white/10 hover:border-brandGold/50 rounded-xl bg-white/5 hover:bg-brandGold/5 transition-all text-sm font-bold flex items-center justify-between px-6\">\r\n                        <span>No</span>\r\n                        <kbd class=\"hidden sm:inline px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/15\">N</kbd>\r\n                    </button>\r\n                </div>\r\n                <p class=\"text-[11px] text-white/30 uppercase tracking-widest mt-6\">Pre-filled to gate employment_or_crew_status inside layer1_india. Enabled for: Indian Citizens.</p>\r\n            </div>\r\n\r\n            <!-- Refactored Flow Complete Screen showing final jurisdiction determination report -->\r\n            <div id=\"flow-complete-slide\" class=\"question-slide flex flex-col justify-center py-4\">\r\n                <div class=\"flex flex-col items-center text-center space-y-4 mb-6\">\r\n                    <div class=\"w-10 h-10 rounded-full bg-brandGreen/20 text-brandGreen flex items-center justify-center\">\r\n                        <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><polyline points=\"20 6 9 17 4 12\"></polyline></svg>\r\n                    </div>\r\n                    <h2 class=\"text-xs font-black uppercase tracking-[0.2em] text-white/40\">Jurisdiction Routing Determination</h2>\r\n                    \r\n                    <div id=\"result-badge\" class=\"text-3xl lg:text-4xl font-black tracking-widest uppercase py-3 px-6 rounded-2xl transition-all duration-300\">\r\n                         NONE\r\n                    </div>\r\n                    \r\n                    <p id=\"result-desc\" class=\"text-xs text-white/50 max-w-lg leading-relaxed\">\r\n                         No exposure detected. Instantiation of specialist Layer 1 tax compliance modules is locked.\r\n                    </p>\r\n                </div>\r\n\r\n                <!-- Exposure breakdown cards -->\r\n                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full\">\r\n                    <!-- India Exposure Card -->\r\n                    <div class=\"p-5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col space-y-2\">\r\n                        <div class=\"flex justify-between items-center\">\r\n                            <span class=\"text-[11px] font-bold text-brandGold uppercase tracking-widest\">India Tax Exposure</span>\r\n                            <span id=\"res-badge-india\" class=\"px-2 py-0.5 rounded text-[8px] font-black uppercase\">INACTIVE</span>\r\n                        </div>\r\n                        <ul class=\"text-[9px] space-y-1.5 text-white/40 pt-2\" id=\"res-list-india\">\r\n                            <li id=\"res-chk-india-citizen\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>Indian Citizen</span></li>\r\n                            <li id=\"res-chk-india-pio\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>PIO or OCI Cardholder</span></li>\r\n                            <li id=\"res-chk-india-days\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>India Presence (Days &gt; 0)</span></li>\r\n                            <li id=\"res-chk-india-source\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>India-Source Income / Assets</span></li>\r\n                            <li id=\"res-chk-india-liable\" class=\"flex items-center space-x-2 hidden\"><span>[ ]</span> <span>Tax Liable Elsewhere (Deemed)</span></li>\r\n                            <li id=\"res-chk-india-employment\" class=\"flex items-center space-x-2 hidden\"><span>[ ]</span> <span>Employment Departure Status</span></li>\r\n                        </ul>\r\n                    </div>\r\n                    \r\n                    <!-- US Exposure Card -->\r\n                    <div class=\"p-5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col space-y-2\">\r\n                        <div class=\"flex justify-between items-center\">\r\n                            <span class=\"text-[11px] font-bold text-brandCyan uppercase tracking-widest\">US Tax Exposure</span>\r\n                            <span id=\"res-badge-us\" class=\"px-2 py-0.5 rounded text-[8px] font-black uppercase\">INACTIVE</span>\r\n                        </div>\r\n                        <ul class=\"text-[9px] space-y-1.5 text-white/40 pt-2\" id=\"res-list-us\">\r\n                            <li id=\"res-chk-us-citizen\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>US Citizen</span></li>\r\n                            <li id=\"res-chk-us-gc\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>US Green Card Holder</span></li>\r\n                            <li id=\"res-chk-us-days\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>US Presence (Days &gt; 0)</span></li>\r\n                            <li id=\"res-chk-us-source\" class=\"flex items-center space-x-2\"><span>[ ]</span> <span>US-Source Income / Assets</span></li>\r\n                        </ul>\r\n                    </div>\r\n                </div>\r\n\r\n                <!-- Navigation options based on decision -->\r\n                <div class=\"flex flex-col sm:flex-row gap-3 w-full justify-center\">\r\n                    <a id=\"action-btn-india\" href=\"layer1_india.html\" class=\"flex-1 py-3 bg-brandGold text-black font-black text-center text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all hidden\">\r\n                        Open Tax Intelligence (India)\r\n                    </a>\r\n                    <a id=\"action-btn-us\" href=\"income.html\" class=\"flex-1 py-3 bg-brandCyan text-black font-black text-center text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all hidden\">\r\n                        Open Salaries & RSUs (US)\r\n                    </a>\r\n                    <button onclick=\"resetQuestionnaire()\" class=\"flex-1 py-3 border border-white/10 hover:border-white/30 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all\">\r\n                        Restart Questionnaire\r\n                    </button>\r\n                </div>\r\n            </div>\r\n\r\n        </div>\r\n\r\n        <!-- Footer: Back / Next Navigation -->\r\n        <div id=\"questionnaire-footer\" class=\"flex justify-between items-center mt-6 pt-6 border-t border-white/5 relative z-10\">\r\n            <button id=\"nav-btn-prev\" onclick=\"regressQuestionnaire()\" class=\"text-xs font-bold text-white/50 hover:text-white flex items-center space-x-2 transition-colors\">\r\n                <span>&larr; Back</span>\r\n                <span class=\"hidden sm:inline text-[9px] opacity-40 font-mono\">[&uarr; / &larr;]</span>\r\n            </button>\r\n            \r\n            <div class=\"flex items-center space-x-4\">\r\n                <button id=\"nav-btn-next\" onclick=\"advanceQuestion()\" class=\"text-xs font-bold text-white/50 hover:text-white flex items-center space-x-2 transition-colors\">\r\n                    <span>Skip / Next &rarr;</span>\r\n                    <span class=\"hidden sm:inline text-[9px] opacity-40 font-mono\">[&darr; / &rarr;]</span>\r\n                </button>\r\n            </div>\r\n        </div>\r\n\r\n    </div>\r\n\r\n</main>\r\n</div>\r\n\r\n\r\n" }} />
    );
}
