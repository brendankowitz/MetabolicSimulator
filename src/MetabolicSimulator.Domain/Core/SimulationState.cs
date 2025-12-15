namespace MetabolicSimulator.Domain.Core;

/// <summary>
/// Represents the state of the simulation at a specific point in time.
/// </summary>
public class SimulationState
{
    public double Time { get; set; }
    
    // Key: MetaboliteId, Value: Concentration (uM)
    public Dictionary<string, double> Metabolites { get; set; } = new();
    
    // Key: ReactionId, Value: Flux (uM/s)
    // This is useful for analytics/UI even if not strictly needed for the next step calculation
    public Dictionary<string, double> Fluxes { get; set; } = new();

    public SimulationState Clone()
    {
        return new SimulationState
        {
            Time = this.Time,
            Metabolites = new Dictionary<string, double>(this.Metabolites),
            Fluxes = new Dictionary<string, double>(this.Fluxes)
        };
    }
}
