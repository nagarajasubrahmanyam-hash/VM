const MarriageAnalyzer = {
    analyze: function(planets) {
        const venus = planets.find(p => p.name === "Venus");
        const lagna = planets.find(p => p.isLagna);
        const dusthanas = [6, 8, 12];
        const report = { steps: [], conclusion: {} };
        let severity = 0;

        // 1. Placement
        const isDusthana = dusthanas.includes(venus.house);
        const pStep = { label: "Placement", check: `Venus in House ${venus.house}`, result: "Clear", impact: "Favorable" };
        if (isDusthana) {
            pStep.result = venus.isRetro ? "CRITICAL" : "Weakened";
            pStep.impact = venus.isRetro ? "Very evil relationship karma" : "Basic karma unstable";
            severity += venus.isRetro ? 10 : 3;
        }
        report.steps.push(pStep);

        // 2. Aspects
        const dLords = dusthanas.map(h => SIGN_LORDS[(lagna.signIdx + h - 1) % 12]);
        let findings = [];
        planets.forEach(p => {
            if (p.name === "Venus" || p.isLagna) return;
            const dist = (p.signIdx - venus.signIdx + 12) % 12;
            const isAspect = (dist === 0 || dist === 6) || (p.name === "Mars" && (dist === 3 || dist === 7)) || (p.name === "Jupiter" && (dist === 4 || dist === 8)) || (p.name === "Saturn" && (dist === 2 || dist === 9));
            if (isAspect) {
                if (dLords.includes(PLANET_LIST.indexOf(p.name))) { findings.push(`Dusthana Lord ${p.name}`); severity += 2; }
                if (MALEFICS.includes(p.name)) { findings.push(`Malefic ${p.name}`); severity += 2; }
            }
        });
        report.steps.push({ label: "Afflictions", check: "External Planetary Aspects", result: findings.length > 0 ? "Afflicted" : "Clear", impact: findings.length > 0 ? findings.join(", ") : "None" });

        // 3. Varga Confirm
        const vNavHouse = ((venus.navSignIdx - lagna.navSignIdx + 12) % 12) + 1;
        const navAff = dusthanas.includes(vNavHouse);
        report.steps.push({ label: "Navamsa", check: `D9 House ${vNavHouse}`, result: navAff ? "Afflicted" : "Supportive", impact: (isDusthana && navAff) ? "Karma Intensified" : "Surface only" });
        if (navAff) severity += 3;

        // 4. Conclusion
        if (severity >= 10) report.conclusion = { status: "Severely Challenged", color: "#dc2626", description: "Primary indicator is heavily damaged. Relationship instability likely." };
        else if (severity >= 5) report.conclusion = { status: "Average / Mixed", color: "#d97706", description: "Marriage requires effort; external obstructions present." };
        else report.conclusion = { status: "Favorable", color: "#16a34a", description: "Venus is stable. Marital happiness (Vivāha Sukha) is indicated." };

        return report;
    }
};