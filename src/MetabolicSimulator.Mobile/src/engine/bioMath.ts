// bioMath.ts - Core biochemical kinetics

export class BioMath {
  /**
   * Calculates reaction rate using Michaelis-Menten kinetics: V = (Vmax * [S]) / (Km + [S])
   */
  static michaelisMenten(vmax: number, km: number, substrateConc: number): number {
    if (substrateConc <= 0) return 0;
    return (vmax * substrateConc) / (km + substrateConc);
  }

  /**
   * Handles competitive inhibition: V = Vmax * [S] / (Km * (1 + [I]/Ki) + [S])
   */
  static competitiveInhibition(vmax: number, km: number, s: number, i: number, ki: number): number {
    if (s <= 0) return 0;
    const kmApp = km * (1.0 + (i / ki));
    return (vmax * s) / (kmApp + s);
  }

  /**
   * Handles allosteric activation (Simplified Hill-like): V = Vmax * [S] / (Km + [S]) * (1 + [A]/Ka)
   */
  static activation(baseRate: number, activatorConc: number, ka: number): number {
    // Simple multiplier logic for activation
    // If activator >> Ka, rate increases.
    // For Michaelis-Menten, often modeled as Vmax_app = Vmax * (1 + A/Ka)
    return baseRate * (1.0 + (activatorConc / ka));
  }
}
