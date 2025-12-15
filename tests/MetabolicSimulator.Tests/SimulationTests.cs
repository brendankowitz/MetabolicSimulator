using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;
using MetabolicSimulator.Infrastructure.PathwayData;
using MetabolicSimulator.Infrastructure.Parsers;
using MetabolicSimulator.Infrastructure.Simulation;

namespace MetabolicSimulator.Tests;

/// <summary>
/// Tests for the metabolic pathway simulation engine.
/// </summary>
public class SimulationEngineTests
{
    private readonly PathwayProvider _pathwayProvider;
    private readonly SimulationEngine _simulationEngine;

    public SimulationEngineTests()
    {
        _pathwayProvider = new PathwayProvider();
        _simulationEngine = new SimulationEngine();
    }

    [Fact]
    public void MethylationCycle_BaselineSimulation_ProducesValidResults()
    {
        // Arrange
        var pathway = _pathwayProvider.GetMethylationCycle();
        var parameters = new SimulationParameters(Duration: 30.0, TimeStep: 0.01, OutputInterval: 10.0);

        // Act
        var result = _simulationEngine.Run(pathway, parameters);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.TimePoints);
        Assert.Equal(pathway, result.Pathway);
        
        // Verify all metabolites have concentrations
        var finalConcentrations = result.GetFinalConcentrations();
        Assert.True(finalConcentrations.ContainsKey("hcy"));
        Assert.True(finalConcentrations.ContainsKey("methyl_thf"));
        Assert.True(finalConcentrations.ContainsKey("sam"));
    }

    [Fact]
    public void MthfrVariant_Reduces5MthfProduction()
    {
        // Arrange
        var pathway = _pathwayProvider.GetMethylationCycle();
        var baselineParams = new SimulationParameters(Duration: 60.0, TimeStep: 0.01, OutputInterval: 30.0);
        
        // Create MTHFR T/T variant profile
        var variantData = new Dictionary<string, SnpData>
        {
            ["rs1801133"] = new SnpData("rs1801133", "1", 11856378, "TT")
        };
        var mthfrProfile = new GeneticProfile(variantData);
        var variantParams = new SimulationParameters(
            Duration: 60.0, TimeStep: 0.01, OutputInterval: 30.0, GeneticProfile: mthfrProfile);

        // Act
        var baselineResult = _simulationEngine.Run(pathway, baselineParams);
        var variantResult = _simulationEngine.Run(pathway, variantParams);

        // Assert
        var baseline5Mthf = baselineResult.GetFinalConcentrations()["methyl_thf"];
        var variant5Mthf = variantResult.GetFinalConcentrations()["methyl_thf"];
        
        // MTHFR T/T should have significantly reduced 5-MTHF
        Assert.True(variant5Mthf < baseline5Mthf, 
            $"MTHFR T/T 5-MTHF ({variant5Mthf}) should be less than baseline ({baseline5Mthf})");
    }

    [Fact]
    public void MethylfolateSupplement_Increases5Mthf()
    {
        // Arrange
        var pathway = _pathwayProvider.GetMethylationCycle();
        
        // Create MTHFR T/T variant profile
        var variantData = new Dictionary<string, SnpData>
        {
            ["rs1801133"] = new SnpData("rs1801133", "1", 11856378, "TT")
        };
        var mthfrProfile = new GeneticProfile(variantData);
        var variantParams = new SimulationParameters(
            Duration: 30.0, TimeStep: 0.01, OutputInterval: 15.0, GeneticProfile: mthfrProfile);

        var methylfolateSupp = new SupplementIntervention(
            Id: "methylfolate",
            Name: "Methylfolate",
            Type: InterventionType.SubstrateIncrease,
            TargetId: "methyl_thf",
            EffectMagnitude: 0.1,
            Mechanism: "Direct 5-MTHF supply");

        // Act
        var variantResult = _simulationEngine.Run(pathway, variantParams);
        var suppResult = _simulationEngine.Run(pathway, variantParams, 
            new List<SupplementIntervention> { methylfolateSupp });

        // Assert
        var variant5Mthf = variantResult.GetFinalConcentrations()["methyl_thf"];
        var supp5Mthf = suppResult.GetFinalConcentrations()["methyl_thf"];
        
        // Supplementation should increase 5-MTHF availability
        Assert.True(supp5Mthf > variant5Mthf,
            $"Supplemented 5-MTHF ({supp5Mthf}) should be greater than unsupplemented ({variant5Mthf})");
    }

    [Fact]
    public void KrebsCycle_ProducesNadh()
    {
        // Arrange
        var pathway = _pathwayProvider.GetKrebsCycle();
        var parameters = new SimulationParameters(Duration: 30.0, TimeStep: 0.01, OutputInterval: 10.0);

        // Act
        var result = _simulationEngine.Run(pathway, parameters);

        // Assert
        var initialNadh = result.TimePoints.First().Concentrations["nadh"];
        var finalNadh = result.GetFinalConcentrations()["nadh"];
        
        // Krebs cycle should show NADH dynamics (may increase then decrease due to oxidation)
        Assert.NotEqual(initialNadh, finalNadh);
    }

    [Fact]
    public void GeneticProfile_CalculatesCorrectEnzymeModifier()
    {
        // Arrange
        var mthfrModifier = new GeneticModifier(
            RsId: "rs1801133",
            GeneName: "MTHFR",
            RiskAllele: "T",
            Orientation: Strand.Minus,
            HomozygousEffect: 0.30,
            HeterozygousEffect: 0.65,
            Description: "MTHFR C677T");

        var enzyme = new Enzyme(
            Id: "mthfr",
            Name: "MTHFR",
            EcNumber: "1.5.1.20",
            Vmax: 0.1,
            Km: 0.01,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier> { mthfrModifier });

        // Test homozygous (TT)
        var homozygousData = new Dictionary<string, SnpData>
        {
            ["rs1801133"] = new SnpData("rs1801133", "1", 11856378, "TT")
        };
        var homozygousProfile = new GeneticProfile(homozygousData);

        // Test heterozygous (CT)
        var heterozygousData = new Dictionary<string, SnpData>
        {
            ["rs1801133"] = new SnpData("rs1801133", "1", 11856378, "CT")
        };
        var heterozygousProfile = new GeneticProfile(heterozygousData);

        // Test wild type (CC)
        var wildTypeData = new Dictionary<string, SnpData>
        {
            ["rs1801133"] = new SnpData("rs1801133", "1", 11856378, "CC")
        };
        var wildTypeProfile = new GeneticProfile(wildTypeData);

        // Act & Assert
        Assert.Equal(0.30, homozygousProfile.GetEnzymeEffectMultiplier(enzyme), 2);
        Assert.Equal(0.65, heterozygousProfile.GetEnzymeEffectMultiplier(enzyme), 2);
        Assert.Equal(1.0, wildTypeProfile.GetEnzymeEffectMultiplier(enzyme), 2);
    }

    [Fact]
    public void SimulationResult_GetMetaboliteTimeSeries_ReturnsCorrectData()
    {
        // Arrange
        var pathway = _pathwayProvider.GetMethylationCycle();
        var parameters = new SimulationParameters(Duration: 30.0, TimeStep: 0.01, OutputInterval: 10.0);

        // Act
        var result = _simulationEngine.Run(pathway, parameters);
        var hcyTimeSeries = result.GetMetaboliteTimeSeries("hcy");

        // Assert
        Assert.Equal(4, hcyTimeSeries.Length); // t=0, 10, 20, 30
        Assert.Equal(0, hcyTimeSeries[0].Time);
        Assert.True(hcyTimeSeries[0].Concentration > 0);
    }
}

