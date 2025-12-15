namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents an enzyme that catalyzes a metabolic reaction.
/// </summary>
/// <param name="Id">Unique identifier for the enzyme.</param>
/// <param name="Name">Human-readable name of the enzyme.</param>
/// <param name="EcNumber">Enzyme Commission number (e.g., "2.3.3.1").</param>
/// <param name="Vmax">Maximum reaction velocity (mM/s).</param>
/// <param name="Km">Michaelis constant - substrate concentration at half Vmax (mM).</param>
/// <param name="Cofactors">List of required cofactors (e.g., "NAD+", "FAD").</param>
/// <param name="GeneticModifiers">List of known genetic variants affecting this enzyme.</param>
public record Enzyme(
    string Id,
    string Name,
    string EcNumber,
    double Vmax,
    double Km,
    List<string> Cofactors,
    List<GeneticModifier> GeneticModifiers);
