namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a metabolite (chemical compound) in a metabolic pathway.
/// </summary>
/// <param name="Id">Unique identifier for the metabolite.</param>
/// <param name="Name">Human-readable name of the metabolite.</param>
/// <param name="InitialConcentration">Starting concentration in mM.</param>
/// <param name="Compartment">Cellular compartment (e.g., "cytosol", "mitochondria").</param>
public record Metabolite(
    string Id,
    string Name,
    double InitialConcentration,
    string Compartment = "cytosol");
