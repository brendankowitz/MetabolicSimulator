using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Infrastructure.Simulation;

/// <summary>
/// Calculates reaction rates using various enzyme kinetics models.
/// </summary>
public class KineticsCalculator
{
    /// <summary>
    /// Calculates the reaction rate for a given reaction.
    /// </summary>
    /// <param name="reaction">The reaction to calculate rate for.</param>
    /// <param name="concentrations">Current metabolite concentrations.</param>
    /// <param name="enzymeModifier">Modifier applied to enzyme Vmax (from genetic variants).</param>
    /// <returns>The reaction rate in mM/s.</returns>
    public double CalculateRate(
        Reaction reaction,
        Dictionary<string, double> concentrations,
        double enzymeModifier = 1.0)
    {
        // Apply enzyme modifier to Vmax
        double vmax = reaction.Enzyme.Vmax * enzymeModifier;
        double km = reaction.Enzyme.Km;

        // Handle input reactions with no substrates (constant rate)
        if (reaction.Substrates.Count == 0)
        {
            return reaction.Kinetics == KineticsType.MassAction ? vmax : 0;
        }

        // Get substrate concentration (use first substrate for simplicity)
        var primarySubstrate = reaction.Substrates.First();
        if (!concentrations.TryGetValue(primarySubstrate.Metabolite.Id, out var substrateConc))
            return 0;

        return reaction.Kinetics switch
        {
            KineticsType.MichaelisMenten => CalculateMichaelisMenten(vmax, km, substrateConc),
            KineticsType.CompetitiveInhibition => CalculateCompetitiveInhibition(
                vmax, km, substrateConc, reaction, concentrations),
            KineticsType.NonCompetitiveInhibition => CalculateNonCompetitiveInhibition(
                vmax, km, substrateConc, reaction, concentrations),
            KineticsType.Allosteric => CalculateAllosteric(
                vmax, km, substrateConc, reaction.HillCoefficient),
            KineticsType.MassAction => CalculateMassAction(vmax, substrateConc),
            _ => CalculateMichaelisMenten(vmax, km, substrateConc)
        };
    }

    /// <summary>
    /// Michaelis-Menten kinetics: v = Vmax * [S] / (Km + [S])
    /// </summary>
    private double CalculateMichaelisMenten(double vmax, double km, double substrateConc)
    {
        if (substrateConc <= 0 || km <= 0)
            return 0;
        
        return vmax * substrateConc / (km + substrateConc);
    }

    /// <summary>
    /// Competitive inhibition: v = Vmax * [S] / (Km * (1 + [I]/Ki) + [S])
    /// </summary>
    private double CalculateCompetitiveInhibition(
        double vmax, double km, double substrateConc,
        Reaction reaction, Dictionary<string, double> concentrations)
    {
        if (substrateConc <= 0 || km <= 0 || reaction.Ki <= 0)
            return CalculateMichaelisMenten(vmax, km, substrateConc);

        double inhibitorConc = GetInhibitorConcentration(reaction, concentrations);
        double apparentKm = km * (1 + inhibitorConc / reaction.Ki);
        
        return vmax * substrateConc / (apparentKm + substrateConc);
    }

    /// <summary>
    /// Non-competitive inhibition: v = Vmax * [S] / ((Km + [S]) * (1 + [I]/Ki))
    /// </summary>
    private double CalculateNonCompetitiveInhibition(
        double vmax, double km, double substrateConc,
        Reaction reaction, Dictionary<string, double> concentrations)
    {
        if (substrateConc <= 0 || km <= 0 || reaction.Ki <= 0)
            return CalculateMichaelisMenten(vmax, km, substrateConc);

        double inhibitorConc = GetInhibitorConcentration(reaction, concentrations);
        double inhibitionFactor = 1 + inhibitorConc / reaction.Ki;
        
        return (vmax * substrateConc / (km + substrateConc)) / inhibitionFactor;
    }

    /// <summary>
    /// Allosteric (Hill) kinetics: v = Vmax * [S]^n / (K^n + [S]^n)
    /// </summary>
    private double CalculateAllosteric(double vmax, double k, double substrateConc, double hillCoefficient)
    {
        if (substrateConc <= 0 || k <= 0)
            return 0;

        double sn = Math.Pow(substrateConc, hillCoefficient);
        double kn = Math.Pow(k, hillCoefficient);
        
        return vmax * sn / (kn + sn);
    }

    /// <summary>
    /// Mass action kinetics: v = k * [S]
    /// </summary>
    private double CalculateMassAction(double k, double substrateConc)
    {
        if (substrateConc <= 0)
            return 0;
        
        return k * substrateConc;
    }

    /// <summary>
    /// Gets the total inhibitor concentration for a reaction.
    /// </summary>
    private double GetInhibitorConcentration(Reaction reaction, Dictionary<string, double> concentrations)
    {
        if (reaction.Inhibitors == null || reaction.Inhibitors.Count == 0)
            return 0;

        return reaction.Inhibitors
            .Where(id => concentrations.ContainsKey(id))
            .Sum(id => concentrations[id]);
    }
}
