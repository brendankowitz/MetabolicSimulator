using MetabolicSimulator.Application.Interfaces;
using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Infrastructure.Simulation;

/// <summary>
/// Main simulation engine that orchestrates metabolic pathway simulation.
/// </summary>
public class SimulationEngine : ISimulationEngine
{
    private readonly KineticsCalculator _kineticsCalculator;
    private readonly RungeKuttaSolver _solver;

    public SimulationEngine()
    {
        _kineticsCalculator = new KineticsCalculator();
        _solver = new RungeKuttaSolver();
    }

    /// <summary>
    /// Runs a complete simulation.
    /// </summary>
    public SimulationResult Run(
        Pathway pathway,
        SimulationParameters parameters,
        List<SupplementIntervention>? supplements = null)
    {
        var result = new SimulationResult(pathway, parameters, supplements);
        
        // Build metabolite index for fast lookup
        var metaboliteIds = pathway.Metabolites.Select(m => m.Id).ToList();
        var metaboliteIndex = metaboliteIds
            .Select((id, index) => (id, index))
            .ToDictionary(x => x.id, x => x.index);

        // Initialize concentrations
        double[] y0 = pathway.Metabolites
            .Select(m => GetInitialConcentration(m, supplements))
            .ToArray();

        // Compute enzyme modifiers from genetic profile
        var enzymeModifiers = ComputeEnzymeModifiers(pathway, parameters.GeneticProfile, supplements);

        // Create derivative function
        Func<double[], double, double[]> derivatives = (y, t) =>
            ComputeDerivatives(y, pathway, metaboliteIndex, enzymeModifiers);

        // Run integration
        var integrationResults = _solver.Integrate(
            y0,
            0,
            parameters.Duration,
            parameters.TimeStep,
            derivatives,
            parameters.OutputInterval);

        // Convert to simulation results
        foreach (var (time, state) in integrationResults)
        {
            var concentrations = new Dictionary<string, double>();
            for (int i = 0; i < metaboliteIds.Count; i++)
            {
                concentrations[metaboliteIds[i]] = state[i];
            }
            result.AddTimePoint(new TimePoint(time, concentrations));
        }

        return result;
    }

    /// <summary>
    /// Runs a simulation and streams results.
    /// </summary>
    public async IAsyncEnumerable<TimePoint> RunStreaming(
        Pathway pathway,
        SimulationParameters parameters,
        List<SupplementIntervention>? supplements = null)
    {
        // Build metabolite index
        var metaboliteIds = pathway.Metabolites.Select(m => m.Id).ToList();
        var metaboliteIndex = metaboliteIds
            .Select((id, index) => (id, index))
            .ToDictionary(x => x.id, x => x.index);

        // Initialize concentrations
        double[] y = pathway.Metabolites
            .Select(m => GetInitialConcentration(m, supplements))
            .ToArray();

        // Compute enzyme modifiers
        var enzymeModifiers = ComputeEnzymeModifiers(pathway, parameters.GeneticProfile, supplements);

        // Create derivative function
        Func<double[], double, double[]> derivatives = (state, t) =>
            ComputeDerivatives(state, pathway, metaboliteIndex, enzymeModifiers);

        double t = 0;
        double lastOutput = 0;

        // Yield initial state
        yield return CreateTimePoint(t, y, metaboliteIds);

        while (t < parameters.Duration)
        {
            y = _solver.Step(y, t, parameters.TimeStep, derivatives);
            t += parameters.TimeStep;

            if (t - lastOutput >= parameters.OutputInterval || t >= parameters.Duration)
            {
                yield return CreateTimePoint(t, y, metaboliteIds);
                lastOutput = t;
                
                // Allow async cancellation
                await Task.Yield();
            }
        }
    }

    /// <summary>
    /// Computes the rate of change for all metabolites.
    /// </summary>
    private double[] ComputeDerivatives(
        double[] y,
        Pathway pathway,
        Dictionary<string, int> metaboliteIndex,
        Dictionary<string, double> enzymeModifiers)
    {
        int n = y.Length;
        double[] dydt = new double[n];

        // Build current concentrations dictionary
        var concentrations = new Dictionary<string, double>();
        foreach (var kvp in metaboliteIndex)
        {
            concentrations[kvp.Key] = y[kvp.Value];
        }

        // Process each reaction
        foreach (var reaction in pathway.Reactions)
        {
            double modifier = enzymeModifiers.TryGetValue(reaction.Enzyme.Id, out var m) ? m : 1.0;
            double rate = _kineticsCalculator.CalculateRate(reaction, concentrations, modifier);

            // Substrates are consumed
            foreach (var substrate in reaction.Substrates)
            {
                if (metaboliteIndex.TryGetValue(substrate.Metabolite.Id, out var idx))
                {
                    dydt[idx] -= rate * substrate.Coefficient;
                }
            }

            // Products are generated
            foreach (var product in reaction.Products)
            {
                if (metaboliteIndex.TryGetValue(product.Metabolite.Id, out var idx))
                {
                    dydt[idx] += rate * product.Coefficient;
                }
            }
        }

        return dydt;
    }

    /// <summary>
    /// Computes enzyme activity modifiers from genetic profile and supplements.
    /// </summary>
    private Dictionary<string, double> ComputeEnzymeModifiers(
        Pathway pathway,
        GeneticProfile? geneticProfile,
        List<SupplementIntervention>? supplements)
    {
        var modifiers = new Dictionary<string, double>();

        foreach (var reaction in pathway.Reactions)
        {
            double modifier = 1.0;

            // Apply genetic effects
            if (geneticProfile != null)
            {
                modifier *= geneticProfile.GetEnzymeEffectMultiplier(reaction.Enzyme);
            }

            // Apply supplement effects
            if (supplements != null)
            {
                foreach (var supplement in supplements.Where(s => 
                    s.TargetId == reaction.Enzyme.Id &&
                    (s.Type == InterventionType.EnzymeActivation || s.Type == InterventionType.EnzymeInhibition)))
                {
                    if (supplement.Type == InterventionType.EnzymeActivation)
                        modifier *= supplement.EffectMagnitude;
                    else
                        modifier /= supplement.EffectMagnitude;
                }
            }

            modifiers[reaction.Enzyme.Id] = modifier;
        }

        return modifiers;
    }

    /// <summary>
    /// Gets initial concentration for a metabolite, considering supplements.
    /// </summary>
    private double GetInitialConcentration(Metabolite metabolite, List<SupplementIntervention>? supplements)
    {
        double concentration = metabolite.InitialConcentration;

        if (supplements != null)
        {
            foreach (var supplement in supplements.Where(s =>
                s.TargetId == metabolite.Id &&
                (s.Type == InterventionType.SubstrateIncrease || s.Type == InterventionType.DirectMetaboliteAddition)))
            {
                concentration += supplement.EffectMagnitude;
            }
        }

        return concentration;
    }

    /// <summary>
    /// Creates a time point from state vector.
    /// </summary>
    private TimePoint CreateTimePoint(double time, double[] state, List<string> metaboliteIds)
    {
        var concentrations = new Dictionary<string, double>();
        for (int i = 0; i < metaboliteIds.Count; i++)
        {
            concentrations[metaboliteIds[i]] = state[i];
        }
        return new TimePoint(time, concentrations);
    }
}
