/**
 * APP ORCHESTRATOR - Forensic BTR Edition
 * Final Integrated Version: Quad-Lock Logic + Human Auditor + Live Reasoning + Auto-Correct
 */
const app = {
    lastCalcData: null,
    searchTimeout: null,
    currentJaiminiData: null, 

    // Human Auditor State (Stores manual overrides)
    // States: 'AUTO' -> 'PASS' -> 'FAIL'
    overrides: {
        d60: 'AUTO', 
        pp: 'AUTO', 
        kunda: 'AUTO', 
        gender: 'AUTO'
    },

    // --- 1. INITIALIZATION ---
    init: async function() {
        // A. Load Theme
        const storedTheme = localStorage.getItem('vedic_theme') || 'light';
        document.documentElement.setAttribute('data-theme', storedTheme);

        // B. Set Default Time (Now)
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = [
            now.getHours().toString().padStart(2, '0'),
            now.getMinutes().toString().padStart(2, '0'),
            now.getSeconds().toString().padStart(2, '0')
        ].join(':');
        // Default TZ (User's Browser Offset inverted)
        const tzOffset = -(now.getTimezoneOffset() / 60);

        const pfx = 'm'; 
        if (document.getElementById(`${pfx}_dob`)) document.getElementById(`${pfx}_dob`).value = dateStr;
        if (document.getElementById(`${pfx}_tob`)) document.getElementById(`${pfx}_tob`).value = timeStr;
        if (document.getElementById(`${pfx}_tz`)) document.getElementById(`${pfx}_tz`).value = tzOffset;

        // C. Setup Dropdowns & Location
        this.populateSoundDropdown();
        this.autoLocate(pfx);

        // D. Global Event Listeners (Close dropdowns on click outside)
        document.addEventListener('click', function(e) {
            const container = document.querySelector('.input-group-box');
            if (container && !container.contains(e.target)) {
                const results = document.getElementById('m_city_results');
                if (results) results.style.display = 'none';
            }
        });
    },

    toggleTheme: function() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('vedic_theme', next);
    },

    // Override Logic for Auditor Panel
    toggleOverride: function(key) {
        const states = ['AUTO', 'PASS', 'FAIL'];
        const curr = this.overrides[key];
        const next = states[(states.indexOf(curr) + 1) % 3];
        this.overrides[key] = next;
        this.calculate('m'); // Re-run to update scores/UI
    },

    autoLocate: function(pfx) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                document.getElementById(`${pfx}_lat`).value = lat;
                document.getElementById(`${pfx}_lon`).value = lon;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await res.json();
                    document.getElementById(`${pfx}_city`).value = data.address.city || data.address.town || "My Location";
                } catch(e) {
                    document.getElementById(`${pfx}_city`).value = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                }
                this.calculate(pfx);
            }, () => {
                this.ui.pickCity(pfx, 28.61, 77.23, "New Delhi, India");
            });
        }
    },

    updateLiveSound: function(pfx) {
        const name = document.getElementById(`${pfx}_name`).value;
        const soundKey = this.getAutoSound(name);
        const signIdx = HODA_CAKRA[soundKey];
        const signName = signIdx !== undefined ? SIGNS[signIdx] : "Unknown";
        const el = document.getElementById(`${pfx}_feedback_sound`);
        if (el) el.innerHTML = `<span style="color:var(--primary); font-weight:800;">${soundKey.toUpperCase()}</span> (${signName})`;
    },

    // --- TIME MANIPULATION HELPERS ---
    
    adjustTime: function(pfx, secondsToAdd) {
        const timeInput = document.getElementById(`${pfx}_tob`);
        const [h, m, s] = timeInput.value.split(':').map(Number);
        let date = new Date();
        date.setHours(h, m, (s || 0) + secondsToAdd);
        
        timeInput.value = [
            date.getHours().toString().padStart(2, '0'),
            date.getMinutes().toString().padStart(2, '0'),
            date.getSeconds().toString().padStart(2, '0')
        ].join(':');
        
        this.calculate(pfx);
    },
    
    nudgeTime: function(pfx, seconds) {
        this.adjustTime(pfx, seconds);
    },
    
    setTob: function(pfx, timeStr) {
        document.getElementById(`${pfx}_tob`).value = timeStr.slice(0, 8); 
        this.calculate(pfx);
    },

    clearData: function(pfx) {
        document.getElementById(`${pfx}_name`).value = "";
        document.getElementById(`${pfx}_city`).value = "";
        
        document.getElementById(`${pfx}_suggestion`).style.display = "none";
        document.getElementById(`${pfx}_scan_results`).style.display = "none";
        document.getElementById(`${pfx}_analysis`).innerHTML = "";
        document.getElementById(`${pfx}_table_body`).innerHTML = "";
        document.getElementById(`${pfx}_logic_trace`).style.display = "none";
        document.getElementById(`${pfx}_sex_result`).style.display = "none";
        document.getElementById(`${pfx}_jaimini_rect_body`).innerHTML = "";
        document.getElementById('forensic_map_panel').style.display = "none";
        document.getElementById('planet_data_panel').style.display = "none";
        
        document.getElementById(`${pfx}_feedback_sound`).innerHTML = "--";
        document.getElementById(`${pfx}_feedback_arudha`).innerHTML = "--";
        
        if(document.getElementById('m_tattwa_res')) document.getElementById('m_tattwa_res').innerHTML = "-- Run Engine --";
        if(document.getElementById('m_kunda_res')) document.getElementById('m_kunda_res').innerHTML = "-- Run Engine --";
    },

    loadSample: function(pfx) {
        document.getElementById(`${pfx}_name`).value = "Mohan Raja";
        document.getElementById(`${pfx}_gender`).value = "MALE";
        document.getElementById(`${pfx}_sound`).value = "mo";
        document.getElementById(`${pfx}_arudha`).value = "11";
        document.getElementById(`${pfx}_dob`).value = "1985-05-20";
        document.getElementById(`${pfx}_tob`).value = "14:30:15";
        document.getElementById(`${pfx}_tz`).value = "5.5";
        document.getElementById(`${pfx}_lat`).value = "13.6288";
        document.getElementById(`${pfx}_lon`).value = "79.4192";
        document.getElementById(`${pfx}_city`).value = "Tirupati, India";
        this.calculate(pfx);
    },

    populateSoundDropdown: function() {
        const select = document.getElementById('m_sound');
        if(!select) return;
        const sounds = Object.keys(HODA_CAKRA).sort();
        sounds.forEach(sound => {
            const signName = SIGNS[HODA_CAKRA[sound]];
            const opt = document.createElement('option');
            opt.value = sound;
            opt.innerHTML = `${sound.charAt(0).toUpperCase() + sound.slice(1)} (${signName})`;
            select.appendChild(opt);
        });
    },

    getAutoSound: function(name) {
        if (!name) return "mo";
        const cleanName = name.trim().toLowerCase();
        const triple = cleanName.substring(0, 3);
        if (HODA_CAKRA[triple] !== undefined) return triple;
        const double = cleanName.substring(0, 2);
        if (HODA_CAKRA[double] !== undefined) return double;
        const single = cleanName.substring(0, 1);
        if (HODA_CAKRA[single] !== undefined) return single;
        return "mo";
    },

    // --- 2. AUTO-CORRECT ALGORITHM ---
    // Scans forward or backward to find the next high-probability time slot
    autoCorrect: function(pfx, direction) {
        // direction: 1 (Future) or -1 (Past)
        const btnId = direction === 1 ? 'btn_ac_plus' : 'btn_ac_minus';
        const originalBtnText = document.getElementById(btnId).innerHTML;
        document.getElementById(btnId).innerHTML = "⏳"; // Loading State

        // 1. Gather Initial State
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        const nameInput = document.getElementById(`${pfx}_name`).value;
        const genderInput = document.getElementById(`${pfx}_gender`).value.toUpperCase();
        
        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        const startUtc = Date.UTC(y, m - 1, d, h, min, s || 0) - (tz * 3600000);

        // Pre-calc Sunrise for Jaimini (Optimization)
        const obs = new Astronomy.Observer(lat, lon, 0);
        const riseInfo = Astronomy.SearchRiseSet('Sun', obs, +1, Astronomy.MakeTime(new Date(startUtc)), -1);
        const sunriseDate = riseInfo ? riseInfo.date : null;

        // Search Params
        const maxSteps = 120; // Search ~10 minutes
        const stepSize = 5;   // 5-second jumps
        let bestTime = null;
        let maxScore = -1;

        const fS = document.getElementById(`${pfx}_sound`).value === "AUTO" ? this.getAutoSound(nameInput) : document.getElementById(`${pfx}_sound`).value;

        // 2. The Loop
        for (let i = 1; i <= maxSteps; i++) {
            const offset = i * stepSize * direction;
            const scanUtc = new Date(startUtc + (offset * 1000));
            
            // A. Calc Essentials
            const ayan = VedicEngine.getAyanamsa(scanUtc);
            const lDeg = VedicEngine.calculateLagna(scanUtc, lat, lon, ayan);
            const pPositions = AstroWrapper.getPositions(scanUtc);
            const sunLon = pPositions.find(p => p.name === "Sun").lon;
            const moonLon = pPositions.find(p => p.name === "Moon").lon;
            const ppLon = VedicEngine.calculatePranapada(scanUtc, lat, lon, sunLon - ayan);

            // B. Run Checks
            const kunda = TattwaEngine.calculateKunda(lDeg, (moonLon - ayan + 360) % 360);
            
            const jData = JaiminiEngine.calculateVighatika(scanUtc, sunriseDate);
            const jRes = JaiminiEngine.determineSex(jData.planetIndex, false, false, Math.floor(lDeg/30));
            const genMatch = (jRes.sex === genderInput);

            // C. Forensic Analysis
            const pData = [VedicEngine.formatData("Lagna", lDeg, false, 0, lDeg, true)];
            pPositions.forEach(p => pData.push(VedicEngine.formatData(p.name, p.lon, p.isRetro, ayan, lDeg)));
            const btr = RectificationAnalyzer.analyze(pData, { name: nameInput, gender: genderInput, ppLon: ppLon, forcedSound: fS, forcedArudha: "AUTO" });
            
            // D. Scoring
            let score = 0;
            if (genMatch) score += 1;
            if (kunda.match) score += 1;
            if (btr.checks[0].status === 'PASS') score += 1.5; // Ketu Link
            if (btr.checks[1].status === 'PASS') score += 1;   // Name Link
            if (btr.checks[2].status === 'PASS') score += 1;   // PP Sync

            // Keep best result
            if (score > maxScore) {
                maxScore = score;
                bestTime = scanUtc;
            }
            
            // Stop if we find a very high match (>= 5.5 out of possible 6.5)
            if (score >= 5.5) break; 
        }

        // 3. Apply Result
        if (bestTime) {
            const localTime = new Date(bestTime.getTime() + (tz * 3600000));
            const newTimeStr = [localTime.getUTCHours(), localTime.getUTCMinutes(), localTime.getUTCSeconds()].map(x=>x.toString().padStart(2,'0')).join(':');
            document.getElementById(`${pfx}_tob`).value = newTimeStr;
            this.calculate(pfx);
        } else {
            alert("No better time found in this direction.");
        }
        
        // Reset Button
        document.getElementById(btnId).innerHTML = originalBtnText;
    },

    // --- 3. MAIN CALCULATION ENGINE ---
    calculate: function(pfx) {
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        
        const nameInput = document.getElementById(`${pfx}_name`)?.value || "Native";
        const gender = document.getElementById(`${pfx}_gender`)?.value || "MALE";
        const forcedSound = document.getElementById(`${pfx}_sound`)?.value === "AUTO" ? this.getAutoSound(nameInput) : document.getElementById(`${pfx}_sound`)?.value;
        const forcedArudha = document.getElementById(`${pfx}_arudha`)?.value || "AUTO";

        this.updateLiveSound(pfx);
        if (!dobRaw || !tobRaw || isNaN(lat)) return;

        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        const pseudoUtc = Date.UTC(y, m - 1, d, h, min, s || 0);
        const actualUtcDate = new Date(pseudoUtc - (tz * 3600000));
        
        // PHASE A: JAIMINI (Sunrise Based)
        const observer = new Astronomy.Observer(lat, lon, 0);
        const rise = Astronomy.SearchRiseSet('Sun', observer, +1, Astronomy.MakeTime(actualUtcDate), -1);
        if (rise) {
            const sunriseDate = rise.date;
            const jData = JaiminiEngine.calculateVighatika(actualUtcDate, sunriseDate);
            
            // UI Updates
            if(document.getElementById(`${pfx}_vig_display`)) {
                document.getElementById(`${pfx}_vig_display`).value = `${jData.totalVighatikas.toFixed(1)} (${jData.planetName})`;
                const localRise = new Date(sunriseDate.getTime() + (tz * 3600000));
                document.getElementById(`${pfx}_sunrise_display`).value = localRise.toTimeString().slice(0,8);
            }
            
            const tattwa = TattwaEngine.calculateTattwa(actualUtcDate, sunriseDate);
            const tEl = document.getElementById('m_tattwa_res');
            if(tEl) tEl.innerHTML = `<strong>${tattwa.name}</strong> (${tattwa.gender})`;

            this.currentJaiminiData = { ...jData, sunriseDate, actualUtcDate, genderPred: JaiminiEngine.determineSex(jData.planetIndex, false, false, 0).sex };
        }

        // PHASE B: VEDIC (Planetary Positions)
        const ayanamsa = VedicEngine.getAyanamsa(actualUtcDate);
        const lagnaDeg = VedicEngine.calculateLagna(actualUtcDate, lat, lon, ayanamsa);
        const pPositions = AstroWrapper.getPositions(actualUtcDate);
        const sunPos = pPositions.find(p => p.name === "Sun").lon;
        const moonPos = pPositions.find(p => p.name === "Moon").lon;
        const ppLon = VedicEngine.calculatePranapada(actualUtcDate, lat, lon, sunPos - ayanamsa);

        const planetData = [VedicEngine.formatData("Lagna", lagnaDeg, false, 0, lagnaDeg, true)];
        pPositions.forEach(p => planetData.push(VedicEngine.formatData(p.name, p.lon, p.isRetro, ayanamsa, lagnaDeg)));
        planetData.push(VedicEngine.formatData("Pranapada", ppLon, false, ayanamsa, lagnaDeg));

        this.lastCalcData = planetData;

        // PHASE C: KUNDA (Lagna * 81)
        const kunda = TattwaEngine.calculateKunda(lagnaDeg, (moonPos - ayanamsa + 360) % 360);
        const kEl = document.getElementById('m_kunda_res');
        if(kEl) {
            const color = kunda.match ? 'var(--success)' : 'var(--planet-color)';
            kEl.innerHTML = `<span style="color:${color}; font-weight:bold">${kunda.match ? "MATCH" : "MISMATCH"}</span>`;
        }

        // PHASE D: FORENSIC ANALYSIS (The Detective)
        // This calls the detailed Analyzer we updated
        const btrReport = RectificationAnalyzer.analyze(planetData, { 
            name: nameInput, gender: gender, ppLon: ppLon, forcedSound: forcedSound, forcedArudha: forcedArudha
        });

        // Arudha Update
        const alSign = RectificationAnalyzer.calculateAL(planetData);
        const usedAL = forcedArudha !== "AUTO" ? parseInt(forcedArudha) : alSign;
        document.getElementById(`${pfx}_feedback_arudha`).innerHTML = `<span style="color:var(--primary); font-weight:800;">${SIGNS[usedAL]}</span>`;

        // PHASE E: PREPARE DATA FOR AUDITOR
        // Extract the detailed descriptions from the Analyzer report
        const d60Check = btrReport.checks.find(c => c.id === 'ketu') || {}; 
        const nameCheck = btrReport.checks.find(c => c.id === 'name') || {};
        const ppCheck = btrReport.checks.find(c => c.id === 'pp') || {};

        // 1. Construct D60 Logic String
        let d60Reason = "No Link Found";
        if (d60Check.status === 'PASS') d60Reason = d60Check.description; // Already formatted in Analyzer
        else if (nameCheck.status === 'PASS') d60Reason = nameCheck.description;
        else d60Reason = `No Ketu or Name Link in D60.`;

        // 2. Construct Gender Logic String
        const vigP = this.currentJaiminiData ? this.currentJaiminiData.planetName : "-";
        const predSex = this.currentJaiminiData ? this.currentJaiminiData.genderPred : "-";
        const genderReason = (predSex === gender) 
            ? `Vighatika Lord is ${vigP} (${predSex}). Matches user input.` 
            : `Vighatika Lord is ${vigP} (${predSex}). User is ${gender}.`;

        // 3. Construct Kunda Logic String
        const moonSignStr = SIGNS[kunda.moonSign];
        const kundaReason = kunda.match 
            ? `Lagna*81 (${kunda.signName}) is Trine/Opp to Moon (${moonSignStr}).`
            : `Lagna*81 (${kunda.signName}) is NOT in Trine/Opp to Moon (${moonSignStr}).`;

        const autoResults = {
            genderMatch: (predSex === gender),
            genderReason: genderReason,
            
            kundaMatch: kunda.match,
            kundaReason: kundaReason,

            ppMatch: ppCheck.status === 'PASS',
            ppReason: ppCheck.description || "Calculation Error",

            d60Match: btrReport.isRectified,
            d60Reason: d60Reason
        };

        // PHASE F: RENDER UI
        this.renderTable(pfx, planetData);
        this.refreshCharts();
        this.renderTimelineMap(pfx, actualUtcDate, lat, lon, ayanamsa, gender, (moonPos - ayanamsa + 360) % 360);
        this.renderAuditor(pfx, autoResults); // Pass detailed reasons to the side panel

        // Trace Log
        const trace = document.getElementById(`${pfx}_logic_trace`);
        if (trace) trace.innerText = btrReport.trace;
    },

    // --- 4. AUDITOR RENDERER (INTERACTIVE SIDE-PANEL) ---
    renderAuditor: function(pfx, autoResults) {
        const box = document.getElementById(`${pfx}_analysis`);
        if(!box) return;
        
        // Helper: Get status based on overrides
        const getStatus = (key, autoPass) => {
            const userState = this.overrides[key];
            if (userState === 'PASS') return { class: 'status-verified', text: 'MANUAL', icon: '👮‍♂️' };
            if (userState === 'FAIL') return { class: 'status-rejected', text: 'MANUAL', icon: '🚫' };
            return autoPass 
                ? { class: 'status-tick', text: 'AUTO', icon: '✅' } 
                : { class: 'status-cross', text: 'AUTO', icon: '❌' };
        };

        const s1 = getStatus('d60', autoResults.d60Match);
        const s2 = getStatus('pp', autoResults.ppMatch);
        const s3 = getStatus('kunda', autoResults.kundaMatch);
        const s4 = getStatus('gender', autoResults.genderMatch);

        // Calc Score
        let passedChecks = 0;
        if (s1.text === 'MANUAL' || (s1.text === 'AUTO' && autoResults.d60Match)) passedChecks++;
        if (s2.text === 'MANUAL' || (s2.text === 'AUTO' && autoResults.ppMatch)) passedChecks++;
        if (s3.text === 'MANUAL' || (s3.text === 'AUTO' && autoResults.kundaMatch)) passedChecks++;
        if (s4.text === 'MANUAL' || (s4.text === 'AUTO' && autoResults.genderMatch)) passedChecks++;
        
        const finalPercent = (passedChecks / 4) * 100;

        box.style.display = 'block';

        box.innerHTML = `
        <div class="auditor-panel" style="border:none; margin:0;">
            <div class="auditor-header">
                <div style="display:flex; gap:5px;">
                    <button id="btn_ac_minus" onclick="app.autoCorrect('${pfx}', -1)" style="font-size:0.65rem; padding:2px 6px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:white; border-radius:4px; cursor:pointer;" title="Find previous match">Auto Correct -</button>
                    <button id="btn_ac_plus" onclick="app.autoCorrect('${pfx}', 1)" style="font-size:0.65rem; padding:2px 6px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:white; border-radius:4px; cursor:pointer;" title="Find next match">Auto Correct +</button>
                </div>
                <span style="background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px;">${finalPercent}% MATCH</span>
            </div>

            <div class="audit-row" style="border-left: 4px solid var(--primary);">
                <div class="audit-info" onclick="app.toggleOverride('d60')">
                    <strong>1. D60 Identity</strong>
                    <div style="font-size:0.65rem; color:var(--text-main); line-height:1.2; margin-top:3px; opacity:0.8;">
                        ${autoResults.d60Reason}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="nudge-controls">
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', -120)" title="-2 Min">-2m</button>
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', 120)" title="+2 Min">+2m</button>
                    </div>
                    <div class="${s1.class}" style="margin-left:10px;" onclick="app.toggleOverride('d60')">${s1.icon}</div>
                </div>
            </div>

            <div class="audit-row">
                <div class="audit-info" onclick="app.toggleOverride('pp')">
                    <strong>2. D9 Pranapada</strong>
                    <div style="font-size:0.65rem; color:var(--text-main); line-height:1.2; margin-top:3px; opacity:0.8;">
                        ${autoResults.ppReason}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="nudge-controls">
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', -15)" title="-15s">-15s</button>
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', 15)" title="+15s">+15s</button>
                    </div>
                    <div class="${s2.class}" style="margin-left:10px;" onclick="app.toggleOverride('pp')">${s2.icon}</div>
                </div>
            </div>

            <div class="audit-row">
                <div class="audit-info" onclick="app.toggleOverride('kunda')">
                    <strong>3. Kunda 81</strong>
                    <div style="font-size:0.65rem; color:var(--text-main); line-height:1.2; margin-top:3px; opacity:0.8;">
                        ${autoResults.kundaReason}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="nudge-controls">
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', -4)" title="-4s">-4s</button>
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', 4)" title="+4s">+4s</button>
                    </div>
                    <div class="${s3.class}" style="margin-left:10px;" onclick="app.toggleOverride('kunda')">${s3.icon}</div>
                </div>
            </div>

            <div class="audit-row">
                <div class="audit-info" onclick="app.toggleOverride('gender')">
                    <strong>4. Gender</strong>
                    <div style="font-size:0.65rem; color:var(--text-main); line-height:1.2; margin-top:3px; opacity:0.8;">
                        ${autoResults.genderReason}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="nudge-controls">
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', -24)" title="-24s">-24s</button>
                        <button class="btn-nudge" onclick="app.nudgeTime('${pfx}', 24)" title="+24s">+24s</button>
                    </div>
                    <div class="${s4.class}" style="margin-left:10px;" onclick="app.toggleOverride('gender')">${s4.icon}</div>
                </div>
            </div>
            
            <div style="padding:15px; border-top:1px solid var(--border);">
                 <button onclick="app.ui.toggleTrace('${pfx}')" class="btn-tool" style="width:100%; color:var(--text-muted); border-color:var(--border); background:transparent;">View Full Trace</button>
            </div>
        </div>
        `;
    },

    // --- 5. TIMELINE RENDERER (QUAD-LOCK VISUAL) ---
    renderTimelineMap: function(pfx, centerDate, lat, lon, ayanamsa, gender, moonSidereal) {
        const container = document.getElementById('timeline_tracks');
        const panel = document.getElementById('forensic_map_panel');
        if(!container) return;
        panel.style.display = 'block'; 
        container.innerHTML = '<div class="timeline-cursor"></div>'; 
        const stepSec = 24; const steps = 8; 
        const centerData = this.lastCalcData;
        
        const ketuD60 = centerData.find(p => p.name === "Ketu").d60Idx;
        const soundKey = this.getAutoSound(document.getElementById(`${pfx}_name`).value);
        const hodaSign = HODA_CAKRA[soundKey] || 0;
        const alSign = parseInt(document.getElementById(`${pfx}_arudha`).value) || RectificationAnalyzer.calculateAL(centerData);
        const targetSigns = new Set([ketuD60, hodaSign, alSign]);
        const sunP = centerData.find(p=>p.name==="Sun");
        const moonD9 = centerData.find(p=>p.name==="Moon").d9Idx;
        const userGender = gender.toUpperCase();
        const segments = [];
    
        for (let i = -steps; i <= steps; i++) {
            const t = new Date(centerDate.getTime() + (i * stepSec * 1000));
            const lDeg = VedicEngine.calculateLagna(t, lat, lon, ayanamsa);
            const lD60 = VedicEngine.getDivisionalSign(lDeg, "D60");
            const ppL = VedicEngine.calculatePranapada(t, lat, lon, sunP.siderealLon);
            const ppD9 = VedicEngine.getDivisionalSign(ppL, "D9");
            const ppMatch = [0, 4, 6, 8].includes((ppD9 - moonD9 + 12) % 12);
            const kRes = TattwaEngine.calculateKunda(lDeg, moonSidereal);
            let isGenMatch = false;
            if (this.currentJaiminiData) {
                const jData = JaiminiEngine.calculateVighatika(t, this.currentJaiminiData.sunriseDate);
                const jRes = JaiminiEngine.determineSex(jData.planetIndex, false, false, Math.floor(lDeg/30));
                if(jRes.sex === userGender) isGenMatch = true;
            }
            let d60Match = false;
            targetSigns.forEach(target => { if (target === lD60 || VedicEngine.hasRashiDrishti(target, lD60)) d60Match = true; });

            segments.push({
                offset: i * stepSec, timeDisplay: t.toTimeString().split(' ')[0],
                d60Match: d60Match, ppMatch: ppMatch, kundaMatch: kRes.match, isGenMatch: isGenMatch,
                isGolden: (kRes.match && isGenMatch && ppMatch && d60Match)
            });
        }
    
        [{ key: 'd60Match', label: 'D60 Link' }, { key: 'ppMatch', label: 'PP (D9)' }, { key: 'kundaMatch', label: 'Kunda' }, { key: 'isGenMatch', label: 'Gender' }]
        .forEach(track => {
            const row = document.createElement('div');
            row.className = 'track-row';
            const label = document.createElement('div');
            label.className = 'track-label'; label.innerText = track.label;
            row.appendChild(label);
            segments.forEach(seg => {
                const el = document.createElement('div');
                el.className = 'track-segment'; el.title = seg.timeDisplay;
                if (seg[track.key]) { el.classList.add('seg-match'); el.innerHTML = '✓'; el.style.background = 'rgba(5, 150, 105, 0.2)'; el.style.color = 'var(--success)'; } 
                else { el.classList.add('seg-mismatch'); el.innerHTML = '·'; }
                if (seg.isGolden) { el.classList.add('seg-golden'); el.style.opacity = "1"; el.style.fontWeight = "900"; } else { el.style.opacity = "0.5"; }
                el.onclick = () => app.adjustTime(pfx, seg.offset);
                row.appendChild(el);
            });
            container.appendChild(row);
        });
    },

    // --- 6. AUTO-FIX PRANAPADA (ALGORITHM) ---
    autoFixPranapada: function(pfx) {
        const statusBox = document.getElementById(`${pfx}_analysis`);
        statusBox.innerHTML = "<div style='padding:10px; text-align:center; font-weight:bold; color:var(--primary);'>Searching for nearest Pranapada sync...</div>";
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        const baseUtc = new Date(Date.UTC(y, m-1, d, h, min, s || 0) - (tz * 3600000));
        const ayanamsa = VedicEngine.getAyanamsa(baseUtc);
        const centerPos = AstroWrapper.getPositions(baseUtc);
        const moonLon = centerPos.find(p => p.name === "Moon").lon;
        const moonSidereal = (moonLon - ayanamsa + 360) % 360;
        const moonD9 = VedicEngine.getDivisionalSign(moonSidereal, "D9");

        let bestMatch = null;
        let minDiff = Infinity;

        // Scan +/- 15 mins (180 * 5s)
        for (let i = -180; i <= 180; i++) { 
            const offsetSec = i * 5; 
            const testTime = new Date(baseUtc.getTime() + (offsetSec * 1000));
            const sunLon = centerPos.find(p => p.name === "Sun").lon; 
            const ppLon = VedicEngine.calculatePranapada(testTime, lat, lon, sunLon - ayanamsa);
            const ppD9 = VedicEngine.getDivisionalSign(ppLon, "D9");
            const dist = (ppD9 - moonD9 + 12) % 12;
            const isValid = [0, 4, 6, 8].includes(dist);

            if (isValid) {
                const timeDiff = Math.abs(offsetSec);
                if (timeDiff < minDiff) {
                    minDiff = timeDiff;
                    bestMatch = { offset: offsetSec, time: testTime, ppSign: SIGNS[ppD9], dist: dist + 1 };
                }
            }
        }

        if (bestMatch) {
            const localTime = new Date(bestMatch.time.getTime() + (tz * 3600000));
            const newTimeStr = [
                localTime.getUTCHours().toString().padStart(2, '0'),
                localTime.getUTCMinutes().toString().padStart(2, '0'),
                localTime.getUTCSeconds().toString().padStart(2, '0')
            ].join(':');
            if(confirm(`Found Match!\n\nShift: ${bestMatch.offset > 0 ? '+' : ''}${bestMatch.offset} seconds\nNew Time: ${newTimeStr}\nRelation: ${bestMatch.dist}th from Moon (D9)\n\nApply this time?`)) {
                document.getElementById(`${pfx}_tob`).value = newTimeStr;
                this.calculate(pfx);
            } else {
                 this.calculate(pfx); 
            }
        } else {
            alert("No alignment found within ±15 minutes.");
            this.calculate(pfx);
        }
    },

    // --- 7. STANDARD UI HELPERS (SCAN, TABS, ETC) ---
    scan20MinWindow: function(pfx) {
        const body = document.getElementById(`${pfx}_scan_body`);
        const container = document.getElementById(`${pfx}_scan_results`);
        body.innerHTML = "<tr><td colspan='6' style='text-align:center'>Sweeping ±10m Window...</td></tr>";
        container.style.display = "block";
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        const nameInput = document.getElementById(`${pfx}_name`).value;
        const genderInput = document.getElementById(`${pfx}_gender`).value.toUpperCase();
        const fS = document.getElementById(`${pfx}_sound`).value === "AUTO" ? app.getAutoSound(nameInput) : document.getElementById(`${pfx}_sound`).value;
        const fA = document.getElementById(`${pfx}_arudha`).value;
        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        const seedDate = new Date(Date.UTC(y, m-1, d, 12, 0, 0)); 
        const obs = new Astronomy.Observer(lat, lon, 0);
        const riseInfo = Astronomy.SearchRiseSet('Sun', obs, +1, Astronomy.MakeTime(seedDate), -1);
        const sunriseDate = riseInfo ? riseInfo.date : null;
        const centerUtc = new Date(Date.UTC(y, m-1, d, h, min, s || 0) - (tz * 3600000));
        const centerMoonPos = AstroWrapper.getPositions(centerUtc).find(p => p.name === "Moon").lon;
        const ayanamsa = VedicEngine.getAyanamsa(centerUtc);
        const moonSidereal = (centerMoonPos - ayanamsa + 360) % 360;

        let matches = [];
        for (let offset = -600; offset <= 600; offset += 15) {
            let scanTime = new Date(new Date().setHours(h, min, s || 0) + offset * 1000);
            let scanUtc = new Date(Date.UTC(y, m-1, d, scanTime.getHours(), scanTime.getMinutes(), scanTime.getSeconds()) - (tz * 3600000));
            const ayan = VedicEngine.getAyanamsa(scanUtc);
            const lDeg = VedicEngine.calculateLagna(scanUtc, lat, lon, ayan);
            const pPos = AstroWrapper.getPositions(scanUtc);
            const sunP = pPos.find(p => p.name === "Sun").lon;
            const ppL = VedicEngine.calculatePranapada(scanUtc, lat, lon, sunP - ayan);
            const pData = [VedicEngine.formatData("Lagna", lDeg, false, 0, lDeg, true)];
            pPos.forEach(p => pData.push(VedicEngine.formatData(p.name, p.lon, p.isRetro, ayan, lDeg)));
            const btr = RectificationAnalyzer.analyze(pData, { name: nameInput, gender: genderInput, ppLon: ppL, forcedSound: fS, forcedArudha: fA });
            const d60Score = btr.checks.reduce((acc, curr) => acc + curr.score, 0); 
            let genderMatch = false;
            let vigPlanet = "-";
            if (sunriseDate) {
                const jData = JaiminiEngine.calculateVighatika(scanUtc, sunriseDate);
                const lSign = Math.floor(lDeg/30);
                const jRes = JaiminiEngine.determineSex(jData.planetIndex, false, false, lSign);
                genderMatch = (jRes.sex === genderInput);
                vigPlanet = jData.planetName;
            }
            const kundaRes = TattwaEngine.calculateKunda(lDeg, moonSidereal);
            const kundaMatch = kundaRes.match;
            let totalConfidence = 0;
            if (genderMatch) {
                let subScore = 50;
                if (kundaMatch) subScore += 20;
                subScore += (d60Score * 7.5);
                totalConfidence = subScore;
            } else {
                totalConfidence = (d60Score / 4) * 30; 
            }
            if (totalConfidence > 100) totalConfidence = 100;
            matches.push({ time: scanTime.toTimeString().split(' ')[0], d60Score: d60Score, genderMatch: genderMatch, kundaMatch: kundaMatch, confidence: Math.round(totalConfidence), vigPlanet: vigPlanet, btrData: btr });
        }
        matches.sort((a, b) => b.confidence - a.confidence);
        app.renderSuggestions(pfx, matches.slice(0, 3));
        body.innerHTML = matches.map(m => {
            const bg = m.confidence >= 80 ? 'var(--success)' : (m.genderMatch ? 'var(--hover-bg)' : 'transparent');
            const color = m.confidence >= 80 ? 'white' : 'var(--text-main)';
            return `<tr onclick="app.setTob('${pfx}', '${m.time}')" style="cursor:pointer; background:${bg}; color:${color}"><td><b>${m.time}</b></td><td><span style="font-weight:800;">${m.confidence}%</span></td><td>${m.d60Score}/4</td><td>${m.genderMatch ? '✅' : '❌'} <small>(${m.vigPlanet.substring(0,2)})</small></td></tr>`;
        }).join('');
    },
    
    renderSuggestions: function(pfx, topMatches) {
        const box = document.getElementById(`${pfx}_suggestion`);
        if (!topMatches.length || topMatches[0].confidence < 50) { box.style.display = 'none'; return; }
        box.style.display = 'grid';
        box.innerHTML = topMatches.map((m, idx) => {
            const btr = m.btrData;
            let positives = [];
            if (m.genderMatch) positives.push("Gender (24s)");
            if (m.kundaMatch) positives.push("Kunda (81)");
            if (btr.checks[1].status === 'PASS') positives.push("Name");
            if (btr.checks[0].status === 'PASS') positives.push("Ketu");
            let reasonStr = positives.length > 0 ? "<b>Matched:</b> " + positives.join(", ") : "Weak Alignment";
            if(m.confidence === 100) reasonStr = "🔥 <b>PERFECT MATCH</b>";
            const cardClass = idx === 0 ? 'top-candidate' : '';
            const scoreColor = m.confidence >= 80 ? 'var(--success)' : 'var(--primary)';
            return `<div class="candidate-card ${cardClass}" onclick="app.setTob('${pfx}', '${m.time}')"><div class="candidate-header"><span class="candidate-rank">Rank #${idx + 1}</span><span class="candidate-time">${m.time}</span><span class="candidate-score" style="background:${scoreColor}">${m.confidence}%</span></div><div class="candidate-reason">${reasonStr}</div><div class="candidate-apply">Click to Apply</div></div>`;
        }).join('');
    },
    
    ui: {
        switchTab: function(tabName) { document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); document.getElementById('tab_standard').style.display = tabName === 'standard' ? 'block' : 'none'; document.getElementById('tab_jaimini').style.display = tabName === 'jaimini' ? 'block' : 'none'; document.getElementById('tab_tattwa').style.display = tabName === 'tattwa' ? 'block' : 'none'; const isStandard = tabName === 'standard'; document.getElementById('visual_lab_section').style.display = isStandard ? 'grid' : 'none'; },
        toggleTrace: function(pfx) { const el = document.getElementById(`${pfx}_logic_trace`); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; },
        handleSearchDebounced: function(pfx) { clearTimeout(app.searchTimeout); app.searchTimeout = setTimeout(() => this.handleSearch(pfx), 400); },
        handleSearch: async function(pfx) { const q = document.getElementById(`${pfx}_city`).value; if (q.length < 3) return; try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`); const data = await res.json(); const box = document.getElementById(`${pfx}_city_results`); box.innerHTML = data.map(c => `<div class="search-item" onclick="app.ui.pickCity('${pfx}', ${c.lat}, ${c.lon}, '${c.display_name.split(',')[0]}')">${c.display_name}</div>`).join(''); box.style.display = 'block'; } catch(e) { console.error("Search Error", e); } },
        pickCity: function(pfx, lat, lon, name) { document.getElementById(`${pfx}_lat`).value = lat; document.getElementById(`${pfx}_lon`).value = lon; document.getElementById(`${pfx}_city`).value = name; document.getElementById(`${pfx}_city_results`).style.display = 'none'; app.calculate(pfx); },
        scan20MinWindow: function(pfx) { app.scan20MinWindow(pfx); },
        runJaiminiSexCheck: function(pfx) { app.runJaiminiSexCheck(pfx); },
        runJaiminiRect: function(pfx) { app.runJaiminiRect(pfx); },
        autoFixPranapada: function(pfx) { app.autoFixPranapada(pfx); }
    },
    runJaiminiSexCheck: function(pfx) {
        if (!this.currentJaiminiData) return alert("Please Run Engine first.");
        const state = document.getElementById(`${pfx}_vig_state`).value;
        const isExalted = state === 'exalted';
        const isDebil = state === 'debilitated';
        const lagna = this.lastCalcData ? this.lastCalcData.find(p => p.name === 'Lagna') : null;
        const signIdx = lagna ? lagna.signIdx : 0; 
        const res = JaiminiEngine.determineSex(this.currentJaiminiData.planetIndex, isExalted, isDebil, signIdx);
        const box = document.getElementById(`${pfx}_sex_result`);
        box.style.display = 'block';
        box.innerHTML = `Result: <strong>${res.sex}</strong><br><span style="font-size:0.7rem; color:var(--text-muted)">${res.reason}</span>`;
    },
    runJaiminiRect: function(pfx) {
        if (!this.currentJaiminiData) return alert("Run Engine first.");
        const inputGender = document.getElementById(`${pfx}_gender`).value.toUpperCase();
        const lagna = this.lastCalcData ? this.lastCalcData.find(p => p.name === 'Lagna') : null;
        const signIdx = lagna ? lagna.signIdx : 0;
        const opts = JaiminiEngine.getMicroScan(this.currentJaiminiData.totalVighatikas, this.currentJaiminiData.actualUtcDate, signIdx);
        const tbody = document.getElementById(`${pfx}_jaimini_rect_body`);
        tbody.innerHTML = opts.map(o => { const isMatch = o.gender === inputGender; const style = isMatch ? 'background:var(--success); color:white; font-weight:bold;' : (o.offset === 0 ? 'background:var(--hover-bg); font-weight:bold;' : ''); return `<tr onclick="app.setTob('${pfx}', '${o.time}')" style="cursor:pointer; ${style}"><td>${o.offset > 0 ? '+' : ''}${o.offset}</td><td>${o.time}</td><td>${o.planet.substring(0,3)}</td><td>${o.gender}</td></tr>`; }).join('');
    },
    renderTable: function(pfx, data) { const body = document.getElementById(`${pfx}_table_body`); if(!body) return; body.innerHTML = data.map(p => `<tr class="${p.isLagna ? 'lagna-row' : ''}"><td style="font-weight:700;">${p.name}${p.isRetro ? ' <small style="color:var(--planet-color)">Ⓡ</small>' : ''}</td><td>${p.sign.substring(0,3)} ${p.degStr.split(' ')[0]}°</td><td style="color:var(--planet-color); font-weight:700;">${SIGNS[p.d3jIdx].substring(0,3)}</td><td style="font-weight:700;">${SIGNS[p.d60Idx].substring(0,3)}</td><td style="font-size:0.7rem; color:var(--text-muted);">${p.d60Deity}</td></tr>`).join(''); },
    renderSouthIndianChart: function(containerId, planetData, varga) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";
        const gridMap = [11, 0, 1, 2, 10, null, null, 3, 9, null, null, 4, 8, 7, 6, 5];
        const key = varga === "D1" ? "signIdx" : varga === "D3-J" ? "d3jIdx" : varga === "D9" ? "d9Idx" : "d60Idx";
        
        gridMap.forEach((sIdx, i) => {
            if (sIdx === null) {
                if (i === 5) container.innerHTML += `<div class="si-center">${varga}</div>`;
                return;
            }
            const occupants = planetData.filter(p => p[key] === sIdx);
            const lagna = planetData.find(p => p.isLagna && p[key] === sIdx);
            
            let html = `<div class="si-box ${lagna ? 'si-lagna' : ''}">`;
            html += `<span class="si-sign-label">${SIGNS[sIdx].substring(0,2)}</span>`;
            occupants.forEach(p => {
                if (!p.isLagna) html += `<div style="color:var(--planet-color); font-weight:700; font-size:0.65rem;">${p.name.substring(0,2)}</div>`;
            });
            container.innerHTML += html + `</div>`;
        });
    },
    refreshCharts: function() {
        if (!this.lastCalcData) return;
        this.renderSouthIndianChart("si_chart1", this.lastCalcData, document.getElementById("chart1_varga").value);
        this.renderSouthIndianChart("si_chart2", this.lastCalcData, document.getElementById("chart2_varga").value);
    }
};

window.onload = () => app.init();