/// <summary>
/// Tests for the 23andMe genetic data parser.
/// </summary>
public class TwentyThreeAndMeParserTests
{
    [Fact]
    public async Task ParseStreamAsync_ValidData_ParsesCorrectly()
    {
        // Arrange
        var parser = new TwentyThreeAndMeParser();
        var testData = """
            # rsid	chromosome	position	genotype
            rs1801133	1	11856378	CT
            rs4680	22	19951271	AG
            rs1805087	1	237048500	AA
            """;
        
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(testData));

        // Act
        var profile = await parser.ParseStreamAsync(stream);

        // Assert
        Assert.Equal(3, profile.SnpCount);
        Assert.Equal("CT", profile.GetGenotype("rs1801133"));
        Assert.Equal("AG", profile.GetGenotype("rs4680"));
        Assert.Equal("AA", profile.GetGenotype("rs1805087"));
    }

    [Fact]
    public async Task ParseStreamAsync_SkipsComments()
    {
        // Arrange
        var parser = new TwentyThreeAndMeParser();
        var testData = """
            # This is a comment
            # rsid	chromosome	position	genotype
            rs1801133	1	11856378	CT
            # Another comment
            rs4680	22	19951271	AG
            """;
        
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(testData));

        // Act
        var profile = await parser.ParseStreamAsync(stream);

        // Assert
        Assert.Equal(2, profile.SnpCount);
    }

    [Fact]
    public async Task ParseStreamAsync_SkipsMissingData()
    {
        // Arrange
        var parser = new TwentyThreeAndMeParser();
        var testData = """
            rs1801133	1	11856378	CT
            rs4680	22	19951271	--
            rs1805087	1	237048500	AA
            """;
        
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(testData));

        // Act
        var profile = await parser.ParseStreamAsync(stream);

        // Assert
        Assert.Equal(2, profile.SnpCount);
        Assert.Null(profile.GetGenotype("rs4680"));
    }
}

