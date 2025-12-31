/**
 * RECTIFICATION ANALYZER - Professional Forensic Edition
 * Features: 
 * 1. Detailed Human-Readable Reasoning (Why it passed/failed)
 * 2. Dual Lordship Support (Scorpio=Mars+Ketu, Aquarius=Saturn+Rahu)
 * 3. Quad-Lock Logic (Ketu, Name, Pranapada, Arudha)
 */

const RectificationAnalyzer = {
    
    // Helper: Get all lords of a sign (handles Dual Ownership for Sc/Aq)
    getSignLords: function(signIdx) {
        const primaryLordIdx = SIGN_LORDS[signIdx];
        const lords = [PLANET_LIST[primaryLordIdx]];
        
        // Add Co-Lords for Scorpio (7) and Aquarius (10)
        if (signIdx === 7) lords.push("Ketu");   // Scorpio
        if (signIdx === 10) lords.push("Rahu");  // Aquarius
        
        return lords;
    },

    /**
     * Main Analysis Function
     * @param {Array} planetData - Calculated planetary positions
     * @param {Object} metadata - User inputs {name, gender, ppLon, forcedSound, forcedArudha}
     */
    analyze: function(planetData, metadata) {
        const lagna = planetData.find(p => p.isLagna);
        const moon = planetData.find(p => p.name === "Moon");
        const ketu = planetData.find(p => p.name === "Ketu");
        
        let trace = [];
        const results = {
            isRectified: false,
            checks: [],
            pastLife: [],
            trace: ""
        };

        const lSign = SIGNS[lagna.d60Idx]; // D60 Lagna Name
        trace.push(`--- FORENSIC TRACE: D60 LAGNA [${lSign.toUpperCase()}] ---`);

        // ==========================================================
        // TEST 1: KETU IDENTITY LINK (D60)
        // Rule: D60 Lagna must be linked to Ketu OR Ketu's Dispositor
        // ==========================================================
        const ketuSignIdx = ketu.d60Idx;
        const ketuSignName = SIGNS[ketuSignIdx];
        const ketuLords = this.getSignLords(ketuSignIdx);
        
        let hasKetuLink = false;
        let ketuReason = `Lagna is ${lSign}. Ketu is in ${ketuSignName}. `;

        // A. Check if Ketu itself aspects/conjuncts Lagna
        if (VedicEngine.hasRashiDrishti(ketuSignIdx, lagna.d60Idx) || ketuSignIdx === lagna.d60Idx) {
            hasKetuLink = true;
            ketuReason += `Ketu itself (${ketuSignName}) aspects Lagna.`;
        } 
        // B. Check if Dispositors (Lords of Ketu's sign) aspect Lagna
        else {
            let lordLinks = [];
            ketuLords.forEach(lordName => {
                const lordP = planetData.find(p => p.name === lordName);
                if (lordP) {
                    const lordSign = SIGNS[lordP.d60Idx];
                    if (VedicEngine.hasRashiDrishti(lordP.d60Idx, lagna.d60Idx) || lordP.d60Idx === lagna.d60Idx) {
                        hasKetuLink = true;
                        lordLinks.push(`${lordName} in ${lordSign}`);
                    }
                }
            });

            if (lordLinks.length > 0) {
                ketuReason += `Linked via Ketu Lord(s): ${lordLinks.join(", ")}.`;
            } else {
                ketuReason += `No link found from Ketu or its lords (${ketuLords.join(", ")}).`;
            }
        }
        
        trace.push(`[KETU CHECK] ${ketuReason}`);

        results.checks.push({
            id: 'ketu',
            label: "Ketu-Dispositor Link",
            status: hasKetuLink ? "PASS" : "FAIL",
            description: ketuReason,
            score: hasKetuLink ? 1 : 0
        });

        // ==========================================================
        // TEST 2: NAME-SOUND PORTAL (D60)
        // Rule: D60 Lagna must link to the Sign of the Name (Hoda Cakra)
        // ==========================================================
        let soundKey = metadata.forcedSound === "AUTO" ? app.getAutoSound(metadata.name) : metadata.forcedSound;
        const hodaSignIdx = HODA_CAKRA[soundKey] || 0; // Default Aries if unknown
        const hodaSignName = SIGNS[hodaSignIdx];
        
        let nameLinkFound = false;
        let nameReason = `Sound '${soundKey}' maps to ${hodaSignName}. `;
        
        // A. Check Sign Aspect
        if (VedicEngine.hasRashiDrishti(hodaSignIdx, lagna.d60Idx) || hodaSignIdx === lagna.d60Idx) {
            nameLinkFound = true;
            nameReason += `Name Sign (${hodaSignName}) directly aspects Lagna.`;
        } 
        // B. Check Lord Aspects
        else {
            const hodaLords = this.getSignLords(hodaSignIdx);
            let lordLinks = [];
            hodaLords.forEach(lordName => {
                const lordP = planetData.find(p => p.name === lordName);
                if (lordP) {
                    const lordSign = SIGNS[lordP.d60Idx];
                    if (VedicEngine.hasRashiDrishti(lordP.d60Idx, lagna.d60Idx) || lordP.d60Idx === lagna.d60Idx) {
                        nameLinkFound = true;
                        lordLinks.push(`${lordName} in ${lordSign}`);
                    }
                }
            });

            if (lordLinks.length > 0) {
                nameReason += `Linked via Name Lord(s): ${lordLinks.join(", ")}.`;
            } else {
                nameReason += `No link via Sign or Lords (${hodaLords.join(", ")}).`;
            }
        }

        trace.push(`[NAME CHECK] ${nameReason}`);

        results.checks.push({
            id: 'name',
            label: "Name-Sound Portal",
            status: nameLinkFound ? "PASS" : "FAIL",
            description: nameReason,
            score: nameLinkFound ? 1 : 0
        });

        // ==========================================================
        // TEST 3: PRANAPADA SYNC (D9)
        // Rule: Pranapada in D9 must be in trines (1,5,9) or 7th to Moon in D9
        // ==========================================================
        const ppD9Idx = VedicEngine.getDivisionalSign(metadata.ppLon, "D9");
        const moonD9Idx = moon.d9Idx;
        
        // Calculate House distance (1-12)
        const distPP = (ppD9Idx - moonD9Idx + 12) % 12; 
        const houseNum = distPP + 1;
        
        // Valid Houses: 1, 5, 7, 9
        const isPPSync = [1, 5, 7, 9].includes(houseNum); 
        
        const ppReason = `Moon is in ${SIGNS[moonD9Idx]} (D9). PP is in ${SIGNS[ppD9Idx]} (D9). This is the ${houseNum}th House (Requires 1, 5, 7, 9).`;

        trace.push(`[PRANAPADA] ${ppReason}`);

        results.checks.push({
            id: 'pp',
            label: "Prāṇapada Sync",
            status: isPPSync ? "PASS" : "FAIL",
            description: ppReason,
            score: isPPSync ? 1 : 0
        });

        // ==========================================================
        // TEST 4: SVA-ARUDHA BRIDGE (D60) - Optional but Strengthening
        // ==========================================================
        let alIdx = metadata.forcedArudha !== "AUTO" ? parseInt(metadata.forcedArudha) : this.calculateAL(planetData);
        const alSignName = SIGNS[alIdx];
        
        let alLinkFound = false;
        let alReason = `AL is ${alSignName}. `;

        if (VedicEngine.hasRashiDrishti(alIdx, lagna.d60Idx) || alIdx === lagna.d60Idx) {
            alLinkFound = true;
            alReason += `AL Sign directly aspects Lagna.`;
        } else {
             // Check AL Lords
             const alLords = this.getSignLords(alIdx);
             let lordLinks = [];
             alLords.forEach(lordName => {
                const lordP = planetData.find(p => p.name === lordName);
                if (lordP) {
                    if (VedicEngine.hasRashiDrishti(lordP.d60Idx, lagna.d60Idx) || lordP.d60Idx === lagna.d60Idx) {
                        alLinkFound = true;
                        lordLinks.push(lordName);
                    }
                }
             });
             if(lordLinks.length > 0) alReason += `Linked via AL Lord: ${lordLinks.join(", ")}.`;
             else alReason += `No connection found.`;
        }

        results.checks.push({
            id: 'arudha',
            label: "Svā-Arūḍha Bridge",
            status: alLinkFound ? "PASS" : "FAIL",
            description: alReason,
            score: alLinkFound ? 1 : 0
        });

        // ==========================================================
        // CONCLUSION
        // ==========================================================
        // Score Calculation
        const totalScore = results.checks.reduce((acc, curr) => acc + curr.score, 0);
        
        // Logic: 3 out of 4 is considered a solid rectification
        results.isRectified = totalScore >= 3;
        
        // Past Life Analysis (9th House from D60 Lagna)
        const ninthSign = (lagna.d60Idx + 8) % 12;
        const plLords = this.getSignLords(ninthSign);
        
        plLords.forEach(lordName => {
            const planet = planetData.find(p => p.name === lordName);
            if (!planet) return;
            
            const houseFromLagna = ((planet.d60Idx - lagna.d60Idx + 12) % 12) + 1;
            const signNature = planet.d60Idx % 3; 
            let loc = signNature === 1 ? "Local / Birthplace" : (signNature === 2 ? "Neighboring Region" : "Distant Land");
            
            results.pastLife.push({
                planet: lordName,
                location: loc,
                continent: CONTINENT_MAP[lordName] || "Unknown",
                death: this.getDeathReason(houseFromLagna)
            });
        });

        results.trace = trace.join('\n');
        return results;
    },

    // Helper: Calculate Arudha Lagna (AL) in D1 (Standard Parashara Method)
    calculateAL: function(planetData) {
        const lagna = planetData.find(p => p.isLagna);
        const l1Idx = SIGN_LORDS[lagna.signIdx]; 
        const l1Pos = planetData.find(p => p.name === PLANET_LIST[l1Idx]).signIdx;
        
        // Count from Lagna to Lord
        const gap = (l1Pos - lagna.signIdx + 12) % 12;
        
        // Count same distance from Lord
        let al = (l1Pos + gap) % 12;
        
        // Exceptions (If AL lands in 1st or 7th from Lagna)
        if (al === lagna.signIdx) al = (al + 9) % 12; // 10th
        if (al === (lagna.signIdx + 6) % 12) al = (al + 9) % 12; // 4th
        
        return al;
    },

    getDeathReason: function(house) {
        const reasons = {
            1: "Natural / Peaceful / Old Age",
            2: "Eating / Throat / Family dispute",
            3: "Throat / Short Journey / Skirmish",
            4: "At home / Heart Failure / Vehicle",
            5: "Stomach / Children / Chant",
            6: "Sickness / Enemy attack / Struggle",
            7: "Travel / Desire / Partner involved",
            8: "Sudden / Traumatic / Accident",
            9: "Religious place / Guru / Long Journey",
            10: "Workplace / Stress / Public Duty",
            11: "Friend's place / Gain / Group event",
            12: "Hospital / Foreign Land / Sleep"
        };
        return reasons[house] || "Natural Circumstances";
    }
};