using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents a genetic variant (SNP) that modifies enzyme activity.
/// </summary>
/// <param name="RsId">The reference SNP identifier (e.g., "rs1801133").</param>
/// <param name="GeneName">Name of the gene affected (e.g., "MTHFR").</param>
/// <param name="RiskAllele">The allele associated with reduced function (e.g., "T").</param>
/// <param name="Orientation">The strand orientation of the RiskAllele relative to the genome build (GRCh37).</param>
/// <param name="HomozygousEffect">Multiplier for Vmax when homozygous for risk allele (e.g., 0.3 for 70% reduction).</param>
/// <param name="HeterozygousEffect">Multiplier for Vmax when heterozygous (e.g., 0.65 for 35% reduction).</param>
/// <param name="Description">Human-readable description of the variant effect.</param>
public record GeneticModifier(
    string RsId,
    string GeneName,
    string RiskAllele,
    Strand Orientation,
    double HomozygousEffect,
    double HeterozygousEffect,
    string Description = "");