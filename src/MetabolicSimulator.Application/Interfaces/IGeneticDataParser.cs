using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Application.Interfaces;

/// <summary>
/// Interface for parsing genetic data files (e.g., 23andMe raw data).
/// </summary>
public interface IGeneticDataParser
{
    /// <summary>
    /// Parses a genetic data file asynchronously.
    /// </summary>
    /// <param name="filePath">Path to the genetic data file.</param>
    /// <returns>A GeneticProfile containing all parsed SNPs.</returns>
    Task<GeneticProfile> ParseFileAsync(string filePath);

    /// <summary>
    /// Parses genetic data from a stream asynchronously.
    /// </summary>
    /// <param name="stream">Stream containing genetic data.</param>
    /// <returns>A GeneticProfile containing all parsed SNPs.</returns>
    Task<GeneticProfile> ParseStreamAsync(Stream stream);
}
