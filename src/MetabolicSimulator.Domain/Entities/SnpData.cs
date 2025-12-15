namespace MetabolicSimulator.Domain.Entities;

/// <summary>
/// Represents SNP data from a genetic testing file (e.g., 23andMe).
/// </summary>
/// <param name="RsId">Reference SNP identifier (e.g., "rs1801133").</param>
/// <param name="Chromosome">Chromosome number or identifier.</param>
/// <param name="Position">Position on the chromosome (GRCh37/hg19).</param>
/// <param name="Genotype">The individual's genotype (e.g., "CT", "AA").</param>
public record SnpData(
    string RsId,
    string Chromosome,
    int Position,
    string Genotype);
