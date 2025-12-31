/**
 * JAIMINI ENGINE
 * Logic for Vighatika Graha and Micro-Rectification
 * Based on Upadesa Sutras (4.3.1 - 4.3.12)
 */
const JaiminiEngine = {
    
    // --- 1. VIGHATIKA CALCULATION ---
    // 1 Vighatika = 24 Seconds
    // 1 Minute = 2.5 Vighatikas
    calculateVighatika: function(birthDateObj, sunriseDateObj) {
        let diffMs = birthDateObj.getTime() - sunriseDateObj.getTime();
        
        // Handle birth before sunrise (assign to previous day cycle)
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000; 
        }

        const elapsedMinutes = diffMs / (1000 * 60);
        const vighatikas = elapsedMinutes * 2.5;
        
        // 9 Planets cycle (1-9): Sun to Ketu
        let remainder = Math.ceil(vighatikas % 9);
        if (remainder === 0) remainder = 9;

        const planets = ['', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
        
        return {
            minutesSinceSunrise: elapsedMinutes,
            totalVighatikas: vighatikas,
            planetIndex: remainder,
            planetName: planets[remainder]
        };
    },

    // --- 2. SEX DETERMINATION (Tiered Logic) ---
    determineSex: function(vgIndex, isExalted, isDebilitated, signIdx) {
        // Tier 1: Exaltation/Debilitation (Overrides all)
        if (isExalted) return { sex: 'MALE', reason: 'Exalted' };
        if (isDebilitated) return { sex: 'FEMALE', reason: 'Debilitated' };

        // Tier 2: Sign Logic (Jaimini Odd/Even Exceptions)
        // Standard: Odd=Male, Even=Female. Exceptions: Ge/Aq(F), Cn/Pi(M)
        const signNum = signIdx + 1; // 1-12
        
        // Tier 3: VG Gender (Fallback)
        // 1=Sun(M), 2=Moon(F), 3=Mars(M), 4=Merc(N), 5=Jup(M), 6=Ven(F), 7=Sat(N), 8=Rah(M), 9=Ket(F)
        const vgGenders = {
            1: 'MALE', 2: 'FEMALE', 3: 'MALE', 4: 'MALE', // Mercury is male in some BTR contexts or Neuter
            5: 'MALE', 6: 'FEMALE', 7: 'MALE', 8: 'MALE', 9: 'FEMALE' 
        };
        // Note: Saturn/Mercury often treated as Male/Female depending on sign in practice, 
        // but strict Parashara/Jaimini assigns Neuter. For BTR binary choice, usually N->Male or context dependent.
        // We will stick to the file's logic or standard mapping.
        
        return { 
            sex: vgGenders[vgIndex], 
            reason: `VG is ${vgGenders[vgIndex]}` 
        };
    },

    // --- 3. MICRO-SCAN (24-SECOND SLITS) ---
    // Generates 20 options centered on current time, stepping by 1 Vighatika (24s)
    getMicroScan: function(baseVig, baseDate, lagnaSignIdx) {
        const options = [];
        
        // Generate -10 to +10 range (approx +/- 4 mins)
        for (let i = -10; i <= 10; i++) {
            // New Vighatika Count
            // We floor the base first to align to the "start" of the current vighatika, then shift
            const currentVigFloor = Math.floor(baseVig); 
            const targetVig = currentVigFloor + i;
            
            // Calculate Time Difference
            // 1 Vig = 24 seconds = 0.4 minutes
            const vigDiff = targetVig - baseVig;
            const minDiff = vigDiff * 0.4;
            
            const newTime = new Date(baseDate.getTime() + minDiff * 60000);
            
            // Calculate Planet for this slit
            let rem = (targetVig % 9);
            if (rem === 0) rem = 9;
            if (rem < 0) rem = 9 + rem; // handle negative mod
            
            const planets = ['', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
            const pIndex = Math.abs(rem); // ensure positive index
            
            // Determine Sex for this slit
            // Note: We don't know Exalt/Debil status easily without full planetary pos, 
            // so we rely on Tier 3 (VG Gender) for the quick scan table.
            const sexInfo = this.determineSex(pIndex, false, false, lagnaSignIdx);

            options.push({
                offset: i,
                time: newTime.toTimeString().split(' ')[0], // HH:MM:SS
                vig: targetVig,
                planet: planets[pIndex],
                gender: sexInfo.sex
            });
        }
        return options;
    }
};