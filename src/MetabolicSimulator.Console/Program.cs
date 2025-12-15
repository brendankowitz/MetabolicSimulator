using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;
using MetabolicSimulator.Infrastructure.PathwayData;
using MetabolicSimulator.Infrastructure.Parsers;
using MetabolicSimulator.Infrastructure.Repositories;
using MetabolicSimulator.Infrastructure.Simulation;

Console.WriteLine("=".PadLeft(70, '='));
Console.WriteLine("  Metabolic Pathway Simulator - Phase 1 Prototype");
Console.WriteLine("=".PadLeft(70, '='));
Console.WriteLine();

// Initialize components
var dataPath = Path.Combine(AppContext.BaseDirectory, "Data");
var pathwayRepository = new JsonPathwayRepository(dataPath);
var simulationEngine = new SimulationEngine();
var parser = new TwentyThreeAndMeParser();

// Load data
Console.WriteLine($"Loading pathway data from {dataPath}...");
try 
{
    await pathwayRepository.InitializeAsync();
    var loadedPathways = await pathwayRepository.LoadPathwaysAsync();
    Console.WriteLine($"Loaded {loadedPathways.Count} pathways successfully.");

    // --- Personalization Step (Digital Twin) ---
    Console.WriteLine();
    Console.WriteLine("LOADING DIGITAL TWIN");
    Console.WriteLine("-".PadLeft(30, '-'));

    var profilePath = Path.Combine("MyDigitalTwin", "profile.json");
    DigitalTwinProfile profile;

    if (File.Exists(profilePath))
    {
        Console.WriteLine($"Reading profile from {profilePath}...");
        var json = File.ReadAllText(profilePath);
        var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        profile = System.Text.Json.JsonSerializer.Deserialize<DigitalTwinProfile>(json, options) 
                  ?? new DigitalTwinProfile();
    }
    else
    {
        Console.WriteLine("No profile found. Creating default...");
        profile = new DigitalTwinProfile 
        { 
            Age = 35, 
            WeightKg = 75, 
            HeightCm = 175, 
            Gender = Gender.Male 
        };
    }

    var userProfile = profile.ToUserProfile();
    Console.WriteLine($"User: {profile.DisplayName} ({profile.Age}yo, {profile.WeightKg}kg)");
    Console.WriteLine($"  > Sleep: {profile.SleepHours}h (Quality: {profile.SleepQuality}%)");
    Console.WriteLine($"  > NAD+ Decline Factor: {userProfile.NadDeclineFactor:P1}");
    Console.WriteLine($"  > Oxidative Stress Multiplier: {userProfile.OxidativeStressMultiplier:F2}x");

    // Process Lab Results
    var labOverrides = MetabolicSimulator.Infrastructure.Mappings.ClinicalMapper.GetInitialConcentrations(profile.LabResults);
    if (labOverrides.Count > 0)
    {
        Console.WriteLine("  > Applied Lab Data:");
        foreach(var kvp in labOverrides)
        {
            Console.WriteLine($"    - {kvp.Key}: {kvp.Value:F4} mM");
        }
    }
    Console.WriteLine();

    // Apply basic adjustments (Logic stub - real adjustment would modify Vmax/Concentrations)
    // We apply profile adjustments BEFORE merging so the modified values (e.g., lower NAD+) carry over.
    var adjustedPathways = MetabolicAdjuster.ApplyProfile(loadedPathways, userProfile);

    Console.WriteLine("Merging pathways into unified system...");
    var unitedPathway = MetabolicAdjuster.MergePathways(adjustedPathways);
    
    // Apply Lab Overrides to the Merged Pathway
    // Since records are immutable, we create a new list of metabolites with the updated values
    var updatedMetabolites = unitedPathway.Metabolites.Select(m => 
    {
        if (labOverrides.TryGetValue(m.Id, out var newConc))
        {
            return m with { InitialConcentration = newConc };
        }
        return m;
    }).ToList();

    unitedPathway = unitedPathway with { Metabolites = updatedMetabolites };

    Console.WriteLine($"Unified System: {unitedPathway.Metabolites.Count} Metabolites, {unitedPathway.Reactions.Count} Reactions.");

    // --- Run Simulation ---
    Console.WriteLine("Running Unified Whole-Body Simulation (60s)...");
    
    // Genetics: Keep MTHFR variant for consistency if desired, or null for wild-type
    var simulationParams = new SimulationParameters(
        Duration: 60.0,
        TimeStep: 0.01,
        OutputInterval: 5.0
        // GeneticProfile: ... (Optional)
    );

    var result = simulationEngine.Run(unitedPathway, simulationParams);

    // --- Export ---
    var csvPath = "whole_body_simulation.csv";
    ExportToCsv(result, csvPath);
    Console.WriteLine($"\nSUCCESS: Results exported to {csvPath}");
    
    Console.WriteLine("\nKey Results Snapshot (Final State):");
    var final = result.GetFinalConcentrations();
    // Use consistent IDs from updated pathways.json
    Console.WriteLine($"  ATP (Cytosol):   {final.GetValueOrDefault("atp_cyto"):F3} mM");
    Console.WriteLine($"  NADH (Mito):     {final.GetValueOrDefault("nadh_mito"):F3} mM");
    Console.WriteLine($"  NAD+ (Mito):     {final.GetValueOrDefault("nad_plus_mito"):F3} mM");
    Console.WriteLine($"  Glutathione:     {final.GetValueOrDefault("gsh_cyto"):F3} mM");
    Console.WriteLine($"  ROS (Stress):    {final.GetValueOrDefault("ros"):F5} mM");
    Console.WriteLine($"  SAM (Methyl):    {final.GetValueOrDefault("sam"):F3} mM");

    // --- Diagnostics Report ---
    Console.WriteLine();
    Console.WriteLine("METABOLIC ANALYSIS REPORT");
    Console.WriteLine("-".PadLeft(30, '-'));
    
    var issues = MetabolicSimulator.Infrastructure.Diagnostics.MetabolicAnalyzer.Analyze(result);
    if (issues.Count == 0)
    {
        Console.WriteLine("  No critical metabolic issues detected. System is stable.");
    }
    else
    {
        foreach (var issue in issues)
        {
            var color = issue.Severity == "CRITICAL" ? ConsoleColor.Red : 
                        issue.Severity == "WARNING" ? ConsoleColor.Yellow : ConsoleColor.Gray;
            
            Console.ForegroundColor = color;
            Console.WriteLine($"[{issue.Severity}] {issue.MetaboliteOrPathway}");
            Console.ResetColor();
            Console.WriteLine($"  Problem: {issue.Message}");
            Console.WriteLine($"  Fix:     {issue.PotentialFix}");
            Console.WriteLine();
        }
    }

}
catch (Exception ex)
{
    Console.WriteLine($"CRITICAL ERROR: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
}

/// <summary>
/// Exports simulation results to CSV format.
/// </summary>
static void ExportToCsv(SimulationResult result, string filePath)
{
    using var writer = new StreamWriter(filePath);
    
    // Header row
    var metaboliteIds = result.Pathway.Metabolites.Select(m => m.Id).ToList();
    writer.WriteLine("Time," + string.Join(",", metaboliteIds));
    
    // Data rows
    foreach (var tp in result.TimePoints)
    {
        var values = metaboliteIds.Select(id => 
            tp.Concentrations.TryGetValue(id, out var c) ? c.ToString("F6") : "0");
        writer.WriteLine($"{tp.Time:F2},{string.Join(",", values)}");
    }
}