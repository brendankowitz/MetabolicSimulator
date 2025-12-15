// HomeostaticControls.ts - Maintains metabolic balance and prevents depletion
import { SimulationState } from './types';

export interface MetabolicStores {
  glycogen_liver: number;      // g (0-100g)
  glycogen_muscle: number;     // g (0-400g)
  adipose_triglycerides: number; // g (variable, ~10kg for average person)
  amino_acid_pool: number;     // g (free amino acids ~70g)
}

export class HomeostaticControls {

  /**
   * Applies homeostatic corrections to prevent unrealistic depletion
   * This runs AFTER each RK4 step to maintain physiological reality
   */
  static applyHomeostasis(
    state: SimulationState,
    stores: MetabolicStores,
    dt: number
  ): { state: SimulationState, stores: MetabolicStores } {

    const conc = { ...state.concentrations };
    const newStores = { ...stores };

    // 1. GLUCOSE HOMEOSTASIS - HARD CLAMP with store tracking
    // Blood glucose MUST stay in 4.0-7.0 range or you die
    const glucoseBlood = conc['glucose_blood'] || 5.0;
    const glucoseMin = 4.5;
    // glucoseMax replaced by glucoseStorageThreshold below
    const glucoseTarget = 5.0;

    if (glucoseBlood < glucoseMin && newStores.glycogen_liver > 0) {
      // FORCE glucose back to minimum - liver releases instantly
      const needed = glucoseMin - glucoseBlood;
      const glycogenCost = needed * 5; // ~5g glycogen per mM glucose
      const available = Math.min(glycogenCost, newStores.glycogen_liver);
      newStores.glycogen_liver -= available;
      conc['glucose_blood'] = glucoseBlood + (available / 5);
    }

    // If still low and glycogen depleted, use fat (gluconeogenesis)
    if ((conc['glucose_blood'] || 0) < glucoseMin && newStores.glycogen_liver < 1) {
      const needed = glucoseMin - (conc['glucose_blood'] || 0);
      const fatCost = needed * 20; // Less efficient
      if (newStores.adipose_triglycerides > fatCost) {
        newStores.adipose_triglycerides -= fatCost;
        conc['glucose_blood'] = glucoseMin;
        conc['fatty_acids_blood'] = (conc['fatty_acids_blood'] || 0.5) + 0.1;
      }
    }

    // Store excess glucose (insulin-dependent)
    const glucoseStorageThreshold = 5.3; // Lower threshold
    if (glucoseBlood > glucoseStorageThreshold && newStores.glycogen_liver < 100) {
      const excess = glucoseBlood - glucoseTarget;
      const insulinFactor = Math.min(1.0, (conc['insulin'] || 0.5) / 3.0);
      const stored = excess * 0.6 * insulinFactor; // Store half the excess
      conc['glucose_blood'] = glucoseBlood - stored;
      newStores.glycogen_liver = Math.min(100, newStores.glycogen_liver + stored * 6);
    }

    // 2. ATP HOMEOSTASIS - HARD CLAMP (cells die without ATP)
    const atpCyto = conc['atp_cyto'] || 5.0;
    const adpCyto = conc['adp_cyto'] || 0.5;
    const atpMin = 4.0;
    const atpMax = 6.0;

    // FORCE ATP to stay above minimum
    if (atpCyto < atpMin) {
      const needed = atpMin - atpCyto;
      // Convert ADP to ATP (simulating emergency oxidative phosphorylation)
      const available = Math.min(needed, adpCyto * 0.8);
      conc['atp_cyto'] = atpCyto + available;
      conc['adp_cyto'] = Math.max(0.2, adpCyto - available);
      // Cost: consume some glucose
      conc['glucose_blood'] = Math.max(4.0, (conc['glucose_blood'] || 5.0) - needed * 0.1);
    }

    // Ensure adenine pool is maintained
    const totalAdenine = (conc['atp_cyto'] || 0) + (conc['adp_cyto'] || 0);
    if (totalAdenine < 5.0) {
      conc['atp_cyto'] = (conc['atp_cyto'] || 0) + (5.5 - totalAdenine) * 0.8;
      conc['adp_cyto'] = (conc['adp_cyto'] || 0) + (5.5 - totalAdenine) * 0.2;
    }

    // Cap ATP at max
    if ((conc['atp_cyto'] || 0) > atpMax) {
      const excess = conc['atp_cyto'] - atpMax;
      conc['atp_cyto'] = atpMax;
      conc['adp_cyto'] = (conc['adp_cyto'] || 0.5) + excess;
    }

    // 3. OXYGEN SUPPLY (Continuous from breathing)
    // O2 should never deplete - it's constantly replenished by breathing
    const o2Target = 0.13; // mM (arterial O2 concentration)
    if (!conc['o2']) conc['o2'] = o2Target;
    else {
      // Restore O2 toward target (breathing replenishes)
      const breathingRate = 0.5; // mM/min restoration rate
      conc['o2'] = conc['o2'] + (o2Target - conc['o2']) * breathingRate * dt;
    }

    // 4. NAD+/NADH BALANCE (Prevent complete depletion)
    const nadPlus = conc['nad_plus_mito'] || 0;
    const nadh = conc['nadh_mito'] || 0;
    const totalNAD = nadPlus + nadh;

    if (totalNAD < 1.0) {
      // NAD salvage pathway maintains minimum pool
      conc['nad_plus_mito'] = Math.max(0.5, nadPlus);
      conc['nadh_mito'] = Math.max(0.3, nadh);
    }

    // 5. AMINO ACID REPLENISHMENT (From protein stores)
    const met = conc['met'] || 0;
    if (met < 0.01 && newStores.amino_acid_pool > 0) {
      const releaseRate = 0.001; // g/min
      const releaseAmount = Math.min(releaseRate * dt, newStores.amino_acid_pool);
      newStores.amino_acid_pool -= releaseAmount;

      conc['met'] = (conc['met'] || 0) + releaseAmount * 0.1;
    }

    // 6. INSULIN DECAY (Returns to baseline)
    const insulin = conc['insulin'] || 0;
    const insulinBaseline = 0.5; // mM baseline
    const decayRate = 0.05; // Half-life ~15 min
    conc['insulin'] = insulinBaseline + (insulin - insulinBaseline) * Math.exp(-decayRate * dt);

    // 7. CORTISOL BOUNDS (Prevent unrealistic values)
    if (conc['cortisol']) {
      conc['cortisol'] = Math.max(0.05, Math.min(1.5, conc['cortisol']));
    }

    // 8. ROS CLEARANCE (Antioxidant systems)
    const ros = conc['ros'] || 0;
    if (ros > 0.001) {
      const clearanceRate = 0.01; // mM/min (glutathione, SOD, catalase)
      conc['ros'] = Math.max(0, ros - clearanceRate * dt);
    }

    // 9. ACETYL-COA HOMEOSTASIS (Krebs cycle fuel)
    const acetylCoa = conc['acetyl_coa'] || 0;
    if (acetylCoa < 0.05) {
      // Emergency: mobilize fatty acids for beta-oxidation
      const mobilizationRate = 0.01; // mM/min
      conc['acetyl_coa'] = acetylCoa + mobilizationRate * dt;
      // Cost: small fat store reduction
      newStores.adipose_triglycerides = Math.max(0, newStores.adipose_triglycerides - 0.5 * dt);
    }

    // 10. PRPP REGENERATION (for NAD salvage)
    const prpp = conc['prpp'] || 0;
    if (prpp < 0.05) {
      // Pentose phosphate pathway maintains PRPP
      conc['prpp'] = prpp + 0.02 * dt;
    }

    // 11. CoA POOL MAINTENANCE
    const coa = conc['coa'] || 0;
    if (coa < 0.2) {
      // Pantothenate pathway maintains CoA pool
      conc['coa'] = coa + 0.02 * dt;
    }

    // 12. PREVENT EXTREME METABOLITE ACCUMULATION
    // Cap metabolites that could accumulate unrealistically
    if ((conc['citrate'] || 0) > 2.0) conc['citrate'] = 2.0;
    if ((conc['succinate'] || 0) > 2.0) conc['succinate'] = 2.0;
    if ((conc['malate'] || 0) > 2.0) conc['malate'] = 2.0;
    if ((conc['pyruvate'] || 0) > 1.0) conc['pyruvate'] = 1.0;

    return {
      state: { ...state, concentrations: conc },
      stores: newStores
    };
  }

