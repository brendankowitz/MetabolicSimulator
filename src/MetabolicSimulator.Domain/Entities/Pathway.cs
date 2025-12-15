namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a complete metabolic pathway with all its components.
/// </summary>
/// <param name="Id">Unique identifier for the pathway.</param>
/// <param name="Name">Human-readable name (e.g., "Krebs Cycle", "Methylation Cycle").</param>
/// <param name="Description">Detailed description of the pathway's function.</param>
/// <param name="Metabolites">All metabolites participating in the pathway.</param>
/// <param name="Reactions">All reactions in the pathway.</param>
public record Pathway(
    string Id,
    string Name,
    string Description,
    List<Metabolite> Metabolites,
    List<Reaction> Reactions);
