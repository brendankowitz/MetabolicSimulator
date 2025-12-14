using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Application.Interfaces;

/// <summary>
/// Interface for providing predefined metabolic pathway models.
/// </summary>
public interface IPathwayProvider
{
    /// <summary>
    /// Gets the Krebs cycle (citric acid cycle) pathway model.
    /// </summary>
    Pathway GetKrebsCycle();

    /// <summary>
    /// Gets the methylation cycle pathway model.
    /// </summary>
    Pathway GetMethylationCycle();

    /// <summary>
    /// Gets both Krebs and methylation cycles as a combined pathway.
    /// </summary>
    Pathway GetCombinedPathway();
}
