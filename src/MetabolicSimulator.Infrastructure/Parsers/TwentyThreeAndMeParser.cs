using MetabolicSimulator.Application.Interfaces;
using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Infrastructure.Parsers;

/// <summary>
/// Parser for 23andMe raw genetic data files.
/// 23andMe files are tab-separated with format: rsid, chromosome, position, genotype
/// </summary>
public class TwentyThreeAndMeParser : IGeneticDataParser
{
    /// <summary>
    /// Parses a 23andMe raw data file.
    /// </summary>
    public async Task<GeneticProfile> ParseFileAsync(string filePath)
    {
        await using var stream = File.OpenRead(filePath);
        return await ParseStreamAsync(stream);
    }

    /// <summary>
    /// Parses 23andMe data from a stream.
    /// </summary>
    public async Task<GeneticProfile> ParseStreamAsync(Stream stream)
    {
        var snpLookup = new Dictionary<string, SnpData>(800000);
        
        using var reader = new StreamReader(stream);
        string? line;
        
        while ((line = await reader.ReadLineAsync()) != null)
        {
            // Skip comment lines
            if (line.StartsWith('#'))
                continue;
            
            // Skip empty lines
            if (string.IsNullOrWhiteSpace(line))
                continue;
            
            var parts = line.Split('\t');
            
            // Validate line format (rsid, chromosome, position, genotype)
            if (parts.Length < 4)
                continue;
            
            var rsId = parts[0];
            var chromosome = parts[1];
            var positionStr = parts[2];
            var genotype = parts[3];
            
            // Skip missing data (represented as "--")
            if (genotype == "--")
                continue;
            
            // Parse position
            if (!int.TryParse(positionStr, out var position))
                continue;
            
            snpLookup[rsId] = new SnpData(rsId, chromosome, position, genotype);
        }
        
        return new GeneticProfile(snpLookup);
    }
}
