namespace MetabolicSimulator.Domain.Enums;

/// <summary>
/// Types of enzyme kinetics used in simulation.
/// </summary>
public enum KineticsType
{
    /// <summary>
    /// Simple Michaelis-Menten kinetics: v = Vmax * [S] / (Km + [S])
    /// </summary>
    MichaelisMenten,
    
    /// <summary>
    /// Competitive inhibition: v = Vmax * [S] / (Km * (1 + [I]/Ki) + [S])
    /// </summary>
    CompetitiveInhibition,
    
    /// <summary>
    /// Non-competitive inhibition: v = Vmax * [S] / ((Km + [S]) * (1 + [I]/Ki))
    /// </summary>
    NonCompetitiveInhibition,
    
    /// <summary>
    /// Allosteric regulation with Hill coefficient: v = Vmax * [S]^n / (K^n + [S]^n)
    /// </summary>
    Allosteric,
    
    /// <summary>
    /// Simple mass action kinetics: v = k * [S]
    /// </summary>
    MassAction
}
