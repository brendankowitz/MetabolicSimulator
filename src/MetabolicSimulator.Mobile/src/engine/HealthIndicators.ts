// HealthIndicators.ts - Calculate user-friendly health metrics from metabolite data

export interface HealthMetrics {
  energy: { level: number; label: string; color: string };
  mood: { level: number; label: string; color: string };
  libido: { level: number; label: string; color: string };
  focus: { level: number; label: string; color: string };
  stress: { level: number; label: string; color: string };
  recovery: { level: number; label: string; color: string };
  inflammation: { level: number; label: string; color: string };
  sleepQuality: { level: number; label: string; color: string };
  hunger: { level: number; label: string; color: string };
  alertness: { level: number; label: string; color: string };
}

export class HealthIndicators {

  /**
   * Calculate subjective energy level from metabolic state
   */
  static calculateEnergy(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const atp = concentrations['atp_cyto'] || 0;
    const glucose = concentrations['glucose_blood'] || 0;
    const nadPlus = concentrations['nad_plus_mito'] || 0;
    const cortisol = concentrations['cortisol'] || 0;
    const amp = concentrations['amp'] || 0;

    // Energy score (0-100)
    let score = 0;

    // ATP is primary energy currency (0-40 points)
    score += Math.min(40, (atp / 5.0) * 40);

    // Glucose availability (0-25 points)
    score += Math.min(25, ((glucose - 3.5) / 2.5) * 25);

    // NAD+ for cellular energy (0-20 points)
    score += Math.min(20, (nadPlus / 1.0) * 20);

    // Cortisol boost (0-10 points, but too much is bad)
    if (cortisol > 0.2 && cortisol < 0.8) {
      score += 10;
    } else if (cortisol > 0.8) {
      score += 5; // Stressed, less efficient energy
    }

    // High AMP indicates energy stress (penalty)
    score -= Math.min(20, amp * 4);

    score = Math.max(0, Math.min(100, score));

    let label = 'Exhausted';
    let color = '#e74c3c';

    if (score > 75) {
      label = 'Energized';
      color = '#2ecc71';
    } else if (score > 50) {
      label = 'Good';
      color = '#3498db';
    } else if (score > 25) {
      label = 'Tired';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate mood from neurotransmitter precursors and stress markers
   */
  static calculateMood(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const sam = concentrations['sam'] || 0; // Methylation for neurotransmitters
    const methylThf = concentrations['methyl_thf'] || 0; // Folate status
    const cortisol = concentrations['cortisol'] || 0;
    const ros = concentrations['ros'] || 0; // Oxidative stress
    const glucose = concentrations['glucose_blood'] || 0;

    let score = 0;

    // SAM availability (0-35 points) - critical for dopamine/serotonin
    score += Math.min(35, (sam / 0.1) * 35);

    // Methylfolate (0-25 points) - needed for neurotransmitter synthesis
    score += Math.min(25, (methylThf / 0.03) * 25);

    // Stable glucose (0-20 points) - brain fuel
    if (glucose > 4.0 && glucose < 6.5) {
      score += 20;
    } else if (glucose > 3.5 && glucose < 7.5) {
      score += 10;
    }

    // Low stress (0-15 points)
    if (cortisol < 0.5) {
      score += 15;
    } else if (cortisol < 1.0) {
      score += 7;
    }

    // Low oxidative stress (0-5 points)
    score += Math.max(0, 5 - ros * 500);

    score = Math.max(0, Math.min(100, score));

    let label = 'Low';
    let color = '#e74c3c';

    if (score > 75) {
      label = 'Excellent';
      color = '#2ecc71';
    } else if (score > 60) {
      label = 'Good';
      color = '#3498db';
    } else if (score > 40) {
      label = 'Fair';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate libido from hormonal precursors and energy status
   */
  static calculateLibido(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const atp = concentrations['atp_cyto'] || 0;
    const sam = concentrations['sam'] || 0; // Methylation for hormone synthesis
    const fattyAcids = concentrations['fatty_acids_blood'] || 0; // Cholesterol precursor
    const cortisol = concentrations['cortisol'] || 0;
    const ros = concentrations['ros'] || 0;

    let score = 0;

    // Adequate energy (0-30 points)
    score += Math.min(30, (atp / 5.0) * 30);

    // SAM for hormone synthesis (0-30 points)
    score += Math.min(30, (sam / 0.1) * 30);

    // Fatty acids for steroid hormone production (0-20 points)
    score += Math.min(20, (fattyAcids / 0.5) * 20);

    // Low stress (0-15 points) - cortisol suppresses sex hormones
    if (cortisol < 0.4) {
      score += 15;
    } else if (cortisol < 0.8) {
      score += 7;
    } else {
      score -= 10; // High cortisol suppresses libido
    }

    // Low inflammation (0-5 points)
    score += Math.max(0, 5 - ros * 500);

    score = Math.max(0, Math.min(100, score));

    let label = 'Low';
    let color = '#95a5a6';

    if (score > 70) {
      label = 'High';
      color = '#e91e63';
    } else if (score > 50) {
      label = 'Moderate';
      color = '#3498db';
    } else if (score > 30) {
      label = 'Fair';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate focus/mental clarity from brain fuel and neurotransmitter precursors
   */
  static calculateFocus(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const glucose = concentrations['glucose_blood'] || 0;
    const nadPlus = concentrations['nad_plus_mito'] || 0;
    const sam = concentrations['sam'] || 0;
    const methylThf = concentrations['methyl_thf'] || 0;
    const ros = concentrations['ros'] || 0;
    const atp = concentrations['atp_cyto'] || 0;

    let score = 0;

    // Stable glucose (0-30 points) - brain's primary fuel
    if (glucose >= 4.5 && glucose <= 5.5) {
      score += 30;
    } else if (glucose >= 4.0 && glucose <= 6.0) {
      score += 20;
    } else if (glucose >= 3.5 && glucose <= 7.0) {
      score += 10;
    }

    // NAD+ for neuronal energy (0-25 points)
    score += Math.min(25, (nadPlus / 1.0) * 25);

    // SAM for neurotransmitters (0-20 points)
    score += Math.min(20, (sam / 0.1) * 20);

    // Methylfolate (0-15 points)
    score += Math.min(15, (methylThf / 0.03) * 15);

    // ATP (0-10 points)
    score += Math.min(10, (atp / 5.0) * 10);

    // Low oxidative stress (penalty)
    score -= Math.min(20, ros * 2000);

    score = Math.max(0, Math.min(100, score));

    let label = 'Foggy';
    let color = '#e74c3c';

    if (score > 75) {
      label = 'Sharp';
      color = '#2ecc71';
    } else if (score > 55) {
      label = 'Clear';
      color = '#3498db';
    } else if (score > 35) {
      label = 'Distracted';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate stress level from cortisol and other stress markers
   */
  static calculateStress(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const cortisol = concentrations['cortisol'] || 0;
    const ros = concentrations['ros'] || 0;
    const amp = concentrations['amp'] || 0;
    const glucose = concentrations['glucose_blood'] || 0;

    let score = 0; // Higher score = more stressed

    // Cortisol (0-50 points)
    if (cortisol > 1.0) {
      score += 50;
    } else if (cortisol > 0.7) {
      score += 35;
    } else if (cortisol > 0.5) {
      score += 20;
    } else if (cortisol > 0.3) {
      score += 10;
    }

    // Oxidative stress (0-25 points)
    score += Math.min(25, ros * 2500);

    // Energy stress - high AMP (0-15 points)
    score += Math.min(15, amp * 3);

    // Glucose dysregulation (0-10 points)
    if (glucose < 3.5 || glucose > 7.5) {
      score += 10;
    } else if (glucose < 4.0 || glucose > 6.5) {
      score += 5;
    }

    score = Math.max(0, Math.min(100, score));

    let label = 'Calm';
    let color = '#2ecc71';

    if (score > 60) {
      label = 'High';
      color = '#e74c3c';
    } else if (score > 40) {
      label = 'Moderate';
      color = '#f39c12';
    } else if (score > 20) {
      label = 'Mild';
      color = '#3498db';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate recovery status from ATP restoration and repair markers
   */
  static calculateRecovery(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const atp = concentrations['atp_cyto'] || 0;
    const nadPlus = concentrations['nad_plus_mito'] || 0;
    const ros = concentrations['ros'] || 0;
    const amp = concentrations['amp'] || 0;
    const cortisol = concentrations['cortisol'] || 0;

    let score = 0;

    // ATP restored (0-35 points)
    score += Math.min(35, (atp / 5.0) * 35);

    // NAD+ for cellular repair (0-30 points)
    score += Math.min(30, (nadPlus / 1.0) * 30);

    // Low inflammation (0-20 points)
    score += Math.max(0, 20 - ros * 2000);

    // Low energy stress (0-10 points)
    score += Math.max(0, 10 - amp * 2);

    // Low cortisol allows recovery (0-5 points)
    if (cortisol < 0.4) {
      score += 5;
    }

    score = Math.max(0, Math.min(100, score));

    let label = 'Poor';
    let color = '#e74c3c';

    if (score > 75) {
      label = 'Excellent';
      color = '#2ecc71';
    } else if (score > 55) {
      label = 'Good';
      color = '#3498db';
    } else if (score > 35) {
      label = 'Fair';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate inflammation level
   */
  static calculateInflammation(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const ros = concentrations['ros'] || 0;
    const cortisol = concentrations['cortisol'] || 0;
    const gsh = concentrations['gsh_cyto'] || 0;

    let score = 0; // Higher = more inflammation

    // ROS (0-60 points)
    score += Math.min(60, ros * 6000);

    // Chronic cortisol elevation (0-25 points)
    if (cortisol > 0.8) {
      score += 25;
    } else if (cortisol > 0.6) {
      score += 15;
    } else if (cortisol > 0.4) {
      score += 5;
    }

    // Low glutathione (antioxidant depletion) (0-15 points)
    if (gsh < 2.0) {
      score += 15;
    } else if (gsh < 3.0) {
      score += 7;
    }

    score = Math.max(0, Math.min(100, score));

    let label = 'Low';
    let color = '#2ecc71';

    if (score > 60) {
      label = 'High';
      color = '#e74c3c';
    } else if (score > 40) {
      label = 'Elevated';
      color = '#f39c12';
    } else if (score > 20) {
      label = 'Moderate';
      color = '#3498db';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate sleep quality - ONLY relevant during sleep hours
   * Pass isAsleep=true when the simulation is in sleep period
   */
  static calculateSleepQuality(concentrations: Record<string, number>, isAsleep: boolean = false): { level: number; label: string; color: string } {
    // During daytime, sleep quality is not applicable
    if (!isAsleep) {
      return { level: 0, label: 'Awake', color: '#95a5a6' };
    }

    const cortisol = concentrations['cortisol'] || 0;
    const nadPlus = concentrations['nad_plus_mito'] || 0;
    const atp = concentrations['atp_cyto'] || 0;
    const ros = concentrations['ros'] || 0;
    const melatonin = concentrations['melatonin'] || 0;

    let score = 0;

    // Low cortisol (0-30 points) - essential for sleep
    if (cortisol < 0.15) {
      score += 30;
    } else if (cortisol < 0.25) {
      score += 20;
    } else if (cortisol < 0.35) {
      score += 10;
    }

    // Melatonin presence (0-25 points) - sleep hormone
    if (melatonin > 0.3) {
      score += 25;
    } else if (melatonin > 0.1) {
      score += 15;
    }

    // NAD+ for cellular repair during sleep (0-25 points)
    score += Math.min(25, (nadPlus / 1.0) * 25);

    // Moderate ATP - not too high (wired) or too low (exhausted) (0-15 points)
    if (atp >= 4.0 && atp <= 5.5) {
      score += 15;
    } else if (atp >= 3.0 && atp <= 6.0) {
      score += 8;
    }

    // Low oxidative stress (0-5 points)
    score += Math.max(0, 5 - ros * 500);

    score = Math.max(0, Math.min(100, score));

    let label = 'Poor';
    let color = '#e74c3c';

    if (score > 70) {
      label = 'Restorative';
      color = '#2ecc71';
    } else if (score > 50) {
      label = 'Good';
      color = '#3498db';
    } else if (score > 30) {
      label = 'Fair';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate hunger/satiety level
   */
  static calculateHunger(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const glucose = concentrations['glucose_blood'] || 0;
    const insulin = concentrations['insulin'] || 0;
    const fattyAcids = concentrations['fatty_acids_blood'] || 0;

    let score = 0; // Higher = more hungry

    // Low glucose increases hunger (0-50 points)
    if (glucose < 3.5) {
      score += 50;
    } else if (glucose < 4.0) {
      score += 35;
    } else if (glucose < 4.5) {
      score += 20;
    } else if (glucose < 5.0) {
      score += 10;
    }

    // Low insulin = fasted state = hungry (0-25 points)
    if (insulin < 1.0) {
      score += 25;
    } else if (insulin < 3.0) {
      score += 15;
    }

    // High fatty acids = lipolysis = fasted (0-15 points)
    if (fattyAcids > 0.8) {
      score += 15;
    } else if (fattyAcids > 0.5) {
      score += 7;
    }

    // High insulin = fed state = satiated (penalty)
    if (insulin > 8.0) {
      score -= 30;
    } else if (insulin > 5.0) {
      score -= 15;
    }

    score = Math.max(0, Math.min(100, score));

    let label = 'Full';
    let color = '#95a5a6';

    if (score > 70) {
      label = 'Starving';
      color = '#e74c3c';
    } else if (score > 50) {
      label = 'Hungry';
      color = '#f39c12';
    } else if (score > 25) {
      label = 'Satisfied';
      color = '#3498db';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate alertness/wakefulness
   * Models the "3pm slump" via:
   * 1. Cortisol circadian dip (lowest 2-4pm)
   * 2. Post-meal insulin spike -> tryptophan -> serotonin -> drowsiness
   * 
   * Cortisol range in our sim: 0.12-0.45 mM (base 0.3 * modifiers 0.4-1.5)
   */
  static calculateAlertness(concentrations: Record<string, number>): { level: number; label: string; color: string } {
    const cortisol = concentrations['cortisol'] || 0;
    const glucose = concentrations['glucose_blood'] || 0;
    const atp = concentrations['atp_cyto'] || 0;
    const insulin = concentrations['insulin'] || 0;

    let score = 0;

    // Cortisol provides wakefulness (0-40 points)
    // Thresholds adjusted for our actual cortisol range (0.12-0.45 mM)
    if (cortisol > 0.40) {
      score += 40;  // Morning peak - highly alert
    } else if (cortisol > 0.32) {
      score += 32;  // High morning - alert
    } else if (cortisol > 0.25) {
      score += 22;  // Mid-day - good
    } else if (cortisol > 0.18) {
      score += 12;  // Afternoon dip - sluggish
    } else {
      score += 5;   // Night/deep dip - drowsy
    }

    // Glucose availability (0-30 points)
    score += Math.min(30, ((glucose - 3.5) / 3.0) * 30);

    // ATP (0-30 points)
    score += Math.min(30, (atp / 5.0) * 30);

    // POST-MEAL DROWSINESS: High insulin causes "food coma"
    // Insulin promotes tryptophan transport -> serotonin -> sleepiness
    if (insulin > 8.0) {
      score -= 25; // Strong drowsiness after big meal
    } else if (insulin > 5.0) {
      score -= 15; // Moderate drowsiness
    } else if (insulin > 3.0) {
      score -= 8;  // Mild post-snack dip
    }

    score = Math.max(0, Math.min(100, score));

    let label = 'Drowsy';
    let color = '#95a5a6';

    if (score > 75) {
      label = 'Wired';
      color = '#e74c3c';
    } else if (score > 55) {
      label = 'Alert';
      color = '#2ecc71';
    } else if (score > 35) {
      label = 'Sluggish';
      color = '#f39c12';
    }

    return { level: Math.round(score), label, color };
  }

  /**
   * Calculate all health metrics at once
   * @param isAsleep - Pass true when simulation is in sleep period
   */
  static calculateAll(concentrations: Record<string, number>, isAsleep: boolean = false): HealthMetrics {
    return {
      energy: this.calculateEnergy(concentrations),
      mood: this.calculateMood(concentrations),
      libido: this.calculateLibido(concentrations),
      focus: this.calculateFocus(concentrations),
      stress: this.calculateStress(concentrations),
      recovery: this.calculateRecovery(concentrations),
      inflammation: this.calculateInflammation(concentrations),
      sleepQuality: this.calculateSleepQuality(concentrations, isAsleep),
      hunger: this.calculateHunger(concentrations),
      alertness: this.calculateAlertness(concentrations)
    };
  }
}
