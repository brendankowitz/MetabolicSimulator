using MetabolicSimulator.Application.DTOs;
using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MetabolicSimulator.Infrastructure.Repositories;

public class JsonPathwayRepository
{
    private readonly string _basePath;
    private Dictionary<string, Enzyme> _enzymeCache = new();

    public JsonPathwayRepository(string basePath)
    {
        _basePath = basePath;
    }

    public async Task InitializeAsync()
    {
        var enzymesPath = Path.Combine(_basePath, "enzymes.json");
        if (!File.Exists(enzymesPath)) 
            throw new FileNotFoundException($"Enzymes file not found at {enzymesPath}");

        using var stream = File.OpenRead(enzymesPath);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        options.Converters.Add(new JsonStringEnumConverter());
        
        var enzymeDtos = await JsonSerializer.DeserializeAsync<List<EnzymeDto>>(stream, options);
        
        if (enzymeDtos != null)
        {
            foreach (var dto in enzymeDtos)
            {
                var modifiers = dto.GeneticModifiers.Select(m => new GeneticModifier(
                    m.RsId, m.GeneName, m.RiskAllele, 
                    Enum.Parse<Strand>(m.Orientation), 
                    m.HomozygousEffect, m.HeterozygousEffect, m.Description
                )).ToList();

                var enzyme = new Enzyme(
                    dto.Id, dto.Name, dto.EcNumber, dto.Vmax, dto.Km, 
                    dto.Cofactors ?? new List<string>(), modifiers);
                
                _enzymeCache[enzyme.Id] = enzyme;
            }
        }
    }

    public async Task<List<Pathway>> LoadPathwaysAsync()
    {
        if (_enzymeCache.Count == 0) await InitializeAsync();

        var pathwaysPath = Path.Combine(_basePath, "pathways.json");
        if (!File.Exists(pathwaysPath))
            throw new FileNotFoundException($"Pathways file not found at {pathwaysPath}");

        using var stream = File.OpenRead(pathwaysPath);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        options.Converters.Add(new JsonStringEnumConverter());

        var pathwayDtos = await JsonSerializer.DeserializeAsync<List<PathwayDto>>(stream, options);
        var result = new List<Pathway>();

        if (pathwayDtos != null)
        {
            foreach (var dto in pathwayDtos)
            {
                // Map Metabolites
                var metabolites = dto.Metabolites.Select(m => 
                    new Metabolite(m.Id, m.Name, m.InitialConcentration, m.Compartment)).ToList();
                
                var metaboliteLookup = metabolites.ToDictionary(m => m.Id);

                // Map Reactions
                var reactions = new List<Reaction>();
                foreach (var rDto in dto.Reactions)
                {
                    if (!_enzymeCache.TryGetValue(rDto.EnzymeId, out var enzyme))
                    {
                        // Fallback or error? For now, skip or throw.
                        // Throwing is safer for debugging "tuning" errors.
                        throw new InvalidOperationException($"Enzyme {rDto.EnzymeId} not found for reaction {rDto.Id}");
                    }

                    var substrates = rDto.Substrates.Select(s => 
                        new ReactionParticipant(metaboliteLookup[s.MetaboliteId], s.Coefficient)).ToList();
                    
                    var products = rDto.Products.Select(p => 
                        new ReactionParticipant(metaboliteLookup[p.MetaboliteId], p.Coefficient)).ToList();

                    reactions.Add(new Reaction(
                        rDto.Id, rDto.Name, enzyme, substrates, products,
                        Enum.Parse<KineticsType>(rDto.Kinetics),
                        rDto.Inhibitors, rDto.Activators, rDto.Ki, rDto.Ka, rDto.HillCoefficient
                    ));
                }

                result.Add(new Pathway(dto.Id, dto.Name, dto.Description, metabolites, reactions));
            }
        }

        return result;
    }
}
