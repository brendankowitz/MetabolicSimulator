using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a supplement intervention that modifies pathway behavior.
/// </summary>
/// <param name="Id">Unique identifier for the supplement.</param>
/// <param name="Name">Human-readable name (e.g., "Methylfolate", "NMN").</param>
/// <param name="Type">Type of intervention effect.</param>
/// <param name="TargetId">ID of the target (enzyme, metabolite, or cofactor).</param>
/// <param name="EffectMagnitude">Magnitude of effect (concentration increase, activity multiplier, etc.).</param>
/// <param name="Mechanism">Description of the biochemical mechanism.</param>
public record SupplementIntervention(
    string Id,
    string Name,
    InterventionType Type,
    string TargetId,
    double EffectMagnitude,
    string Mechanism);
