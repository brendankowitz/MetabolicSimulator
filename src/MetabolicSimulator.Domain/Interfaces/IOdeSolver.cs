using MetabolicSimulator.Domain.Core;

namespace MetabolicSimulator.Domain.Interfaces;

public interface IOdeSolver
{
    /// <summary>
    /// Advances the simulation by one time step `dt`.
    /// </summary>
    SimulationState Step(SimulationState currentState, double dt, IEnumerable<IMetabolicSystem> systems);
}
