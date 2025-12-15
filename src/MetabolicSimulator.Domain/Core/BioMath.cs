namespace MetabolicSimulator.Domain.Core;

public static class BioMath
{
    /// <summary>
    /// Calculates reaction rate using Michaelis-Menten kinetics: V = (Vmax * [S]) / (Km + [S])
    /// </summary>
    public static double MichaelisMenten(double vmax, double km, double substrateConc)
    {
        if (substrateConc <= 0) return 0;
        return (vmax * substrateConc) / (km + substrateConc);
    }

    /// <summary>
    /// Handles competitive inhibition: V = Vmax * [S] / (Km * (1 + [I]/Ki) + [S])
    /// </summary>
    public static double CompetitiveInhibition(double vmax, double km, double s, double i, double ki)
    {
        if (s <= 0) return 0;
        var kmApp = km * (1.0 + (i / ki));
        return (vmax * s) / (kmApp + s);
    }

    /// <summary>
    /// Handles non-competitive inhibition: V = (Vmax / (1 + [I]/Ki)) * [S] / (Km + [S])
    /// </summary>
    public static double NonCompetitiveInhibition(double vmax, double km, double s, double i, double ki)
    {
        if (s <= 0) return 0;
        var vmaxApp = vmax / (1.0 + (i / ki));
        return (vmaxApp * s) / (km + s);
    }
}
