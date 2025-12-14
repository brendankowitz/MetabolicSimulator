namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents the state of all metabolites at a specific time point.
/// </summary>
/// <param name="Time">Simulation time in seconds.</param>
/// <param name="Concentrations">Dictionary mapping metabolite IDs to their concentrations (mM).</param>
public record TimePoint(
    double Time,
    Dictionary<string, double> Concentrations);

/// <summary>
/// Represents the complete result of a simulation run.
/// </summary>
public class SimulationResult
{
    /// <summary>
    /// All time points in the simulation.
    /// </summary>
    public List<TimePoint> TimePoints { get; }
    
    /// <summary>
    /// The pathway that was simulated.
    /// </summary>
    public Pathway Pathway { get; }
    
    /// <summary>
    /// Parameters used for the simulation.
    /// </summary>
    public SimulationParameters Parameters { get; }
    
    /// <summary>
    /// Supplements applied during simulation.
    /// </summary>
    public List<SupplementIntervention> AppliedSupplements { get; }

    public SimulationResult(
        Pathway pathway,
        SimulationParameters parameters,
        List<SupplementIntervention>? appliedSupplements = null)
    {
        Pathway = pathway;
        Parameters = parameters;
        TimePoints = new List<TimePoint>();
        AppliedSupplements = appliedSupplements ?? new List<SupplementIntervention>();
    }

    /// <summary>
    /// Adds a time point to the results.
    /// </summary>
    public void AddTimePoint(TimePoint timePoint)
    {
        TimePoints.Add(timePoint);
    }

    /// <summary>
    /// Gets the concentration of a metabolite over time.
    /// </summary>
    /// <param name="metaboliteId">The metabolite ID.</param>
    /// <returns>Array of (time, concentration) tuples.</returns>
    public (double Time, double Concentration)[] GetMetaboliteTimeSeries(string metaboliteId)
    {
        return TimePoints
            .Where(tp => tp.Concentrations.ContainsKey(metaboliteId))
            .Select(tp => (tp.Time, tp.Concentrations[metaboliteId]))
            .ToArray();
    }

    /// <summary>
    /// Gets the final concentrations of all metabolites.
    /// </summary>
    public Dictionary<string, double> GetFinalConcentrations()
    {
        return TimePoints.LastOrDefault()?.Concentrations ?? new Dictionary<string, double>();
    }
}

/// <summary>
/// Parameters for running a simulation.
/// </summary>
public record SimulationParameters(
    double Duration = 60.0,          // Simulation duration in seconds
    double TimeStep = 0.01,          // Integration time step in seconds
    double OutputInterval = 1.0,     // Output recording interval in seconds
    GeneticProfile? GeneticProfile = null);
