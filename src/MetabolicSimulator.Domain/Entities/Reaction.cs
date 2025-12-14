using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a substrate or product in a reaction with its stoichiometric coefficient.
/// </summary>
/// <param name="Metabolite">The metabolite involved.</param>
/// <param name="Coefficient">Stoichiometric coefficient (positive for products, absolute value for substrates).</param>
public record ReactionParticipant(Metabolite Metabolite, int Coefficient);

/// <summary>
/// Represents a metabolic reaction catalyzed by an enzyme.
/// </summary>
/// <param name="Id">Unique identifier for the reaction.</param>
/// <param name="Name">Human-readable name of the reaction.</param>
/// <param name="Enzyme">The enzyme catalyzing this reaction.</param>
/// <param name="Substrates">List of substrates with stoichiometric coefficients.</param>
/// <param name="Products">List of products with stoichiometric coefficients.</param>
/// <param name="Kinetics">Type of kinetics used for this reaction.</param>
/// <param name="Inhibitors">Optional list of inhibitor metabolite IDs.</param>
/// <param name="Activators">Optional list of activator metabolite IDs.</param>
/// <param name="Ki">Inhibition constant (mM), if applicable.</param>
/// <param name="Ka">Activation constant (mM), if applicable.</param>
/// <param name="HillCoefficient">Hill coefficient for allosteric regulation (default 1).</param>
public record Reaction(
    string Id,
    string Name,
    Enzyme Enzyme,
    List<ReactionParticipant> Substrates,
    List<ReactionParticipant> Products,
    KineticsType Kinetics,
    List<string>? Inhibitors = null,
    List<string>? Activators = null,
    double Ki = 0,
    double Ka = 0,
    double HillCoefficient = 1.0);
