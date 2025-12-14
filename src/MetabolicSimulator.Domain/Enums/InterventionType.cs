namespace MetabolicSimulator.Domain.Enums;

/// <summary>
/// Types of supplement interventions that affect metabolic pathways.
/// </summary>
public enum InterventionType
{
    /// <summary>
    /// Increases substrate concentration (e.g., methylfolate increases 5-MTHF).
    /// </summary>
    SubstrateIncrease,
    
    /// <summary>
    /// Increases cofactor availability (e.g., riboflavin increases FAD).
    /// </summary>
    CofactorIncrease,
    
    /// <summary>
    /// Activates enzyme activity (e.g., SAM activates CBS).
    /// </summary>
    EnzymeActivation,
    
    /// <summary>
    /// Inhibits enzyme activity (e.g., SAM inhibits MTHFR).
    /// </summary>
    EnzymeInhibition,
    
    /// <summary>
    /// Directly adds metabolite to the system (e.g., alpha-ketoglutarate).
    /// </summary>
    DirectMetaboliteAddition
}