/// <summary>
/// Tests for the kinetics calculator.
/// </summary>
public class KineticsCalculatorTests
{
    [Fact]
    public void MichaelisMenten_CalculatesCorrectRate()
    {
        // Arrange
        var calculator = new KineticsCalculator();
        var enzyme = new Enzyme("test", "Test", "1.1.1.1", Vmax: 1.0, Km: 0.1,
            Cofactors: new List<string>(), GeneticModifiers: new List<GeneticModifier>());
        
        var substrate = new Metabolite("sub", "Substrate", 0.1, "cytosol");
        var product = new Metabolite("prod", "Product", 0, "cytosol");
        
        var reaction = new Reaction(
            "r1", "Test Reaction", enzyme,
            new List<ReactionParticipant> { new(substrate, 1) },
            new List<ReactionParticipant> { new(product, 1) },
            KineticsType.MichaelisMenten);

        var concentrations = new Dictionary<string, double> { ["sub"] = 0.1 };

        // Act
        var rate = calculator.CalculateRate(reaction, concentrations);

        // Assert
        // At [S] = Km, v = Vmax/2
        Assert.Equal(0.5, rate, 2);
    }

    [Fact]
    public void MichaelisMenten_WithEnzymeModifier_ReducesRate()
    {
        // Arrange
        var calculator = new KineticsCalculator();
        var enzyme = new Enzyme("test", "Test", "1.1.1.1", Vmax: 1.0, Km: 0.1,
            Cofactors: new List<string>(), GeneticModifiers: new List<GeneticModifier>());
        
        var substrate = new Metabolite("sub", "Substrate", 0.1, "cytosol");
        var product = new Metabolite("prod", "Product", 0, "cytosol");
        
        var reaction = new Reaction(
            "r1", "Test Reaction", enzyme,
            new List<ReactionParticipant> { new(substrate, 1) },
            new List<ReactionParticipant> { new(product, 1) },
            KineticsType.MichaelisMenten);

        var concentrations = new Dictionary<string, double> { ["sub"] = 0.1 };

        // Act
        var normalRate = calculator.CalculateRate(reaction, concentrations, 1.0);
        var reducedRate = calculator.CalculateRate(reaction, concentrations, 0.3);

        // Assert
        Assert.Equal(0.3, reducedRate / normalRate, 2);
    }
}

