using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Application.DTOs;

public record EnzymeDto(
    string Id,
    string Name,
    string EcNumber,
    double Vmax,
    double Km,
    List<string> Cofactors,
    List<GeneticModifierDto> GeneticModifiers);

public record GeneticModifierDto(
    string RsId,
    string GeneName,
    string RiskAllele,
    string Orientation, // "Plus" or "Minus"
    double HomozygousEffect,
    double HeterozygousEffect,
    string Description);

public record PathwayDto(
    string Id,
    string Name,
    string Description,
    List<MetaboliteDto> Metabolites,
    List<ReactionDto> Reactions);

public record MetaboliteDto(
    string Id,
    string Name,
    double InitialConcentration,
    string Compartment);

public record ReactionDto(
    string Id,
    string Name,
    string EnzymeId,
    List<ReactionParticipantDto> Substrates,
    List<ReactionParticipantDto> Products,
    string Kinetics,
    List<string>? Inhibitors = null,
    List<string>? Activators = null,
    double Ki = 0,
    double Ka = 0,
    double HillCoefficient = 1.0);

public record ReactionParticipantDto(
    string MetaboliteId,
    int Coefficient);