  /**
   * Processes meal absorption over time (not instant spike)
   */
  static processMealAbsorption(
    mealQueue: MealInProgress[],
    currentTimeMinutes: number,
    state: SimulationState,
    stores: MetabolicStores
  ): { state: SimulationState, stores: MetabolicStores, mealQueue: MealInProgress[] } {

    const conc = { ...state.concentrations };
    const newStores = { ...stores };
    const remainingMeals: MealInProgress[] = [];

    mealQueue.forEach(meal => {
      // Handle midnight wrap-around
      let elapsedMinutes = currentTimeMinutes - meal.startTime;
      if (elapsedMinutes < 0) elapsedMinutes += 1440; // Add 24 hours if we crossed midnight

      if (elapsedMinutes >= 0 && elapsedMinutes < meal.absorptionDuration) {
        // Still absorbing
        const absorptionRate = 1.0 / meal.absorptionDuration; // Fraction per minute

        // Glucose absorption (per minute)
        // 1g glucose in 5L blood ≈ 1 mM increase (approx)
        // But we absorb gradually, so use fraction
        const glucoseRate = meal.glucoseRemaining * absorptionRate;
        conc['glucose_blood'] = (conc['glucose_blood'] || 5.0) + glucoseRate * 0.05; // ~1mM per 20g
        meal.glucoseRemaining -= glucoseRate;

        // INSULIN RESPONSE: Sustained insulin release proportional to glucose absorption
        // This keeps insulin elevated throughout the meal absorption window
        // Real beta cells secrete insulin in response to rising glucose
        const insulinResponse = glucoseRate * 0.15; // mM insulin per g glucose absorbed
        conc['insulin'] = Math.max(conc['insulin'] || 0.5, 5.0) + insulinResponse;

        // Fat absorption → adipose or fatty acids
        const fatRate = meal.fatRemaining * absorptionRate;
        conc['fatty_acids_blood'] = (conc['fatty_acids_blood'] || 0.5) + fatRate * 0.02;
        meal.fatRemaining -= fatRate;

        // Protein → amino acid pool and methionine
        const proteinRate = meal.proteinRemaining * absorptionRate;
        newStores.amino_acid_pool += proteinRate;
        conc['met'] = (conc['met'] || 0.03) + proteinRate * 0.002; // Small met boost from protein
        meal.proteinRemaining -= proteinRate;

        remainingMeals.push(meal);
      }
      // If elapsed >= duration, meal is fully absorbed, don't add back to queue
    });

    return {
      state: { ...state, concentrations: conc },
      stores: newStores,
      mealQueue: remainingMeals
    };
  }

  /**
   * Initialize default stores for a healthy adult
   */
  static getDefaultStores(): MetabolicStores {
    return {
      glycogen_liver: 80,           // g (70-100g normal)
      glycogen_muscle: 300,          // g (300-400g normal)
      adipose_triglycerides: 16000,  // g (16 kg for 20% body fat, 80kg person)
      amino_acid_pool: 70            // g (free amino acids)
    };
  }
}

export interface MealInProgress {
  startTime: number;           // Minutes from midnight
  absorptionDuration: number;  // Minutes (60-120 typical)
  glucoseRemaining: number;    // g
  proteinRemaining: number;    // g
  fatRemaining: number;        // g
}
