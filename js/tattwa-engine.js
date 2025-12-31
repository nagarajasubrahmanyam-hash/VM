/**
 * TATTWA ENGINE - VERIFIED
 * 1. Tattwa Shodhana (Time-Element Check)
 * 2. Kunda Method (Lagna * 81) - Validated against Reference Slides
 */
const TattwaEngine = {
    
    // --- 1. TATTWA SHODHANA (Time Based) ---
    // Cycle: 24 Minutes. Sub-periods: 4.8 Minutes.
    // Order: Ether(0) -> Air(1) -> Fire(2) -> Water(3) -> Earth(4)
    calculateTattwa: function(birthDate, sunriseDate) {
        const dayIdx = sunriseDate.getDay(); 
        // Sun(0)=Fire(2), Mon(1)=Water(3), Tue(2)=Fire(2), Wed(3)=Earth(4), Thu(4)=Ether(0), Fri(5)=Water(3), Sat(6)=Air(1)
        const startMap = { 0:2, 1:3, 2:2, 3:4, 4:0, 5:3, 6:1 }; 
        const startElement = startMap[dayIdx];
        
        let diffMs = birthDate.getTime() - sunriseDate.getTime();
        if(diffMs < 0) diffMs += 24*60*60*1000;
        const diffMins = diffMs / 60000;
        
        const cyclePos = diffMins % 24;
        const subPeriod = Math.floor(cyclePos / 4.8); 
        const currentTattwaIdx = (startElement + subPeriod) % 5;
        
        const tattwas = [
            { name: "Akasha (Ether)", gender: "MALE" },
            { name: "Vayu (Air)", gender: "FEMALE" },
            { name: "Tejas (Fire)", gender: "MALE" },
            { name: "Apas (Water)", gender: "FEMALE" },
            { name: "Prithvi (Earth)", gender: "MALE" }
        ];
        
        return tattwas[currentTattwaIdx];
    },

    // --- 2. KUNDA (81) METHOD (Lagna Based) ---
    // Reference: Kunda Slides.pdf (Page 8)
    // Formula: (Lagna * 81) % 360
    // Rule: Kunda Sign must be 1, 5, 7, 9 from Moon Sign (Page 9)
    calculateKunda: function(lagnaDeg, moonDeg) {
        // Calculate Kunda Longitude 
        const kundaLong = (lagnaDeg * 81) % 360;
        
        // Get Signs (0-11)
        const kundaSign = Math.floor(kundaLong / 30);
        const moonSign = Math.floor(moonDeg / 30);
        
        // Calculate Distance (1-12)
        // (Target - Source + 12) % 12 + 1
        const dist = ((kundaSign - moonSign + 12) % 12) + 1;
        
        // Valid positions: 1, 5, 7, 9 
        const isValid = [1, 5, 7, 9].includes(dist);
        
        return {
            kundaLong: kundaLong,
            kundaSign: kundaSign,
            moonSign: moonSign,
            distance: dist,
            match: isValid,
            signName: SIGNS[kundaSign]
        };
    }
};