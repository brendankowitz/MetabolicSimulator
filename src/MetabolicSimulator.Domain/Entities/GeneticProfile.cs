namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a user's genetic profile with extracted SNP data.
/// </summary>
/// <param name="SnpData">Dictionary of SNP data keyed by rsID.</param>
public class GeneticProfile
{
    private readonly Dictionary<string, SnpData> _snpData;

    public GeneticProfile(Dictionary<string, SnpData> snpData)
    {
        _snpData = snpData ?? new Dictionary<string, SnpData>();
    }

    /// <summary>
    /// Gets the genotype for a specific SNP.
    /// </summary>
    /// <param name="rsId">The reference SNP identifier.</param>
    /// <returns>The genotype string, or null if not found.</returns>
    public string? GetGenotype(string rsId)
    {
        return _snpData.TryGetValue(rsId, out var snp) ? snp.Genotype : null;
    }

    /// <summary>
    /// Gets the effect multiplier for an enzyme based on genetic variants.
    /// </summary>
    /// <param name="enzyme">The enzyme to check.</param>
    /// <returns>A multiplier for enzyme Vmax based on genetic variants.</returns>
    public double GetEnzymeEffectMultiplier(Enzyme enzyme)
    {
        double multiplier = 1.0;
        
        foreach (var modifier in enzyme.GeneticModifiers)
        {
            var genotype = GetGenotype(modifier.RsId);
            if (genotype == null) continue;
            
            // Count risk alleles
            int riskAlleleCount = genotype.Count(c => c.ToString().Equals(modifier.RiskAllele, StringComparison.OrdinalIgnoreCase));
            
            multiplier *= riskAlleleCount switch
            {
                2 => modifier.HomozygousEffect,      // Homozygous for risk allele
                1 => modifier.HeterozygousEffect,    // Heterozygous
                _ => 1.0                              // No risk alleles
            };
        }
        
        return multiplier;
    }

    /// <summary>
    /// Gets all SNP data.
    /// </summary>
    public IReadOnlyDictionary<string, SnpData> AllSnps => _snpData;

    /// <summary>
    /// Gets the total number of SNPs in the profile.
    /// </summary>
    public int SnpCount => _snpData.Count;
}
