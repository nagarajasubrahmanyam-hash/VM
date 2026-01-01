/**
 * APP ORCHESTRATOR - Forensic BTR Edition
 * VERSION: Smart Automation (Auto-TZ + Clean UI)
 */
const app = {
    lastCalcData: null,
    searchTimeout: null,
    currentJaiminiData: null, 
    timeZoneId: null, // Stores 'Asia/Kolkata', 'America/New_York', etc.

    overrides: { d60: 'AUTO', pp: 'AUTO', kunda: 'AUTO', gender: 'AUTO' },

    // --- 0. HELPERS: TIME & DISPLAY ---
    
    // Convert UTC -> Wall Clock
    formatChartTime: function(utcDateObj, tzOffset) {
        if (!utcDateObj) return "00:00:00";
        const wallClockMs = utcDateObj.getTime() + (tzOffset * 3600000);
        const wallDate = new Date(wallClockMs);
        return wallDate.toISOString().substring(11, 19);
    },

    // NEW: Calculate Offset for a specific Date in a specific TimeZone String
    // This handles DST automatically based on the date provided.
    getOffsetForDate: function(tzString, dateStr) {
        try {
            // Create a date object for the birth date
            const targetDate = new Date(dateStr + "T12:00:00Z");
            
            // Get the time string in the target timezone
            const strInTz = targetDate.toLocaleString("en-US", { timeZone: tzString, timeZoneName: "longOffset" });
            
            // Extract offset (e.g., "GMT-04:00" or "GMT+05:30")
            // Modern browsers return "GMT-4" or "GMT+5:30" in the string.
            // Using Intl.DateTimeFormat is safer:
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: tzString,
                timeZoneName: 'longOffset'
            }).formatToParts(targetDate);
            
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            if (!offsetPart) return 0;

            const gmtStr = offsetPart.value; // "GMT-04:00" or "GMT+05:30"
            
            if (gmtStr === "GMT") return 0;
            
            // Parse "GMT-04:00" -> -4.0
            const clean = gmtStr.replace("GMT", "").replace(":", ".");
            const sign = clean.includes("-") ? -1 : 1;
            const [h, m] = clean.replace("+", "").replace("-", "").split(".").map(Number);
            
            let val = h + (m ? m/60 : 0);
            return val * sign;
            
        } catch (e) {
            console.error("TZ Calc Error", e);
            return 0; // Fallback
        }
    },

    // --- 1. INITIALIZATION ---
    init: async function() {
        const storedTheme = localStorage.getItem('vedic_theme') || 'light';
        document.documentElement.setAttribute('data-theme', storedTheme);

        // Set Default "Now"
        const now = new Date();
        const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        
        const pfx = 'm'; 
        if (document.getElementById(`${pfx}_dob`)) document.getElementById(`${pfx}_dob`).value = dateStr;
        if (document.getElementById(`${pfx}_tob`)) document.getElementById(`${pfx}_tob`).value = timeStr;
        
        // Initial Local Guess
        const localOffset = -(now.getTimezoneOffset() / 60);
        if (document.getElementById(`${pfx}_tz`)) document.getElementById(`${pfx}_tz`).value = localOffset;
        
        try {
            this.timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone; // "Asia/Calcutta" etc.
            if(document.getElementById(`${pfx}_tz_name`)) document.getElementById(`${pfx}_tz_name`).innerText = this.timeZoneId;
        } catch(e) {}

        this.autoLocate(pfx);

        // Close dropdowns
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.input-group-box')) {
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

    toggleOverride: function(key) {
        const states = ['AUTO', 'PASS', 'FAIL'];
        this.overrides[key] = states[(states.indexOf(this.overrides[key]) + 1) % 3];
        this.calculate('m'); 
    },

    // --- 2. SMART LOCATION & TIMEZONE ---

    autoLocate: function(pfx) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                this.solveLocation(pfx, lat, lon, "My Location");
            }, () => {
                // Default to New Delhi if denied
                this.ui.pickCity(pfx, 28.61, 77.23, "New Delhi, India", "Asia/Kolkata");
            });
        }
    },

    // The Master Location Solver
    solveLocation: async function(pfx, lat, lon, displayName) {
        document.getElementById(`${pfx}_lat`).value = lat;
        document.getElementById(`${pfx}_lon`).value = lon;
        document.getElementById(`${pfx}_city`).value = displayName;
        
        // Hide Dropdown
        document.getElementById(`${pfx}_city_results`).style.display = 'none';

        // 1. Fetch Timezone ID from Coordinates (using Open-Meteo free API)
        try {
            document.getElementById(`${pfx}_tz_name`).innerText = "Fetching Zone...";
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
            const data = await res.json();
            
            if (data.timezone) {
                this.timeZoneId = data.timezone; // e.g. "America/New_York"
                document.getElementById(`${pfx}_tz_name`).innerText = this.timeZoneId;
                
                // 2. Calculate Offset for the entered DOB
                this.ui.updateTzFromDate(pfx);
            }
        } catch (e) {
            console.error("TZ Fetch Failed", e);
            document.getElementById(`${pfx}_tz_name`).innerText = "Manual TZ Required";
        }
        
        this.calculate(pfx);
    },

    // --- 3. LOGIC & HELPERS ---
    
    updateLiveSound: function(pfx) {
        const name = document.getElementById(`${pfx}_name`).value;
        const soundKey = this.getAutoSound(name);
        const signIdx = HODA_CAKRA[soundKey];
        const el = document.getElementById(`${pfx}_feedback_sound`);
        if (el) el.innerHTML = `<span style="color:var(--primary); font-weight:800;">${soundKey.toUpperCase()}</span> (${SIGNS[signIdx] || "?"})`;
    },

    adjustTime: function(pfx, seconds) {
        const timeInput = document.getElementById(`${pfx}_tob`);
        const [h, m, s] = timeInput.value.split(':').map(Number);
        let date = new Date();
        date.setHours(h, m, (s || 0) + seconds);
        timeInput.value = date.toTimeString().split(' ')[0];
        this.calculate(pfx);
    },

    getAutoSound: function(name) {
        if (!name) return "mo";
        const clean = name.trim().toLowerCase();
        if (HODA_CAKRA[clean.substring(0, 3)]) return clean.substring(0, 3);
        if (HODA_CAKRA[clean.substring(0, 2)]) return clean.substring(0, 2);
        if (HODA_CAKRA[clean.substring(0, 1)]) return clean.substring(0, 1);
        return "mo";
    },

    // --- 4. CALCULATION ENGINE (PURE UTC) ---
    calculate: function(pfx) {
        if (typeof Astronomy === 'undefined') return;
        this.currentJaiminiData = null;

        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        
        if (!dobRaw || !tobRaw || isNaN(lat) || isNaN(tz)) return;

        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        
        // 1. Wall Clock -> Absolute UTC
        const inputAsUtc = Date.UTC(y, m - 1, d, h, min, s || 0);
        const trueUtcTimestamp = inputAsUtc - (tz * 3600000);
        const actualUtcDate = new Date(trueUtcTimestamp);

        // 2. Logic Execution
        const ayanamsa = VedicEngine.getAyanamsa(actualUtcDate);
        const lagnaDeg = VedicEngine.calculateLagna(actualUtcDate, lat, lon, ayanamsa);
        const pPositions = AstroWrapper.getPositions(actualUtcDate);
        const sunPos = pPositions.find(p => p.name === "Sun").lon;
        const ppLon = VedicEngine.calculatePranapada(actualUtcDate, lat, lon, sunPos - ayanamsa);

        const planetData = [VedicEngine.formatData("Lagna", lagnaDeg, false, 0, lagnaDeg, true)];
        pPositions.forEach(p => planetData.push(VedicEngine.formatData(p.name, p.lon, p.isRetro, ayanamsa, lagnaDeg)));
        planetData.push(VedicEngine.formatData("Pranapada", ppLon, false, ayanamsa, lagnaDeg));

        this.lastCalcData = planetData;
        
        // Updates
        this.updateLiveSound(pfx);
        this.renderTable(pfx, planetData);
        this.refreshCharts();
        
        // Jaimini / Tattwa / BTR
        const obs = new Astronomy.Observer(lat, lon, 0);
        const rise = Astronomy.SearchRiseSet('Sun', obs, +1, Astronomy.MakeTime(actualUtcDate), -1);
        
        let genderMatch = false;
        let kundaMatch = false;

        if (rise) {
             const jData = JaiminiEngine.calculateVighatika(actualUtcDate, rise.date);
             this.currentJaiminiData = { ...jData, sunriseDate: rise.date, actualUtcDate };
             if(document.getElementById(`${pfx}_vig_display`)) {
                 document.getElementById(`${pfx}_vig_display`).value = `${jData.totalVighatikas.toFixed(1)} (${jData.planetName})`;
                 document.getElementById(`${pfx}_sunrise_display`).value = this.formatChartTime(rise.date, tz);
             }
             
             // Gender Check
             const gInput = document.getElementById(`${pfx}_gender`).value.toUpperCase();
             const lSign = Math.floor(lagnaDeg/30);
             const jRes = JaiminiEngine.determineSex(jData.planetIndex, false, false, lSign);
             genderMatch = (jRes.sex === gInput);
        }

        const moonPos = pPositions.find(p => p.name === "Moon").lon;
        const kunda = TattwaEngine.calculateKunda(lagnaDeg, (moonPos - ayanamsa + 360) % 360);
        kundaMatch = kunda.match;

        const btr = RectificationAnalyzer.analyze(planetData, {
            name: document.getElementById(`${pfx}_name`).value,
            gender: document.getElementById(`${pfx}_gender`).value,
            ppLon: ppLon,
            forcedSound: this.getAutoSound(document.getElementById(`${pfx}_name`).value),
            forcedArudha: "AUTO"
        });

        const autoResults = {
            genderMatch: genderMatch,
            kundaMatch: kundaMatch,
            d60Match: btr.isRectified,
            ppMatch: btr.checks.find(c=>c.id==='pp').status === 'PASS',
            d60Reason: btr.checks[0].description,
            genderReason: genderMatch ? "Matches" : "Mismatch",
            kundaReason: kunda.match ? "Match" : "Mismatch",
            ppReason: "Pranapada Alignment"
        };
        
        this.renderAuditor(pfx, autoResults);
        this.renderTimelineMap(pfx, actualUtcDate, lat, lon, ayanamsa, document.getElementById(`${pfx}_gender`).value, (moonPos-ayanamsa+360)%360, tz);

        // UTC Hint
        const uH = actualUtcDate.getUTCHours().toString().padStart(2, '0');
        const uM = actualUtcDate.getUTCMinutes().toString().padStart(2, '0');
        if(document.getElementById(`${pfx}_utc_hint`)) document.getElementById(`${pfx}_utc_hint`).innerText = `${uH}:${uM} Z`;
    },

    // --- 5. UI CONTROLLERS ---
    ui: {
        switchTab: function(tabName) {
            document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('tab_standard').style.display = tabName === 'standard' ? 'block' : 'none';
            document.getElementById('tab_jaimini').style.display = tabName === 'jaimini' ? 'block' : 'none';
            document.getElementById('visual_lab_section').style.display = tabName === 'standard' ? 'grid' : 'none';
        },
        
        handleSearchDebounced: function(pfx) { 
            clearTimeout(app.searchTimeout); 
            app.searchTimeout = setTimeout(() => this.handleSearch(pfx), 400); 
        },
        
        handleSearch: async function(pfx) { 
            const q = document.getElementById(`${pfx}_city`).value; 
            if (q.length < 3) return; 
            try { 
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`); 
                const data = await res.json(); 
                const box = document.getElementById(`${pfx}_city_results`); 
                box.innerHTML = data.map(c => `<div class="search-item" onclick="app.solveLocation('${pfx}', ${c.lat}, ${c.lon}, '${c.display_name.split(',')[0]}')">${c.display_name}</div>`).join(''); 
                box.style.display = 'block'; 
            } catch(e) { console.error("Search Error", e); } 
        },
        
        pickCity: function(pfx, lat, lon, name) { 
            app.solveLocation(pfx, lat, lon, name); 
        },

        // Triggered when Date changes to recalculate DST offset
        updateTzFromDate: function(pfx) {
            if (!app.timeZoneId) return;
            const dob = document.getElementById(`${pfx}_dob`).value;
            if (!dob) return;
            
            const offset = app.getOffsetForDate(app.timeZoneId, dob);
            document.getElementById(`${pfx}_tz`).value = offset;
            
            // Re-run if we have a time
            if(document.getElementById(`${pfx}_tob`).value) app.calculate(pfx);
        }
    },
    
    // --- 6. RENDERERS (Charts, Tables, etc.) ---
    renderTable: function(pfx, data) {
         const body = document.getElementById(`${pfx}_table_body`); 
         if(!body) return; 
         body.innerHTML = data.map(p => `<tr class="${p.isLagna ? 'lagna-row' : ''}"><td style="font-weight:700;">${p.name}${p.isRetro ? ' <small style="color:var(--planet-color)">Ⓡ</small>' : ''}</td><td>${p.sign.substring(0,3)} ${p.degStr.split(' ')[0]}°</td><td style="color:var(--planet-color); font-weight:700;">${SIGNS[p.d3jIdx].substring(0,3)}</td><td style="font-weight:700;">${SIGNS[p.d60Idx].substring(0,3)}</td><td style="font-size:0.7rem; color:var(--text-muted);">${p.d60Deity}</td></tr>`).join(''); 
    },
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
            occupants.forEach(p => { if (!p.isLagna) html += `<div style="color:var(--planet-color); font-weight:700; font-size:0.65rem;">${p.name.substring(0,2)}</div>`; });
            container.innerHTML += html + `</div>`;
        });
    },
    refreshCharts: function() {
        if (!this.lastCalcData) return;
        this.renderSouthIndianChart("si_chart1", this.lastCalcData, document.getElementById("chart1_varga").value);
        this.renderSouthIndianChart("si_chart2", this.lastCalcData, document.getElementById("chart2_varga").value);
    },
    renderAuditor: function(pfx, autoResults) {
         const box = document.getElementById(`${pfx}_analysis`);
         if(!box) return;
         
         const percent = [autoResults.genderMatch, autoResults.kundaMatch, autoResults.d60Match, autoResults.ppMatch].filter(Boolean).length * 25;
         
         box.innerHTML = `
         <div class="auditor-panel" style="border:none; margin:0;">
             <div class="auditor-header">
                <span style="font-weight:bold;">Forensic Result</span>
                <span style="background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px;">${percent}% MATCH</span>
             </div>
             <div class="audit-row"><div class="audit-info"><strong>Gender</strong><div style="font-size:0.7rem; opacity:0.8">${autoResults.genderReason}</div></div><div>${autoResults.genderMatch ? '✅' : '❌'}</div></div>
             <div class="audit-row"><div class="audit-info"><strong>Kunda</strong><div style="font-size:0.7rem; opacity:0.8">${autoResults.kundaReason}</div></div><div>${autoResults.kundaMatch ? '✅' : '❌'}</div></div>
             <div class="audit-row"><div class="audit-info"><strong>D60 Link</strong><div style="font-size:0.7rem; opacity:0.8">${autoResults.d60Reason}</div></div><div>${autoResults.d60Match ? '✅' : '❌'}</div></div>
         </div>`;
         box.style.display = 'block';
    },
    renderTimelineMap: function(pfx, centerDate, lat, lon, ayanamsa, gender, moonSidereal, tz) {
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
        const segments = [];
    
        for (let i = -steps; i <= steps; i++) {
            const t = new Date(centerDate.getTime() + (i * stepSec * 1000));
            const timeDisplay = this.formatChartTime(t, tz);
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
                if(jRes.sex === gender) isGenMatch = true;
            }
            let d60Match = false;
            targetSigns.forEach(target => { if (target === lD60 || VedicEngine.hasRashiDrishti(target, lD60)) d60Match = true; });

            segments.push({
                offset: i * stepSec, timeDisplay: timeDisplay,
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
        
        const inputAsUtc = Date.UTC(y, m - 1, d, h, min, s || 0);
        const centerUtc = new Date(inputAsUtc - (tz * 3600000));
        const seedDate = new Date(Date.UTC(y, m-1, d, 12, 0, 0)); 
        const obs = new Astronomy.Observer(lat, lon, 0);
        const riseInfo = Astronomy.SearchRiseSet('Sun', obs, +1, Astronomy.MakeTime(seedDate), -1);
        const sunriseDate = riseInfo ? riseInfo.date : null;
        
        const centerMoonPos = AstroWrapper.getPositions(centerUtc).find(p => p.name === "Moon").lon;
        const ayanamsa = VedicEngine.getAyanamsa(centerUtc);
        const moonSidereal = (centerMoonPos - ayanamsa + 360) % 360;

        let matches = [];
        for (let offset = -600; offset <= 600; offset += 15) {
            let scanUtc = new Date(centerUtc.getTime() + offset * 1000);
            const displayTime = this.formatChartTime(scanUtc, tz);

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
            matches.push({ time: displayTime, d60Score: d60Score, genderMatch: genderMatch, kundaMatch: kundaMatch, confidence: Math.round(totalConfidence), vigPlanet: vigPlanet, btrData: btr });
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
    autoFixPranapada: function(pfx) {
        const dobRaw = document.getElementById(`${pfx}_dob`).value;
        const tobRaw = document.getElementById(`${pfx}_tob`).value;
        const tz = parseFloat(document.getElementById(`${pfx}_tz`).value);
        const lat = parseFloat(document.getElementById(`${pfx}_lat`).value);
        const lon = parseFloat(document.getElementById(`${pfx}_lon`).value);
        const [y, m, d] = dobRaw.split('-').map(Number);
        const [h, min, s] = tobRaw.split(':').map(Number);
        
        const inputAsUtc = Date.UTC(y, m-1, d, h, min, s || 0);
        const baseUtc = new Date(inputAsUtc - (tz * 3600000));
        
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
            const newTimeStr = this.formatChartTime(bestMatch.time, tz);
            if(confirm(`Found Match!\n\nShift: ${bestMatch.offset > 0 ? '+' : ''}${bestMatch.offset} seconds\nNew Time: ${newTimeStr}\nRelation: ${bestMatch.dist}th from Moon (D9)\n\nApply this time?`)) {
                document.getElementById(`${pfx}_tob`).value = newTimeStr;
                this.calculate(pfx);
            }
        } else {
            alert("No alignment found within ±15 minutes.");
        }
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
        tbody.innerHTML = opts.map(o => { 
            const isMatch = o.gender === inputGender; 
            const style = isMatch ? 'background:var(--success); color:white; font-weight:bold;' : (o.offset === 0 ? 'background:var(--hover-bg); font-weight:bold;' : ''); 
            return `<tr onclick="app.setTob('${pfx}', '${o.time}')" style="cursor:pointer; ${style}"><td>${o.offset > 0 ? '+' : ''}${o.offset}</td><td>${o.time}</td><td>${o.planet.substring(0,3)}</td><td>${o.gender}</td></tr>`; 
        }).join('');
    },
    loadSample: function(pfx) { this.solveLocation(pfx, 13.62, 79.41, "Tirupati"); document.getElementById(`${pfx}_dob`).value="1985-05-20"; document.getElementById(`${pfx}_tob`).value="14:30:15"; setTimeout(()=>this.calculate(pfx), 500); }
};

window.onload = () => app.init();
