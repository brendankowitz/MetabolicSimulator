using MetabolicSimulator.Domain.Core;

namespace MetabolicSimulator.Domain.Interfaces;

public interface IMetabolicSystem
{
    string SystemName { get; }

    /// <summary>
    /// Computes the rates of change (derivatives) for all metabolites in this system.
    /// </summary>
    /// <param name="state">The current simulation state (concentrations).</param>
    /// <param name="derivatives">The dictionary to accumulate derivatives into (Key: MetaboliteId, Value: d[C]/dt).</param>
    /// <param name="fluxes">The dictionary to record reaction rates into.</param>
    void ComputeDerivatives(SimulationState state, Dictionary<string, double> derivatives, Dictionary<string, double> fluxes);
}
