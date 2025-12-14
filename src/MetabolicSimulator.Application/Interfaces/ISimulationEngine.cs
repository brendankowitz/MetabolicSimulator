using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Application.Interfaces;

/// <summary>
/// Interface for the metabolic pathway simulation engine.
/// </summary>
public interface ISimulationEngine
{
    /// <summary>
    /// Runs a complete simulation and returns the result.
    /// </summary>
    /// <param name="pathway">The pathway model to simulate.</param>
    /// <param name="parameters">Simulation parameters.</param>
    /// <param name="supplements">Optional supplement interventions to apply.</param>
    /// <returns>Complete simulation result with all time points.</returns>
    SimulationResult Run(
        Pathway pathway,
        SimulationParameters parameters,
        List<SupplementIntervention>? supplements = null);

    /// <summary>
    /// Runs a simulation and streams time points as they are computed.
    /// </summary>
    /// <param name="pathway">The pathway model to simulate.</param>
    /// <param name="parameters">Simulation parameters.</param>
    /// <param name="supplements">Optional supplement interventions to apply.</param>
    /// <returns>Async enumerable of time points.</returns>
    IAsyncEnumerable<TimePoint> RunStreaming(
        Pathway pathway,
        SimulationParameters parameters,
        List<SupplementIntervention>? supplements = null);
}