/// <summary>
/// Tests for the RK4 ODE solver.
/// </summary>
public class RungeKuttaSolverTests
{
    [Fact]
    public void Step_ExponentialDecay_ApproximatesAnalyticalSolution()
    {
        // Arrange
        var solver = new RungeKuttaSolver();
        
        // dy/dt = -y (exponential decay)
        Func<double[], double, double[]> derivatives = (y, t) => new[] { -y[0] };
        
        double[] y0 = { 1.0 }; // Initial condition: y(0) = 1
        double dt = 0.01;

        // Act - integrate to t = 1
        double[] y = y0;
        for (int i = 0; i < 100; i++)
        {
            y = solver.Step(y, i * dt, dt, derivatives);
        }

        // Assert - analytical solution y(1) = e^(-1) ≈ 0.368
        Assert.Equal(Math.Exp(-1), y[0], 3);
    }

    [Fact]
    public void Integrate_ReturnsCorrectTimePoints()
    {
        // Arrange
        var solver = new RungeKuttaSolver();
        Func<double[], double, double[]> derivatives = (y, t) => new[] { -y[0] };
        
        double[] y0 = { 1.0 };

        // Act
        var results = solver.Integrate(y0, 0, 1.0, 0.01, derivatives, 0.5);

        // Assert
        Assert.Equal(3, results.Count); // t=0, t=0.5, t=1.0
        Assert.Equal(0, results[0].Time);
        Assert.Equal(0.5, results[1].Time, 1);
        Assert.Equal(1.0, results[2].Time, 1);
    }

    [Fact]
    public void Step_EnforcesNonNegativeConcentrations()
    {
        // Arrange
        var solver = new RungeKuttaSolver();
        
        // Rapid decay that would go negative
        Func<double[], double, double[]> derivatives = (y, t) => new[] { -100.0 };
        
        double[] y0 = { 0.1 };

        // Act
        var y = solver.Step(y0, 0, 0.1, derivatives);

        // Assert - should clamp to 0, not go negative
        Assert.Equal(0, y[0]);
    }
}

/// <summary>
/// Tests for the pathway provider.
/// </summary>
public class PathwayProviderTests
{
    [Fact]
    public void GetKrebsCycle_Has8CoreReactions()
    {
        // Arrange
        var provider = new PathwayProvider();

        // Act
        var pathway = provider.GetKrebsCycle();

        // Assert - 8 core Krebs cycle reactions + 2 input/output reactions
        Assert.True(pathway.Reactions.Count >= 8);
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Citrate Synthase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Aconitase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Isocitrate Dehydrogenase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Ketoglutarate Dehydrogenase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Succinyl-CoA Synthetase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Succinate Dehydrogenase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Fumarase"));
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("Malate Dehydrogenase"));
    }

    [Fact]
    public void GetMethylationCycle_ContainsMthfrWithVariants()
    {
        // Arrange
        var provider = new PathwayProvider();

        // Act
        var pathway = provider.GetMethylationCycle();
        var mthfrReaction = pathway.Reactions.FirstOrDefault(r => r.Name.Contains("MTHFR"));

        // Assert
        Assert.NotNull(mthfrReaction);
        Assert.NotEmpty(mthfrReaction.Enzyme.GeneticModifiers);
        Assert.Contains(mthfrReaction.Enzyme.GeneticModifiers, gm => gm.RsId == "rs1801133");
    }

    [Fact]
    public void GetMethylationCycle_IncludesBetainePathway()
    {
        // Arrange
        var provider = new PathwayProvider();

        // Act
        var pathway = provider.GetMethylationCycle();

        // Assert
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("BHMT"));
        Assert.Contains(pathway.Metabolites, m => m.Id == "bet"); // Betaine
    }

    [Fact]
    public void GetMethylationCycle_IncludesTranssulfurationPathway()
    {
        // Arrange
        var provider = new PathwayProvider();

        // Act
        var pathway = provider.GetMethylationCycle();

        // Assert
        Assert.Contains(pathway.Reactions, r => r.Name.Contains("CBS"));
        Assert.Contains(pathway.Metabolites, m => m.Id == "cys"); // Cysteine
    }
}
