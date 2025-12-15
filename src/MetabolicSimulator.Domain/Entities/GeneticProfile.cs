using MetabolicSimulator.Domain.Enums;

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
    /// <returns>The genotype string (e.g., "AG"), or null if not found.</returns>
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
            var rawGenotype = GetGenotype(modifier.RsId);
            if (string.IsNullOrEmpty(rawGenotype)) continue;
            
            // 23andMe always reports on the Plus (+) strand.
            // If the modifier (literature) defines the Risk Allele on the Minus (-) strand,
            // we must flip the raw genotype to match the literature definition.
            
            string comparisonGenotype = rawGenotype;
            if (modifier.Orientation == Strand.Minus)
            {
                comparisonGenotype = ComplementDna(rawGenotype);
            }

            // Count risk alleles in the (possibly flipped) genotype
            int riskAlleleCount = comparisonGenotype.Count(c => c.ToString().Equals(modifier.RiskAllele, StringComparison.OrdinalIgnoreCase));
            
            multiplier *= riskAlleleCount switch
            {
                2 => modifier.HomozygousEffect,      // Homozygous for risk allele
                1 => modifier.HeterozygousEffect,    // Heterozygous
                _ => 1.0                              // No risk alleles
            };
        }
        
        return multiplier;
    }

    private string ComplementDna(string sequence)
    {
        char[] result = new char[sequence.Length];
        for (int i = 0; i < sequence.Length; i++)
        {
            result[i] = sequence[i] switch
            {
                'A' => 'T',
                'T' => 'A',
                'C' => 'G',
                'G' => 'C',
                _ => sequence[i] // Keep unknown chars like '-' or '?' as is
            };
        }
        return new string(result);
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