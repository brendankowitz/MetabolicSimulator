import { Pathway, Enzyme } from './types';

export interface UserProfile {
    age: number;
    weightKg: number;
    heightCm: number;
    gender: 'Male' | 'Female';
    sleepHours: number;
    sleepQuality: number;
}

export class MetabolicAdjuster {
    
    public static applyProfile(pathways: Pathway[], profile: UserProfile): Pathway[] {
        // Deep clone to avoid mutating original JSON data
        const adjustedPathways: Pathway[] = JSON.parse(JSON.stringify(pathways));

        // Derived metrics
        const nadDeclineFactor = 1.0 - (profile.age > 30 ? (profile.age - 30) * 0.015 : 0);
        
        let stressMultiplier = 1.0 + (profile.age > 40 ? (profile.age - 40) * 0.02 : 0);
        if (profile.sleepHours < 6 || profile.sleepQuality < 70) stressMultiplier *= 1.2;

        adjustedPathways.forEach(p => {
            // 1. Adjust Metabolites (Initial Concentrations)
            p.metabolites.forEach(m => {
                if (m.id === 'nad_plus_cyto' || m.id === 'nad_plus_mito') {
                    m.initialConcentration *= nadDeclineFactor;
                }
                if (m.id === 'ros') {
                    m.initialConcentration *= stressMultiplier;
                }
                if (m.id === 'cortisol') {
                    if (profile.sleepHours < 6) m.initialConcentration *= 1.5;
                }
            });

            // 2. Adjust Reactions (Enzyme Vmax) is tricky because Vmax is on the Enzyme object,
            // but in our TS model, Enzymes are looked up from a separate dictionary.
            // We need to return a list of Modified Enzymes as well, or modify the layout logic to support per-pathway enzyme overrides.
            
            // Actually, the Solver uses `enzymeLookup`. We should modify that lookup!
        });

        return adjustedPathways;
    }

    public static getAdjustedEnzymes(enzymes: Record<string, Enzyme>, profile: UserProfile): Record<string, Enzyme> {
        const adjusted: Record<string, Enzyme> = JSON.parse(JSON.stringify(enzymes));

        Object.values(adjusted).forEach(e => {
            // Age-related CD38 increase
            if (e.id === 'cd38') {
                const ageFactor = 1.0 + (profile.age / 60.0);
                e.vmax *= ageFactor;
            }

            // Mitochondrial Decline
            if (e.id === 'etc_complex1') {
                const decline = (profile.age > 30) ? (profile.age - 30) * 0.01 : 0;
                e.vmax *= Math.max(0.5, 1.0 - decline);
            }

            // Sleep deprivation effect on NAMPT
            if (e.id === 'nampt') {
                if (profile.sleepHours < 6 || profile.sleepQuality < 70) {
                    e.vmax *= 0.7;
                }
            }
        });

        return adjusted;
    }
}
