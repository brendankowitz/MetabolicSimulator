using MetabolicSimulator.Domain.Core;
using MetabolicSimulator.Domain.Interfaces;

namespace MetabolicSimulator.Infrastructure.Solvers;

public class RungeKuttaSolver : IOdeSolver
{
    public SimulationState Step(SimulationState currentState, double dt, IEnumerable<IMetabolicSystem> systems)
    {
        // k1
        var k1 = CalculateDerivatives(currentState, systems);

        // k2
        var stateK2 = ApplyStep(currentState, k1, dt * 0.5);
        stateK2.Time += dt * 0.5;
        var k2 = CalculateDerivatives(stateK2, systems);

        // k3
        var stateK3 = ApplyStep(currentState, k2, dt * 0.5);
        stateK3.Time += dt * 0.5;
        var k3 = CalculateDerivatives(stateK3, systems);

        // k4
        var stateK4 = ApplyStep(currentState, k3, dt);
        stateK4.Time += dt;
        var k4 = CalculateDerivatives(stateK4, systems);

        // Combine: y_new = y + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
        var newState = currentState.Clone();
        newState.Time += dt;

        foreach (var metaboliteId in k1.Keys)
        {
            var delta = (dt / 6.0) * (
                k1[metaboliteId] + 
                2 * k2.GetValueOrDefault(metaboliteId) + 
                2 * k3.GetValueOrDefault(metaboliteId) + 
                k4.GetValueOrDefault(metaboliteId)
            );

            // Ensure concentration doesn't drop below zero (numerical artifact protection)
            // In a pure math sense, it shouldn't if kinetics are correct, but safe guard is good.
            if (!newState.Metabolites.ContainsKey(metaboliteId))
                newState.Metabolites[metaboliteId] = 0;

            newState.Metabolites[metaboliteId] = Math.Max(0, newState.Metabolites[metaboliteId] + delta);
        }

        // Fluxes are technically instantaneous rates. We can just use the fluxes from k1 (start of step) or average them.
        // For visualization, instantaneous at T is usually fine.
        // Or we can recalculate fluxes at the new state. 
        // Let's perform a final derivative calc at the NEW state to get accurate fluxes for display.
        // This adds overhead but ensures displayed flux matches displayed concentration.
        var finalDerivatives = new Dictionary<string, double>();
        foreach (var system in systems)
        {
            system.ComputeDerivatives(newState, finalDerivatives, newState.Fluxes);
        }

        return newState;
    }

    private Dictionary<string, double> CalculateDerivatives(SimulationState state, IEnumerable<IMetabolicSystem> systems)
    {
        var derivatives = new Dictionary<string, double>();
        var dummyFluxes = new Dictionary<string, double>(); // We don't need fluxes for intermediate RK steps

        foreach (var system in systems)
        {
            system.ComputeDerivatives(state, derivatives, dummyFluxes);
        }

        return derivatives;
    }

    private SimulationState ApplyStep(SimulationState original, Dictionary<string, double> derivatives, double stepSize)
    {
        var next = original.Clone();
        foreach (var kvp in derivatives)
        {
            if (!next.Metabolites.ContainsKey(kvp.Key))
                next.Metabolites[kvp.Key] = 0;
                
            next.Metabolites[kvp.Key] = Math.Max(0, next.Metabolites[kvp.Key] + kvp.Value * stepSize);
        }
        return next;
    }
}
