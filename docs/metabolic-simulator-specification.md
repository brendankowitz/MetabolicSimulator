# Metabolic Pathway Simulator: Personalization & Interconnected Systems Specification

## Table of Contents
1. [PersonalizedProfile System](#personalizedprofile-system)
2. [Interconnected System Architecture](#interconnected-system-architecture)
3. [Resource Competition & Allocation](#resource-competition--allocation)
4. [Regulatory Networks](#regulatory-networks)
5. [System Implementations](#system-implementations)
6. [Data Flow & Integration](#data-flow--integration)
7. [Implementation Roadmap](#implementation-roadmap)

---

## PersonalizedProfile System

### Core Data Models

```csharp
public class PersonalizedProfile
{
    public Guid ProfileId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime LastUpdated { get; set; }
    
    // Genetic information
    public GeneticProfile Genetics { get; set; }
    
    // Clinical data
    public BloodWorkProfile BloodMarkers { get; set; }
    
    // Subjective data
    public SymptomTracker Symptoms { get; set; }
    
    // Lifestyle factors
    public DietaryProfile Diet { get; set; }
    public LifestyleFactors Lifestyle { get; set; }
    
    // Current interventions
    public List<SupplementIntervention> CurrentSupplements { get; set; }
    
    // Simulation history
    public List<SimulationSession> PreviousSimulations { get; set; }
    
    // Computed risk scores
    public RiskAssessment ComputedRisks { get; private set; }
    
    public void RecalculateRisks()
    {
        ComputedRisks = new RiskAssessmentEngine().Assess(this);
    }
}
```

### Genetic Profile Specification

```csharp
public class GeneticProfile
{
    public string FileName { get; set; }
    public DateTime UploadDate { get; set; }
    public GeneticTestProvider Provider { get; set; }  // 23andMe, AncestryDNA, etc.
    public string ChipVersion { get; set; }  // v4, v5, v5+chip
    
    // Raw SNP data - key is rsID
    public Dictionary<string, SnpGenotype> RawSnps { get; set; }
    
    // Parsed metabolic variants
    public MetabolicVariants Variants { get; set; }
    
    // Quality metrics
    public double CallRate { get; set; }  // Percentage of SNPs successfully called
    public int TotalSnpsCalled { get; set; }
    public int MissingCalls { get; set; }
}

public record SnpGenotype(
    string RsId,
    string Chromosome,
    int Position,
    string Genotype,  // e.g., "CT", "AA", "GG"
    string? Orientation = null  // Plus or minus strand
);

public enum GeneticTestProvider
{
    TwentyThreeAndMe,
    AncestryDNA,
    MyHeritage,
    FamilyTreeDNA,
    Nebula,
    DanteLabs,
    Unknown
}

public class MetabolicVariants
{
    // Methylation pathway
    public SnpVariant? MTHFR_C677T { get; set; }      // rs1801133
    public SnpVariant? MTHFR_A1298C { get; set; }     // rs1801131
    public SnpVariant? MTR_A2756G { get; set; }       // rs1805087
    public SnpVariant? MTRR_A66G { get; set; }        // rs1801394
    public SnpVariant? CBS_C699T { get; set; }        // rs234706
    public SnpVariant? BHMT_G716A { get; set; }       // rs3733890
    public SnpVariant? COMT_Val158Met { get; set; }   // rs4680
    public SnpVariant? MAO_A_VNTR { get; set; }       // Not in 23andMe, but important
    
    // Neurotransmitter metabolism
    public SnpVariant? TPH1_A218C { get; set; }       // rs1800532 - Serotonin synthesis
    public SnpVariant? TPH2_G703T { get; set; }       // rs4290270
    public SnpVariant? DBH_1021CT { get; set; }       // rs1611115 - Dopamine to NE conversion
    
    // BH4 cycle
    public SnpVariant? GCH1_Variants { get; set; }    // Multiple - BH4 synthesis
    public SnpVariant? DHFR_19bp_Deletion { get; set; }
    
    // NAD+ metabolism  
    public SnpVariant? NNMT_Variants { get; set; }    // Affects NAD+ salvage
    public SnpVariant? NAMPT_Variants { get; set; }   // NAD+ synthesis rate-limiting
    
    // Krebs cycle enzymes
    public SnpVariant? SDHA_Variants { get; set; }    // Succinate dehydrogenase
    public SnpVariant? IDH1_Variants { get; set; }    // Isocitrate dehydrogenase
    
    // Glutathione system
    public SnpVariant? GCLC_Variants { get; set; }    // Glutamate-cysteine ligase
    public SnpVariant? GSS_Variants { get; set; }     // Glutathione synthase
    public SnpVariant? GPX1_Pro198Leu { get; set; }   // rs1050450 - Glutathione peroxidase
    
    // One-carbon metabolism
    public SnpVariant? SHMT1_C1420T { get; set; }     // rs1979277
    public SnpVariant? TYMS_Variants { get; set; }    // Thymidylate synthase
    
    public Dictionary<string, SnpVariant> OtherVariants { get; set; }
}

public record SnpVariant(
    string RsId,
    string GeneName,
    string VariantName,
    string Genotype,
    Zygosity ZygosityStatus,
    VariantImpact Impact,
    double? FunctionalEffect = null  // Multiplier for enzyme activity (e.g., 0.3 = 70% reduction)
);

public enum Zygosity
{
    Homozygous,      // Both alleles are the variant
    Heterozygous,    // One variant, one normal
    Normal           // Both alleles are normal/reference
}

public enum VariantImpact
{
    Unknown,
    Benign,
    LikelyBenign,
    UncertainSignificance,
    LikelyPathogenic,
    Pathogenic,
    Functional  // Not pathogenic but affects enzyme kinetics
}
```

### 23andMe File Parser Implementation

```csharp
public interface IGeneticDataParser
{
    Task<GeneticProfile> ParseFileAsync(Stream fileStream, string fileName);
    GeneticTestProvider DetectProvider(Stream fileStream);
}

public class TwentyThreeAndMeParser : IGeneticDataParser
{
    private static readonly HashSet<string> MetabolicSnps = new()
    {
        // Methylation
        "rs1801133", "rs1801131", "rs1805087", "rs1801394", 
        "rs234706", "rs3733890", "rs4680",
        
        // Neurotransmitters
        "rs1800532", "rs4290270", "rs1611115",
        
        // Glutathione
        "rs1050450",
        
        // One-carbon
        "rs1979277",
        
        // Add more as needed
    };
    
    public async Task<GeneticProfile> ParseFileAsync(Stream fileStream, string fileName)
    {
        var profile = new GeneticProfile
        {
            FileName = fileName,
            UploadDate = DateTime.UtcNow,
            Provider = GeneticTestProvider.TwentyThreeAndMe,
            RawSnps = new Dictionary<string, SnpGenotype>()
        };
        
        using var reader = new StreamReader(fileStream);
        string? line;
        int totalLines = 0;
        int missingCalls = 0;
        
        while ((line = await reader.ReadLineAsync()) != null)
        {
            // Skip comments and header
            if (line.StartsWith("#"))
            {
                // Extract chip version from comments
                if (line.Contains("chip version"))
                {
                    profile.ChipVersion = ExtractChipVersion(line);
                }
                continue;
            }
            
            var parts = line.Split('\t');
            if (parts.Length < 4) continue;
            
            totalLines++;
            var rsId = parts[0];
            var chromosome = parts[1];
            var position = int.Parse(parts[2]);
            var genotype = parts[3];
            
            // Track missing calls
            if (genotype == "--")
            {
                missingCalls++;
                continue;
            }
            
            // Store all SNPs, but flag metabolic ones
            var snp = new SnpGenotype(rsId, chromosome, position, genotype);
            profile.RawSnps[rsId] = snp;
        }
        
        profile.TotalSnpsCalled = totalLines - missingCalls;
        profile.MissingCalls = missingCalls;
        profile.CallRate = (double)(totalLines - missingCalls) / totalLines;
        
        // Parse metabolic variants
        profile.Variants = ParseMetabolicVariants(profile.RawSnps);
        
        return profile;
    }
    
    private MetabolicVariants ParseMetabolicVariants(Dictionary<string, SnpGenotype> rawSnps)
    {
        var variants = new MetabolicVariants();
        
        // MTHFR C677T (rs1801133)
        if (rawSnps.TryGetValue("rs1801133", out var mthfr677))
        {
            variants.MTHFR_C677T = new SnpVariant(
                RsId: "rs1801133",
                GeneName: "MTHFR",
                VariantName: "C677T",
                Genotype: mthfr677.Genotype,
                ZygosityStatus: DetermineZygosity(mthfr677.Genotype, "T"),
                Impact: VariantImpact.Functional,
                FunctionalEffect: CalculateMTHFR_C677T_Effect(mthfr677.Genotype)
            );
        }
        
        // MTHFR A1298C (rs1801131)
        if (rawSnps.TryGetValue("rs1801131", out var mthfr1298))
        {
            variants.MTHFR_A1298C = new SnpVariant(
                RsId: "rs1801131",
                GeneName: "MTHFR",
                VariantName: "A1298C",
                Genotype: mthfr1298.Genotype,
                ZygosityStatus: DetermineZygosity(mthfr1298.Genotype, "C"),
                Impact: VariantImpact.Functional,
                FunctionalEffect: CalculateMTHFR_A1298C_Effect(mthfr1298.Genotype)
            );
        }
        
        // COMT Val158Met (rs4680)
        if (rawSnps.TryGetValue("rs4680", out var comt))
        {
            variants.COMT_Val158Met = new SnpVariant(
                RsId: "rs4680",
                GeneName: "COMT",
                VariantName: "Val158Met",
                Genotype: comt.Genotype,
                ZygosityStatus: DetermineZygosity(comt.Genotype, "A"),  // A = Met allele
                Impact: VariantImpact.Functional,
                FunctionalEffect: CalculateCOMT_Effect(comt.Genotype)
            );
        }
        
        // Continue for other variants...
        
        return variants;
    }
    
    private Zygosity DetermineZygosity(string genotype, string riskAllele)
    {
        var alleles = genotype.ToCharArray();
        var riskCount = alleles.Count(a => a.ToString() == riskAllele);
        
        return riskCount switch
        {
            2 => Zygosity.Homozygous,
            1 => Zygosity.Heterozygous,
            _ => Zygosity.Normal
        };
    }
    
    private double CalculateMTHFR_C677T_Effect(string genotype)
    {
        // Literature values: TT = ~30% activity, CT = ~65% activity
        return genotype switch
        {
            "TT" => 0.30,
            "CT" or "TC" => 0.65,
            _ => 1.0
        };
    }
    
    private double CalculateMTHFR_A1298C_Effect(string genotype)
    {
        // CC = ~40-50% reduction
        return genotype switch
        {
            "CC" => 0.55,
            "AC" or "CA" => 0.80,
            _ => 1.0
        };
    }
    
    private double CalculateCOMT_Effect(string genotype)
    {
        // AA (Met/Met) = 3-4x slower = 0.25-0.33x activity
        // AG (Val/Met) = intermediate
        return genotype switch
        {
            "AA" => 0.30,  // Slow COMT
            "AG" or "GA" => 0.65,
            _ => 1.0  // Fast COMT
        };
    }
    
    private string ExtractChipVersion(string commentLine)
    {
        // Parse from comments like "# chip version: v5.2.7"
        var match = Regex.Match(commentLine, @"chip version:\s*(.+)");
        return match.Success ? match.Groups[1].Value.Trim() : "Unknown";
    }
}
```

### Blood Work Profile

```csharp
public class BloodWorkProfile
{
    public DateTime TestDate { get; set; }
    public string Laboratory { get; set; }
    
    // Methylation markers
    public BloodMarker? Homocysteine { get; set; }           // Reference: 5-15 μmol/L
    public BloodMarker? MethylmalonicAcid { get; set; }      // Reference: 70-270 nmol/L (B12 status)
    public BloodMarker? SAM_SAH_Ratio { get; set; }          // Rarely tested, but valuable
    
    // Vitamin levels
    public BloodMarker? VitaminB12_Serum { get; set; }       // Reference: 200-900 pg/mL
    public BloodMarker? Folate_Serum { get; set; }           // Reference: >3 ng/mL
    public BloodMarker? Folate_RBC { get; set; }             // Reference: >140 ng/mL
    public BloodMarker? VitaminB6_PLP { get; set; }          // Reference: 20-125 nmol/L
    
    // NAD+ and metabolites
    public BloodMarker? NAD_Level { get; set; }              // Specialty test
    public BloodMarker? NAD_NADH_Ratio { get; set; }         // Redox status
    
    // Oxidative stress markers
    public BloodMarker? Glutathione_Total { get; set; }      // Reference: 888-1864 μmol/L
    public BloodMarker? Glutathione_Reduced { get; set; }
    public BloodMarker? Glutathione_Oxidized { get; set; }
    public BloodMarker? GSH_GSSG_Ratio { get; set; }
    public BloodMarker? LipidPeroxides { get; set; }
    
    // Neurotransmitter metabolites (urine typically)
    public BloodMarker? HVA { get; set; }                    // Homovanillic acid - dopamine metabolite
    public BloodMarker? VMA { get; set; }                    // Vanillylmandelic acid - NE/Epi
    public BloodMarker? HIAA_5 { get; set; }                 // 5-HIAA - serotonin metabolite
    
    // Amino acids
    public BloodMarker? Methionine { get; set; }
    public BloodMarker? Cysteine { get; set; }
    public BloodMarker? Glycine { get; set; }
    public BloodMarker? Glutamine { get; set; }
    public BloodMarker? Glutamate { get; set; }
    
    // Energy markers
    public BloodMarker? Lactate { get; set; }                // Anaerobic metabolism
    public BloodMarker? Pyruvate { get; set; }
    public BloodMarker? Lactate_Pyruvate_Ratio { get; set; } // Mitochondrial function
    
    // Inflammatory markers
    public BloodMarker? CRP_HighSensitivity { get; set; }
    public BloodMarker? IL6 { get; set; }
    
    // Standard metabolic panel
    public BloodMarker? Glucose { get; set; }
    public BloodMarker? HbA1c { get; set; }
    public BloodMarker? Insulin { get; set; }
    
    // Computed scores
    public double? OxidativeStressScore { get; private set; }
    public double? MethylationCapacityScore { get; private set; }
    public double? MitochondrialFunctionScore { get; private set; }
    
    public void CalculateScores()
    {
        OxidativeStressScore = CalculateOxidativeStress();
        MethylationCapacityScore = CalculateMethylationCapacity();
        MitochondrialFunctionScore = CalculateMitochondrialFunction();
    }
    
    private double? CalculateOxidativeStress()
    {
        // Composite score from multiple markers
        double score = 0;
        int markerCount = 0;
        
        if (GSH_GSSG_Ratio?.Value != null)
        {
            // Lower ratio = more oxidative stress
            // Normal ratio ~10-100, low <10
            score += GSH_GSSG_Ratio.Value < 10 ? 2.0 : 
                     GSH_GSSG_Ratio.Value < 30 ? 1.0 : 0.0;
            markerCount++;
        }
        
        if (CRP_HighSensitivity?.Value != null)
        {
            // >3 mg/L = high risk
            score += CRP_HighSensitivity.Value > 3.0 ? 2.0 :
                     CRP_HighSensitivity.Value > 1.0 ? 1.0 : 0.0;
            markerCount++;
        }
        
        return markerCount > 0 ? score / markerCount : null;
    }
    
    private double? CalculateMethylationCapacity()
    {
        // Based on homocysteine, B12, folate
        if (Homocysteine?.Value == null) return null;
        
        double score = 0;
        
        // Homocysteine: <7 = excellent, 7-10 = good, 10-15 = fair, >15 = poor
        score += Homocysteine.Value switch
        {
            < 7.0 => 1.0,
            < 10.0 => 0.75,
            < 15.0 => 0.5,
            _ => 0.25
        };
        
        if (VitaminB12_Serum?.Value != null)
        {
            score += VitaminB12_Serum.Value > 500 ? 1.0 :
                     VitaminB12_Serum.Value > 300 ? 0.75 : 0.5;
        }
        
        if (Folate_RBC?.Value != null)
        {
            score += Folate_RBC.Value > 600 ? 1.0 :
                     Folate_RBC.Value > 300 ? 0.75 : 0.5;
        }
        
        return score / 3.0;  // Normalize
    }
    
    private double? CalculateMitochondrialFunction()
    {
        if (Lactate_Pyruvate_Ratio?.Value == null) return null;
        
        // Normal L/P ratio: 10-20
        // Elevated >25 suggests mitochondrial dysfunction
        double score = Lactate_Pyruvate_Ratio.Value switch
        {
            < 20 => 1.0,
            < 25 => 0.75,
            < 30 => 0.5,
            _ => 0.25
        };
        
        return score;
    }
}

public record BloodMarker(
    string Name,
    double Value,
    string Unit,
    ReferenceRange Range,
    string? Status = null  // "Low", "Normal", "High", "Critical"
)
{
    public bool IsInRange => Value >= Range.Min && Value <= Range.Max;
    
    public double StandardDeviationsFromMean => 
        (Value - Range.OptimalValue) / ((Range.Max - Range.Min) / 6.0);
}

public record ReferenceRange(
    double Min,
    double Max,
    double OptimalValue
);
```

### Symptom Tracking System

```csharp
public class SymptomTracker
{
    public List<SymptomEntry> Entries { get; set; } = new();
    
    // Current symptom profile
    public Dictionary<SymptomCategory, int> CurrentSeverity { get; set; }
    
    public void RecordSymptom(Symptom symptom, int severity, DateTime? date = null)
    {
        Entries.Add(new SymptomEntry
        {
            Timestamp = date ?? DateTime.UtcNow,
            Symptom = symptom,
            Severity = severity,
            Notes = null
        });
        
        UpdateCurrentProfile();
    }
    
    public Dictionary<SymptomCategory, double> GetTrendOverPeriod(TimeSpan period)
    {
        var cutoff = DateTime.UtcNow - period;
        var recentEntries = Entries.Where(e => e.Timestamp >= cutoff);
        
        return recentEntries
            .GroupBy(e => e.Symptom.Category)
            .ToDictionary(
                g => g.Key,
                g => g.Average(e => e.Severity)
            );
    }
    
    private void UpdateCurrentProfile()
    {
        // Use last 7 days for current profile
        var recent = Entries
            .Where(e => e.Timestamp >= DateTime.UtcNow.AddDays(-7))
            .GroupBy(e => e.Symptom.Category)
            .ToDictionary(
                g => g.Key,
                g => (int)Math.Round(g.Average(e => e.Severity))
            );
            
        CurrentSeverity = recent;
    }
}

public record SymptomEntry
{
    public DateTime Timestamp { get; init; }
    public Symptom Symptom { get; init; }
    public int Severity { get; init; }  // 0-10 scale
    public string? Notes { get; init; }
}

public record Symptom(
    string Name,
    SymptomCategory Category,
    List<string> RelatedPathways  // e.g., "Methylation", "Neurotransmitters", "Energy"
);

public enum SymptomCategory
{
    // Methylation-related
    Cognitive,           // Brain fog, memory, focus
    Mood,                // Depression, anxiety, irritability
    Energy,              // Fatigue, exhaustion
    Sleep,               // Insomnia, poor sleep quality
    
    // Neurotransmitter-related
    MotorControl,        // Tremors, restlessness
    Motivation,          // Drive, initiative
    EmotionalRegulation, // Mood swings, emotional reactivity
    
    // Oxidative stress
    Inflammation,        // Joint pain, general inflammation
    Recovery,            // Post-exercise recovery, healing
    
    // Mitochondrial
    PhysicalEndurance,   // Exercise capacity
    ColdIntolerance,     // Temperature regulation
    
    // Detoxification
    ChemicalSensitivity, // Reactions to chemicals, scents
    AlcoholTolerance,    // Alcohol processing
    
    // Cardiovascular
    BloodPressure,
    HeartRateVariability,
    
    // Digestive
    Digestion,
    FoodSensitivities
}

// Predefined symptom database
public static class SymptomDatabase
{
    public static readonly List<Symptom> KnownSymptoms = new()
    {
        new Symptom("Brain Fog", SymptomCategory.Cognitive, 
            new() { "Methylation", "BH4", "Neurotransmitters" }),
        new Symptom("Fatigue", SymptomCategory.Energy, 
            new() { "Krebs Cycle", "NAD+", "Methylation" }),
        new Symptom("Anxiety", SymptomCategory.Mood, 
            new() { "Methylation", "Neurotransmitters", "BH4" }),
        new Symptom("Depression", SymptomCategory.Mood, 
            new() { "Methylation", "Neurotransmitters", "BH4" }),
        new Symptom("Insomnia", SymptomCategory.Sleep, 
            new() { "Methylation", "Neurotransmitters" }),
        new Symptom("Poor Exercise Recovery", SymptomCategory.Recovery, 
            new() { "Glutathione", "Krebs Cycle", "NAD+" }),
        new Symptom("Chemical Sensitivity", SymptomCategory.ChemicalSensitivity, 
            new() { "Glutathione", "Methylation" }),
        new Symptom("Memory Issues", SymptomCategory.Cognitive, 
            new() { "Methylation", "Neurotransmitters" }),
        new Symptom("Irritability", SymptomCategory.EmotionalRegulation, 
            new() { "Methylation", "Neurotransmitters" }),
        // Add more as needed
    };
}
```

### Dietary Profile

```csharp
public class DietaryProfile
{
    // Macro nutrient intake (averages)
    public double DailyCalories { get; set; }
    public double ProteinGramsPerDay { get; set; }
    public double CarbGramsPerDay { get; set; }
    public double FatGramsPerDay { get; set; }
    
    // Micronutrient intake (from food)
    public Dictionary<string, double> VitaminIntake { get; set; } = new();
    public Dictionary<string, double> MineralIntake { get; set; } = new();
    
    // Amino acid intake (particularly important for methylation)
    public double MethionineIntakeGrams { get; set; }
    public double GlycineIntakeGrams { get; set; }
    public double CysteineIntakeGrams { get; set; }
    
    // Dietary patterns
    public DietType DietaryPattern { get; set; }
    public List<string> Restrictions { get; set; } = new();
    
    // Methylation-specific nutrients
    public double CholineIntakeMg { get; set; }
    public double BetaineTMG_IntakeMg { get; set; }
    
    // Calculate impact on pathways
    public MethylDonorStatus CalculateMethylDonorStatus()
    {
        // Choline + betaine + methionine contribute to SAM production
        var totalMethylDonors = 
            (CholineIntakeMg / 120) +  // ~120mg choline = 1 methyl unit
            (BetaineTMG_IntakeMg / 117) +  // ~117mg TMG = 1 methyl unit
            (MethionineIntakeGrams * 6.7);  // ~1g methionine = ~6.7 methyl units
        
        return totalMethylDonors switch
        {
            < 10 => MethylDonorStatus.Deficient,
            < 20 => MethylDonorStatus.Adequate,
            _ => MethylDonorStatus.Optimal
        };
    }
}

public enum DietType
{
    Standard,
    Mediterranean,
    LowCarb,
    Ketogenic,
    Vegetarian,
    Vegan,
    Paleo,
    Carnivore
}

public enum MethylDonorStatus
{
    Deficient,
    Adequate,
    Optimal,
    Excessive
}
```

### Lifestyle Factors

```csharp
public class LifestyleFactors
{
    // Exercise
    public int WeeklyExerciseMinutes { get; set; }
    public ExerciseIntensity AverageIntensity { get; set; }
    
    // Sleep
    public double AverageSleepHours { get; set; }
    public SleepQuality SleepQuality { get; set; }
    
    // Stress
    public int StressLevel { get; set; }  // 0-10 scale
    public List<StressSource> StressSources { get; set; }
    
    // Environmental exposures
    public bool SmokingExposure { get; set; }
    public bool AlcoholConsumption { get; set; }
    public int AlcoholDrinksPerWeek { get; set; }
    public bool EnvironmentalToxinExposure { get; set; }
    
    // Calculate oxidative stress burden
    public double CalculateOxidativeStressBurden()
    {
        double burden = 0;
        
        // High-intensity exercise increases ROS
        if (WeeklyExerciseMinutes > 300 && AverageIntensity == ExerciseIntensity.High)
            burden += 1.5;
        else if (WeeklyExerciseMinutes > 150)
            burden += 0.5;
        
        // Stress increases cortisol → ROS
        burden += StressLevel * 0.2;
        
        // Sleep deprivation increases oxidative stress
        if (AverageSleepHours < 7.0)
            burden += (7.0 - AverageSleepHours) * 0.5;
        
        // Alcohol metabolism generates ROS
        burden += AlcoholDrinksPerWeek * 0.15;
        
        // Smoking/toxins
        if (SmokingExposure) burden += 2.0;
        if (EnvironmentalToxinExposure) burden += 1.0;
        
        return burden;
    }
}

public enum ExerciseIntensity
{
    Low,
    Moderate,
    High,
    VeryHigh
}

public enum SleepQuality
{
    Poor,
    Fair,
    Good,
    Excellent
}

public enum StressSource
{
    Work,
    Relationships,
    Financial,
    Health,
    Environmental,
    Other
}
```

### Risk Assessment Engine

```csharp
public class RiskAssessment
{
    public Dictionary<string, RiskScore> PathwayRisks { get; set; }
    public List<string> Recommendations { get; set; }
    public DateTime AssessmentDate { get; set; }
}

public record RiskScore(
    string PathwayName,
    double Score,  // 0-1 scale
    RiskLevel Level,
    List<RiskFactor> ContributingFactors
);

public enum RiskLevel
{
    Low,
    Moderate,
    High,
    VeryHigh
}

public record RiskFactor(
    string Name,
    double ImpactWeight,
    string Explanation
);

public class RiskAssessmentEngine
{
    public RiskAssessment Assess(PersonalizedProfile profile)
    {
        var assessment = new RiskAssessment
        {
            AssessmentDate = DateTime.UtcNow,
            PathwayRisks = new Dictionary<string, RiskScore>(),
            Recommendations = new List<string>()
        };
        
        // Assess methylation risk
        assessment.PathwayRisks["Methylation"] = AssessMethylationRisk(profile);
        
        // Assess neurotransmitter risk
        assessment.PathwayRisks["Neurotransmitters"] = AssessNeurotransmitterRisk(profile);
        
        // Assess oxidative stress risk
        assessment.PathwayRisks["OxidativeStress"] = AssessOxidativeStressRisk(profile);
        
        // Assess mitochondrial function risk
        assessment.PathwayRisks["MitochondrialFunction"] = AssessMitochondrialRisk(profile);
        
        // Generate recommendations
        assessment.Recommendations = GenerateRecommendations(assessment.PathwayRisks, profile);
        
        return assessment;
    }
    
    private RiskScore AssessMethylationRisk(PersonalizedProfile profile)
    {
        var factors = new List<RiskFactor>();
        double riskScore = 0;
        
        // Genetic factors
        var mthfr677 = profile.Genetics?.Variants?.MTHFR_C677T;
        if (mthfr677?.ZygosityStatus == Zygosity.Homozygous)
        {
            riskScore += 0.40;
            factors.Add(new RiskFactor(
                "MTHFR C677T Homozygous",
                0.40,
                "Severe reduction in folate conversion (70% reduced activity)"
            ));
        }
        else if (mthfr677?.ZygosityStatus == Zygosity.Heterozygous)
        {
            riskScore += 0.15;
            factors.Add(new RiskFactor(
                "MTHFR C677T Heterozygous",
                0.15,
                "Moderate reduction in folate conversion (35% reduced activity)"
            ));
        }
        
        var mthfr1298 = profile.Genetics?.Variants?.MTHFR_A1298C;
        if (mthfr1298?.ZygosityStatus == Zygosity.Homozygous)
        {
            riskScore += 0.25;
            factors.Add(new RiskFactor(
                "MTHFR A1298C Homozygous",
                0.25,
                "Additional reduction in MTHFR activity"
            ));
        }
        
        // Blood work factors
        if (profile.BloodMarkers?.Homocysteine?.Value > 15.0)
        {
            riskScore += 0.30;
            factors.Add(new RiskFactor(
                "Elevated Homocysteine",
                0.30,
                $"Homocysteine at {profile.BloodMarkers.Homocysteine.Value:F1} μmol/L (>15 is high risk)"
            ));
        }
        else if (profile.BloodMarkers?.Homocysteine?.Value > 10.0)
        {
            riskScore += 0.15;
            factors.Add(new RiskFactor(
                "Moderately Elevated Homocysteine",
                0.15,
                $"Homocysteine at {profile.BloodMarkers.Homocysteine.Value:F1} μmol/L (>10 warrants monitoring)"
            ));
        }
        
        if (profile.BloodMarkers?.VitaminB12_Serum?.Value < 300)
        {
            riskScore += 0.20;
            factors.Add(new RiskFactor(
                "Low B12",
                0.20,
                $"B12 at {profile.BloodMarkers.VitaminB12_Serum.Value:F0} pg/mL (<300 is suboptimal)"
            ));
        }
        
        // Dietary factors
        var methylStatus = profile.Diet?.CalculateMethylDonorStatus();
        if (methylStatus == MethylDonorStatus.Deficient)
        {
            riskScore += 0.15;
            factors.Add(new RiskFactor(
                "Insufficient Methyl Donors",
                0.15,
                "Dietary intake of choline, betaine, and methionine is below optimal"
            ));
        }
        
        // Cap at 1.0
        riskScore = Math.Min(riskScore, 1.0);
        
        var level = riskScore switch
        {
            < 0.25 => RiskLevel.Low,
            < 0.50 => RiskLevel.Moderate,
            < 0.75 => RiskLevel.High,
            _ => RiskLevel.VeryHigh
        };
        
        return new RiskScore("Methylation", riskScore, level, factors);
    }
    
    private RiskScore AssessNeurotransmitterRisk(PersonalizedProfile profile)
    {
        var factors = new List<RiskFactor>();
        double riskScore = 0;
        
        // COMT slow variant
        var comt = profile.Genetics?.Variants?.COMT_Val158Met;
        if (comt?.ZygosityStatus == Zygosity.Homozygous && comt.Genotype == "AA")
        {
            riskScore += 0.30;
            factors.Add(new RiskFactor(
                "Slow COMT (Met/Met)",
                0.30,
                "3-4x slower dopamine/NE breakdown; risk of overmethylation"
            ));
        }
        
        // Symptoms
        var symptoms = profile.Symptoms?.CurrentSeverity;
        if (symptoms != null)
        {
            if (symptoms.TryGetValue(SymptomCategory.Mood, out var moodSeverity) && moodSeverity >= 7)
            {
                riskScore += 0.25;
                factors.Add(new RiskFactor(
                    "Severe Mood Symptoms",
                    0.25,
                    "Current mood symptom severity suggests neurotransmitter imbalance"
                ));
            }
            
            if (symptoms.TryGetValue(SymptomCategory.Cognitive, out var cogSeverity) && cogSeverity >= 7)
            {
                riskScore += 0.20;
                factors.Add(new RiskFactor(
                    "Severe Cognitive Symptoms",
                    0.20,
                    "Brain fog and focus issues may indicate neurotransmitter deficiency"
                ));
            }
        }
        
        // BH4 pathway (affects serotonin/dopamine synthesis)
        var methylationRisk = AssessMethylationRisk(profile);
        if (methylationRisk.Score > 0.5)
        {
            riskScore += 0.15;
            factors.Add(new RiskFactor(
                "Impaired BH4 Recycling",
                0.15,
                "Methylation issues affect BH4 availability for neurotransmitter synthesis"
            ));
        }
        
        riskScore = Math.Min(riskScore, 1.0);
        
        var level = riskScore switch
        {
            < 0.25 => RiskLevel.Low,
            < 0.50 => RiskLevel.Moderate,
            < 0.75 => RiskLevel.High,
            _ => RiskLevel.VeryHigh
        };
        
        return new RiskScore("Neurotransmitters", riskScore, level, factors);
    }
    
    private RiskScore AssessOxidativeStressRisk(PersonalizedProfile profile)
    {
        var factors = new List<RiskFactor>();
        double riskScore = 0;
        
        // Lifestyle burden
        var oxidativeBurden = profile.Lifestyle?.CalculateOxidativeStressBurden() ?? 0;
        if (oxidativeBurden > 5.0)
        {
            riskScore += 0.35;
            factors.Add(new RiskFactor(
                "High Lifestyle Oxidative Burden",
                0.35,
                "Combination of stress, poor sleep, exercise, and exposures creating high ROS"
            ));
        }
        else if (oxidativeBurden > 3.0)
        {
            riskScore += 0.20;
            factors.Add(new RiskFactor(
                "Moderate Oxidative Burden",
                0.20,
                "Lifestyle factors contributing to oxidative stress"
            ));
        }
        
        // Blood markers
        if (profile.BloodMarkers?.GSH_GSSG_Ratio?.Value < 10.0)
        {
            riskScore += 0.40;
            factors.Add(new RiskFactor(
                "Low Glutathione Ratio",
                0.40,
                $"GSH/GSSG ratio of {profile.BloodMarkers.GSH_GSSG_Ratio.Value:F1} indicates oxidative stress"
            ));
        }
        
        if (profile.BloodMarkers?.CRP_HighSensitivity?.Value > 3.0)
        {
            riskScore += 0.25;
            factors.Add(new RiskFactor(
                "Elevated Inflammation",
                0.25,
                $"hsCRP at {profile.BloodMarkers.CRP_HighSensitivity.Value:F2} mg/L indicates inflammation"
            ));
        }
        
        // CBS variant (affects glutathione production)
        // Note: CBS upregulation can be beneficial for glutathione but reduces methylation
        
        riskScore = Math.Min(riskScore, 1.0);
        
        var level = riskScore switch
        {
            < 0.25 => RiskLevel.Low,
            < 0.50 => RiskLevel.Moderate,
            < 0.75 => RiskLevel.High,
            _ => RiskLevel.VeryHigh
        };
        
        return new RiskScore("OxidativeStress", riskScore, level, factors);
    }
    
    private RiskScore AssessMitochondrialRisk(PersonalizedProfile profile)
    {
        var factors = new List<RiskFactor>();
        double riskScore = 0;
        
        // Blood markers
        if (profile.BloodMarkers?.Lactate_Pyruvate_Ratio?.Value > 25.0)
        {
            riskScore += 0.40;
            factors.Add(new RiskFactor(
                "Elevated L/P Ratio",
                0.40,
                $"L/P ratio of {profile.BloodMarkers.Lactate_Pyruvate_Ratio.Value:F1} suggests mitochondrial dysfunction"
            ));
        }
        
        if (profile.BloodMarkers?.NAD_NADH_Ratio?.Value < 3.0)
        {
            riskScore += 0.35;
            factors.Add(new RiskFactor(
                "Low NAD+/NADH Ratio",
                0.35,
                "Reduced NAD+ availability limiting Krebs cycle function"
            ));
        }
        
        // Symptoms
        var symptoms = profile.Symptoms?.CurrentSeverity;
        if (symptoms != null)
        {
            if (symptoms.TryGetValue(SymptomCategory.Energy, out var energySeverity) && energySeverity >= 7)
            {
                riskScore += 0.25;
                factors.Add(new RiskFactor(
                    "Severe Fatigue",
                    0.25,
                    "Persistent fatigue may indicate mitochondrial energy deficit"
                ));
            }
        }
        
        riskScore = Math.Min(riskScore, 1.0);
        
        var level = riskScore switch
        {
            < 0.25 => RiskLevel.Low,
            < 0.50 => RiskLevel.Moderate,
            < 0.75 => RiskLevel.High,
            _ => RiskLevel.VeryHigh
        };
        
        return new RiskScore("MitochondrialFunction", riskScore, level, factors);
    }
    
    private List<string> GenerateRecommendations(
        Dictionary<string, RiskScore> risks,
        PersonalizedProfile profile)
    {
        var recommendations = new List<string>();
        
        // Methylation recommendations
        if (risks.TryGetValue("Methylation", out var methylationRisk))
        {
            if (methylationRisk.Score > 0.5)
            {
                if (profile.Genetics?.Variants?.MTHFR_C677T?.ZygosityStatus == Zygosity.Homozygous)
                {
                    recommendations.Add(
                        "Consider methylfolate (5-MTHF) supplementation instead of folic acid " +
                        "to bypass MTHFR enzyme bottleneck. Start with 400-800mcg daily.");
                }
                
                if (profile.BloodMarkers?.VitaminB12_Serum?.Value < 400)
                {
                    recommendations.Add(
                        "B12 supplementation recommended (methylcobalamin or hydroxocobalamin). " +
                        "Consider 1000mcg daily, retest in 3 months.");
                }
                
                if (profile.Diet?.CalculateMethylDonorStatus() == MethylDonorStatus.Deficient)
                {
                    recommendations.Add(
                        "Increase dietary methyl donors: eggs (choline), beets (betaine), " +
                        "dark leafy greens (folate). Consider TMG supplementation.");
                }
            }
        }
        
        // COMT overmethylation warning
        if (profile.Genetics?.Variants?.COMT_Val158Met?.Genotype == "AA" && 
            risks.TryGetValue("Neurotransmitters", out var ntRisk) && ntRisk.Score > 0.5)
        {
            recommendations.Add(
                "⚠️ Slow COMT variant detected. Be cautious with high-dose methylated B vitamins " +
                "(methylfolate, methylcobalamin) as they may cause anxiety/overstimulation. " +
                "Consider adding niacin (methyl sink) if taking methyl donors.");
        }
        
        // Oxidative stress recommendations
        if (risks.TryGetValue("OxidativeStress", out var oxStress) && oxStress.Score > 0.5)
        {
            recommendations.Add(
                "Address oxidative stress with glutathione precursors (NAC 600-1200mg) " +
                "or liposomal glutathione. Also consider vitamin C, E, and selenium.");
            
            if (profile.Lifestyle?.StressLevel > 7)
            {
                recommendations.Add(
                    "High stress level is major contributor to oxidative burden. " +
                    "Stress management interventions recommended (meditation, therapy, adaptogen herbs).");
            }
        }
        
        // Mitochondrial support
        if (risks.TryGetValue("MitochondrialFunction", out var mitoRisk) && mitoRisk.Score > 0.5)
        {
            recommendations.Add(
                "Support mitochondrial function with CoQ10 (100-200mg ubiquinol), " +
                "PQQ (10-20mg), and consider NMN/NR for NAD+ support (250-500mg).");
            
            if (profile.BloodMarkers?.NAD_NADH_Ratio?.Value < 3.0)
            {
                recommendations.Add(
                    "Low NAD+/NADH ratio suggests NAD+ precursor supplementation (NMN or NR) " +
                    "may be particularly beneficial. Consider combining with CD38 inhibitor (apigenin).");
            }
        }
        
        // Creatine as universal methyl-sparing strategy
        var methylationScore = risks.TryGetValue("Methylation", out var mr) ? mr.Score : 0;
        var ntScore = risks.TryGetValue("Neurotransmitters", out var ntr) ? ntr.Score : 0;
        if (methylationScore > 0.3 || ntScore > 0.3)
        {
            recommendations.Add(
                "Creatine supplementation (5g daily) can spare 70% of methyl donors " +
                "normally used for creatine synthesis, making more SAM available for " +
                "neurotransmitters and other methylation needs.");
        }
        
        return recommendations;
    }
}
```

---

## Interconnected System Architecture

### System Communication Framework

```csharp
public interface IMetabolicSubsystem
{
    string SystemName { get; }
    SystemPriority Priority { get; }
    
    // Resources this system produces
    Dictionary<string, double> GetProduction(double dt);
    
    // Resources this system needs
    Dictionary<string, double> GetDemand(double dt);
    
    // Update system state given allocated resources
    void Update(double dt, ResourceAllocation allocation);
    
    // Get current state for visualization
    SystemState GetState();
    
    // Apply regulatory signals from other systems
    void ApplyRegulation(RegulatorySignals signals);
}

public enum SystemPriority
{
    Critical = 1,    // DNA repair, basic cellular function
    Essential = 2,   // Energy production, detoxification
    Important = 3,   // Neurotransmitters, methylation
    Beneficial = 4,  // Growth, optimization
    Optional = 5     // Non-essential pathways
}

public class ResourceAllocation
{
    public Dictionary<string, double> AllocatedAmounts { get; init; }
    
    public double GetAllocation(string resourceId)
    {
        return AllocatedAmounts.TryGetValue(resourceId, out var amount) ? amount : 0.0;
    }
}

public class RegulatorySignals
{
    public double SAM_Level { get; set; }
    public double ATP_ADP_Ratio { get; set; }
    public double NAD_NADH_Ratio { get; set; }
    public double NADPH_NADP_Ratio { get; set; }
    public double ROS_Level { get; set; }
    public double CalciumLevel { get; set; }
    public double AMPKActivation { get; set; }
    public double mTORActivation { get; set; }
    
    // Hormone levels
    public double InsulinLevel { get; set; }
    public double CortisolLevel { get; set; }
}

public record SystemState(
    string SystemName,
    Dictionary<string, double> MetaboliteConcentrations,
    Dictionary<string, double> EnzymeActivities,
    Dictionary<string, double> FluxRates,
    double SystemHealth  // 0-1 score
);
```

### Resource Manager

```csharp
public class MetabolicResourceManager
{
    private readonly List<IMetabolicSubsystem> _subsystems;
    private readonly Dictionary<string, ResourcePool> _resourcePools;
    
    public MetabolicResourceManager(List<IMetabolicSubsystem> subsystems)
    {
        _subsystems = subsystems.OrderBy(s => s.Priority).ToList();
        _resourcePools = InitializeResourcePools();
    }
    
    private Dictionary<string, ResourcePool> InitializeResourcePools()
    {
        return new Dictionary<string, ResourcePool>
        {
            ["SAM"] = new ResourcePool("SAM", 100.0, 0.0, 500.0),
            ["NAD+"] = new ResourcePool("NAD+", 300.0, 0.0, 1000.0),
            ["NADPH"] = new ResourcePool("NADPH", 200.0, 0.0, 800.0),
            ["ATP"] = new ResourcePool("ATP", 5000.0, 0.0, 10000.0),
            ["Glutathione"] = new ResourcePool("Glutathione", 100.0, 0.0, 500.0),
            ["5-MTHF"] = new ResourcePool("5-MTHF", 50.0, 0.0, 200.0),
            ["BH4"] = new ResourcePool("BH4", 20.0, 0.0, 100.0),
            ["CoA"] = new ResourcePool("CoA", 40.0, 0.0, 200.0),
            ["Acetyl-CoA"] = new ResourcePool("Acetyl-CoA", 60.0, 0.0, 300.0),
            ["Alpha-Ketoglutarate"] = new ResourcePool("Alpha-Ketoglutarate", 30.0, 0.0, 150.0),
            ["Oxaloacetate"] = new ResourcePool("Oxaloacetate", 10.0, 0.0, 50.0),
            ["Cysteine"] = new ResourcePool("Cysteine", 40.0, 0.0, 200.0),
            ["Glycine"] = new ResourcePool("Glycine", 100.0, 0.0, 500.0),
            ["Methionine"] = new ResourcePool("Methionine", 30.0, 0.0, 150.0),
            ["Homocysteine"] = new ResourcePool("Homocysteine", 8.0, 0.0, 50.0),  // μmol/L
        };
    }
    
    public ResourceAllocation AllocateResources(double dt)
    {
        // Step 1: Collect all production
        foreach (var system in _subsystems)
        {
            var production = system.GetProduction(dt);
            foreach (var (resource, amount) in production)
            {
                _resourcePools[resource].Add(amount);
            }
        }
        
        // Step 2: Collect all demands (sorted by priority)
        var demands = new List<(IMetabolicSubsystem system, string resource, double amount)>();
        foreach (var system in _subsystems)
        {
            var systemDemands = system.GetDemand(dt);
            foreach (var (resource, amount) in systemDemands)
            {
                demands.Add((system, resource, amount));
            }
        }
        
        // Step 3: Allocate based on priority and availability
        var allocations = new Dictionary<string, Dictionary<string, double>>();
        
        foreach (var (system, resource, demandedAmount) in demands)
        {
            if (!allocations.ContainsKey(system.SystemName))
                allocations[system.SystemName] = new Dictionary<string, double>();
            
            var pool = _resourcePools[resource];
            var allocatedAmount = Math.Min(demandedAmount, pool.Available);
            
            allocations[system.SystemName][resource] = allocatedAmount;
            pool.Consume(allocatedAmount);
        }
        
        // Step 4: Return allocations per system
        var allocationResults = new Dictionary<string, ResourceAllocation>();
        foreach (var (systemName, resources) in allocations)
        {
            allocationResults[systemName] = new ResourceAllocation 
            { 
                AllocatedAmounts = resources 
            };
        }
        
        // Return combined allocation (simplified for interface)
        var combinedAllocation = new Dictionary<string, double>();
        foreach (var resources in allocations.Values)
        {
            foreach (var (resource, amount) in resources)
            {
                if (!combinedAllocation.ContainsKey(resource))
                    combinedAllocation[resource] = 0;
                combinedAllocation[resource] += amount;
            }
        }
        
        return new ResourceAllocation { AllocatedAmounts = combinedAllocation };
    }
    
    public Dictionary<string, double> GetResourceLevels()
    {
        return _resourcePools.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.CurrentAmount
        );
    }
    
    public Dictionary<string, ResourceUtilization> GetResourceUtilization()
    {
        return _resourcePools.ToDictionary(
            kvp => kvp.Key,
            kvp => new ResourceUtilization(
                kvp.Value.CurrentAmount,
                kvp.Value.Capacity,
                kvp.Value.CurrentAmount / kvp.Value.Capacity
            )
        );
    }
}

public class ResourcePool
{
    public string Name { get; }
    public double CurrentAmount { get; private set; }
    public double Minimum { get; }
    public double Capacity { get; }
    public double Available => CurrentAmount;
    
    public ResourcePool(string name, double initialAmount, double minimum, double capacity)
    {
        Name = name;
        CurrentAmount = initialAmount;
        Minimum = minimum;
        Capacity = capacity;
    }
    
    public void Add(double amount)
    {
        CurrentAmount = Math.Min(CurrentAmount + amount, Capacity);
    }
    
    public void Consume(double amount)
    {
        CurrentAmount = Math.Max(CurrentAmount - amount, Minimum);
    }
    
    public double PercentageFull => CurrentAmount / Capacity;
}

public record ResourceUtilization(
    double CurrentAmount,
    double Capacity,
    double UtilizationPercent
);
```

### Regulatory Network Engine

```csharp
public class RegulatoryNetworkEngine
{
    public RegulatorySignals CalculateSignals(
        Dictionary<string, double> resourceLevels,
        PersonalizedProfile profile)
    {
        var signals = new RegulatorySignals
        {
            SAM_Level = resourceLevels.GetValueOrDefault("SAM", 100.0),
            NAD_NADH_Ratio = CalculateNAD_Ratio(resourceLevels),
            NADPH_NADP_Ratio = CalculateNADPH_Ratio(resourceLevels),
            ATP_ADP_Ratio = CalculateATP_Ratio(resourceLevels),
            ROS_Level = CalculateROS_Level(profile),
            AMPKActivation = CalculateAMPK_Activation(resourceLevels),
            mTORActivation = CalculatemTOR_Activation(resourceLevels, profile)
        };
        
        // Cortisol from lifestyle stress
        signals.CortisolLevel = profile.Lifestyle?.StressLevel * 10.0 ?? 0.0;
        
        return signals;
    }
    
    private double CalculateNAD_Ratio(Dictionary<string, double> resources)
    {
        var nadPlus = resources.GetValueOrDefault("NAD+", 300.0);
        var nadh = resources.GetValueOrDefault("NADH", 100.0);
        return nadPlus / Math.Max(nadh, 1.0);
    }
    
    private double CalculateNADPH_Ratio(Dictionary<string, double> resources)
    {
        var nadph = resources.GetValueOrDefault("NADPH", 200.0);
        var nadp = resources.GetValueOrDefault("NADP+", 80.0);
        return nadph / Math.Max(nadp, 1.0);
    }
    
    private double CalculateATP_Ratio(Dictionary<string, double> resources)
    {
        var atp = resources.GetValueOrDefault("ATP", 5000.0);
        var adp = resources.GetValueOrDefault("ADP", 1000.0);
        return atp / Math.Max(adp, 1.0);
    }
    
    private double CalculateROS_Level(PersonalizedProfile profile)
    {
        var baseROS = 1.0;
        
        // Oxidative stress from lifestyle
        if (profile.Lifestyle != null)
        {
            baseROS += profile.Lifestyle.CalculateOxidativeStressBurden() * 0.2;
        }
        
        // Low glutathione increases ROS
        // (Would pull from resource levels in full implementation)
        
        return baseROS;
    }
    
    private double CalculateAMPK_Activation(Dictionary<string, double> resources)
    {
        // AMPK activated by low ATP/ADP ratio
        var atpRatio = CalculateATP_Ratio(resources);
        return atpRatio < 3.0 ? 2.0 : 1.0;
    }
    
    private double CalculatemTOR_Activation(
        Dictionary<string, double> resources,
        PersonalizedProfile profile)
    {
        // mTOR activated by amino acids, insulin, high energy
        var activation = 1.0;
        
        // High protein diet increases amino acids
        if (profile.Diet?.ProteinGramsPerDay > 150)
            activation *= 1.5;
        
        // High ATP activates mTOR
        var atpRatio = CalculateATP_Ratio(resources);
        if (atpRatio > 4.0)
            activation *= 1.3;
        
        return activation;
    }
}
```

---

## System Implementations

### 1. SAM Economy System (Methylation Hub)

```csharp
public class SAM_EconomySystem : IMetabolicSubsystem
{
    public string SystemName => "SAM Economy";
    public SystemPriority Priority => SystemPriority.Important;
    
    // Subsystems consuming SAM
    public CreatineSynthesis CreatineSynthesisPathway { get; set; }
    public NeurotransmitterMethylation NTMethylation { get; set; }
    public DNAMethylation DNAMethylationPathway { get; set; }
    public PhosphatidylcholineSynthesis PCSynthesis { get; set; }
    
    // Methionine cycle
    public double MTR_Activity { get; set; } = 1.0;      // Methionine synthase
    public double MAT_Activity { get; set; } = 1.0;      // SAM synthetase
    public double GNMT_Activity { get; set; } = 1.0;     // Glycine N-methyltransferase (methyl sink)
    
    // Current metabolite levels
    public double Methionine { get; set; } = 30.0;
    public double SAM { get; set; } = 100.0;
    public double SAH { get; set; } = 10.0;
    public double Homocysteine { get; set; } = 8.0;
    
    // Genetic modifiers
    private double _mtrModifier = 1.0;
    private double _matModifier = 1.0;
    
    public void ApplyGeneticProfile(GeneticProfile genetics)
    {
        if (genetics.Variants?.MTR_A2756G != null)
        {
            _mtrModifier = genetics.Variants.MTR_A2756G.FunctionalEffect ?? 1.0;
        }
    }
    
    public Dictionary<string, double> GetProduction(double dt)
    {
        // SAM production from methionine
        var samProduction = MAT_Activity * _matModifier * Methionine * 0.8 * dt;
        
        return new Dictionary<string, double>
        {
            ["SAM"] = samProduction
        };
    }
    
    public Dictionary<string, double> GetDemand(double dt)
    {
        return new Dictionary<string, double>
        {
            ["5-MTHF"] = 2.0 * dt,          // For methionine synthesis
            ["Vitamin B12"] = 0.1 * dt,      // MTR cofactor
            ["Methionine"] = 5.0 * dt        // From diet
        };
    }
    
    public void Update(double dt, ResourceAllocation allocation)
    {
        // Get allocated resources
        var methylfolate = allocation.GetAllocation("5-MTHF");
        var b12 = allocation.GetAllocation("Vitamin B12");
        var dietaryMethionine = allocation.GetAllocation("Methionine");
        
        // Remethylation: Homocysteine → Methionine
        var remethylationRate = MTR_Activity * _mtrModifier * 
            Math.Min(methylfolate, b12 * 10) * Homocysteine * 0.5;
        
        // SAM synthesis: Methionine → SAM
        var samSynthesisRate = MAT_Activity * _matModifier * Methionine * 0.8;
        
        // SAM consumption by various pathways
        var creatineConsumption = CreatineSynthesisPathway.ConsumeSAM(SAM, dt);
        var ntMethylationConsumption = NTMethylation.ConsumeSAM(SAM, dt);
        var dnaMethylationConsumption = DNAMethylationPathway.ConsumeSAM(SAM, dt);
        var pcSynthesisConsumption = PCSynthesis.ConsumeSAM(SAM, dt);
        
        var totalSAM_Consumption = 
            creatineConsumption + 
            ntMethylationConsumption + 
            dnaMethylationConsumption + 
            pcSynthesisConsumption;
        
        // SAM → SAH (after methylation reactions)
        var samToSAH = totalSAM_Consumption;
        
        // SAH → Homocysteine
        var sahToHomocysteine = SAH * 0.9;
        
        // Update concentrations
        Methionine += (dietaryMethionine + remethylationRate - samSynthesisRate) * dt;
        SAM += (samSynthesisRate - totalSAM_Consumption) * dt;
        SAH += (samToSAH - sahToHomocysteine) * dt;
        Homocysteine += (sahToHomocysteine - remethylationRate) * dt;
        
        // Bounds checking
        Methionine = Math.Max(0, Math.Min(Methionine, 200.0));
        SAM = Math.Max(0, Math.Min(SAM, 500.0));
        SAH = Math.Max(0, Math.Min(SAH, 50.0));
        Homocysteine = Math.Max(0, Math.Min(Homocysteine, 50.0));
    }
    
    public void ApplyRegulation(RegulatorySignals signals)
    {
        // High SAM inhibits MTHFR (upstream) and activates CBS (downstream)
        // This is handled in the methylation cycle system
        
        // GNMT acts as methyl sink when SAM is high
        if (signals.SAM_Level > 150.0)
        {
            GNMT_Activity = 2.0;  // Increase methyl disposal
        }
        else
        {
            GNMT_Activity = 1.0;
        }
    }
    
    public SystemState GetState()
    {
        var concentrations = new Dictionary<string, double>
        {
            ["Methionine"] = Methionine,
            ["SAM"] = SAM,
            ["SAH"] = SAH,
            ["Homocysteine"] = Homocysteine,
            ["SAM/SAH Ratio"] = SAM / Math.Max(SAH, 1.0)
        };
        
        var enzymes = new Dictionary<string, double>
        {
            ["MTR"] = MTR_Activity * _mtrModifier,
            ["MAT"] = MAT_Activity * _matModifier,
            ["GNMT"] = GNMT_Activity
        };
        
        var fluxes = new Dictionary<string, double>
        {
            ["Creatine Synthesis"] = CreatineSynthesisPathway.GetFlux(),
            ["NT Methylation"] = NTMethylation.GetFlux(),
            ["DNA Methylation"] = DNAMethylationPathway.GetFlux(),
            ["PC Synthesis"] = PCSynthesis.GetFlux()
        };
        
        // Health score based on SAM/SAH ratio and homocysteine
        var samSahRatio = SAM / Math.Max(SAH, 1.0);
        var healthScore = 
            (samSahRatio > 4.0 ? 1.0 : samSahRatio / 4.0) * 0.5 +
            (Homocysteine < 10.0 ? 1.0 : 10.0 / Homocysteine) * 0.5;
        
        return new SystemState(
            SystemName,
            concentrations,
            enzymes,
            fluxes,
            Math.Min(healthScore, 1.0)
        );
    }
}

public class CreatineSynthesis
{
    public double BaseConsumptionRate { get; set; } = 70.0;  // % of daily SAM
    public bool SupplementationActive { get; set; } = false;
    
    public double ConsumeSAM(double samAvailable, double dt)
    {
        if (SupplementationActive)
        {
            // Creatine supplementation reduces endogenous synthesis by ~90%
            return BaseConsumptionRate * 0.10 * dt;
        }
        
        return Math.Min(samAvailable, BaseConsumptionRate * dt);
    }
    
    public double GetFlux() => SupplementationActive ? 
        BaseConsumptionRate * 0.10 : 
        BaseConsumptionRate;
}

public class NeurotransmitterMethylation
{
    public double COMT_Activity { get; set; } = 1.0;
    public double COMT_GeneticModifier { get; set; } = 1.0;
    public double DopamineLevel { get; set; } = 50.0;
    public double NorepinephrineLevel { get; set; } = 30.0;
    
    public double ConsumeSAM(double samAvailable, double dt)
    {
        // COMT methylates catecholamines
        var methylationDemand = 
            (DopamineLevel * 0.3 + NorepinephrineLevel * 0.2) * 
            COMT_Activity * COMT_GeneticModifier * dt;
        
        return Math.Min(samAvailable, methylationDemand);
    }
    
    public double GetFlux() => 
        (DopamineLevel * 0.3 + NorepinephrineLevel * 0.2) * 
        COMT_Activity * COMT_GeneticModifier;
}

public class DNAMethylation
{
    public double DNMT_Activity { get; set; } = 1.0;
    public double BaseDemand { get; set; } = 15.0;  // % of daily SAM
    
    public double ConsumeSAM(double samAvailable, double dt)
    {
        var demand = BaseDemand * DNMT_Activity * dt;
        return Math.Min(samAvailable, demand);
    }
    
    public double GetFlux() => BaseDemand * DNMT_Activity;
}

public class PhosphatidylcholineSynthesis
{
    public double PEMT_Activity { get; set; } = 1.0;
    public double BaseDemand { get; set; } = 10.0;  // % of daily SAM
    
    public double ConsumeSAM(double samAvailable, double dt)
    {
        var demand = BaseDemand * PEMT_Activity * dt;
        return Math.Min(samAvailable, demand);
    }
    
    public double GetFlux() => BaseDemand * PEMT_Activity;
}
```

### 2. NAD+ Economy System

```csharp
public class NAD_EconomySystem : IMetabolicSubsystem
{
    public string SystemName => "NAD+ Metabolism";
    public SystemPriority Priority => SystemPriority.Essential;
    
    // NAD+ pools
    public double NAD_Plus { get; set; } = 300.0;
    public double NADH { get; set; } = 100.0;
    public double NAD_Total => NAD_Plus + NADH;
    public double NAD_Ratio => NAD_Plus / Math.Max(NADH, 1.0);
    
    // Synthesis pathways
    public double SalvagePathwayRate { get; set; } = 50.0;    // From NAM
    public double DeNovoSynthesisRate { get; set; } = 10.0;   // From tryptophan
    public double NMN_SupplementationRate { get; set; } = 0.0; // From NMN/NR supplements
    
    // Consumption pathways
    public double KrebsCycleConsumption { get; set; } = 60.0;
    public double SirtuinConsumption { get; set; } = 20.0;
    public double PARP_Consumption { get; set; } = 15.0;
    public double CD38_Consumption { get; set; } = 30.0;       // Age-related NADase
    
    // Genetic/intervention modifiers
    public double NAMPT_Activity { get; set; } = 1.0;  // Rate-limiting enzyme
    public double CD38_Inhibition { get; set; } = 1.0;  // Apigenin effect
    
    public Dictionary<string, double> GetProduction(double dt)
    {
        var totalProduction = 
            (SalvagePathwayRate * NAMPT_Activity + 
             DeNovoSynthesisRate + 
             NMN_SupplementationRate) * dt;
        
        return new Dictionary<string, double>
        {
            ["NAD+"] = totalProduction
        };
    }
    
    public Dictionary<string, double> GetDemand(double dt)
    {
        return new Dictionary<string, double>
        {
            ["Tryptophan"] = 0.5 * dt,      // For de novo synthesis
            ["Nicotinamide"] = 2.0 * dt,    // For salvage pathway
            ["ATP"] = 3.0 * dt              // For NAD+ synthesis enzymes
        };
    }
    
    public void Update(double dt, ResourceAllocation allocation)
    {
        // Production
        var production = 
            SalvagePathwayRate * NAMPT_Activity + 
            DeNovoSynthesisRate + 
            NMN_SupplementationRate;
        
        // Consumption (priority-based allocation)
        var totalConsumption = 
            KrebsCycleConsumption +          // Critical for energy
            PARP_Consumption +                // DNA repair (priority)
            SirtuinConsumption +              // Longevity pathways
            (CD38_Consumption * CD38_Inhibition);  // Wasteful consumption
        
        // If NAD+ is limited, reduce lower priority consumers
        if (totalConsumption > production)
        {
            var availableForSirtuins = NAD_Plus * 0.2;  // Reserve 20% for sirtuins
            SirtuinConsumption = Math.Min(SirtuinConsumption, availableForSirtuins);
        }
        
        // Update pools
        NAD_Plus += (production - totalConsumption) * dt;
        
        // NADH is regenerated in electron transport chain
        var nadhOxidation = NADH * 0.9 * dt;  // 90% oxidized back to NAD+
        NADH -= nadhOxidation;
        NAD_Plus += nadhOxidation;
        
        // Bounds
        NAD_Plus = Math.Max(50.0, Math.Min(NAD_Plus, 1000.0));
        NADH = Math.Max(10.0, Math.Min(NADH, 400.0));
    }
    
    public void ApplyRegulation(RegulatorySignals signals)
    {
        // Low NAD+/NADH ratio upregulates salvage pathway
        if (signals.NAD_NADH_Ratio < 2.0)
        {
            NAMPT_Activity = 1.5;
        }
        else
        {
            NAMPT_Activity = 1.0;
        }
        
        // AMPK activation (low energy) upregulates NAD+ synthesis
        if (signals.AMPKActivation > 1.5)
        {
            SalvagePathwayRate *= 1.3;
        }
    }
    
    public SystemState GetState()
    {
        var concentrations = new Dictionary<string, double>
        {
            ["NAD+"] = NAD_Plus,
            ["NADH"] = NADH,
            ["NAD+ Total"] = NAD_Total,
            ["NAD+/NADH Ratio"] = NAD_Ratio
        };
        
        var enzymes = new Dictionary<string, double>
        {
            ["NAMPT"] = NAMPT_Activity,
            ["CD38"] = CD38_Inhibition
        };
        
        var fluxes = new Dictionary<string, double>
        {
            ["Salvage Pathway"] = SalvagePathwayRate * NAMPT_Activity,
            ["De Novo Synthesis"] = DeNovoSynthesisRate,
            ["Krebs Cycle"] = KrebsCycleConsumption,
            ["Sirtuins"] = SirtuinConsumption,
            ["PARP"] = PARP_Consumption,
            ["CD38 Degradation"] = CD38_Consumption * CD38_Inhibition
        };
        
        var healthScore = Math.Min(NAD_Ratio / 4.0, 1.0);  // Optimal ratio ~4:1
        
        return new SystemState(SystemName, concentrations, enzymes, fluxes, healthScore);
    }
}
```

### 3. Glutathione System

```csharp
public class GlutathioneSystem : IMetabolicSubsystem
{
    public string SystemName => "Glutathione & Antioxidant";
    public SystemPriority Priority => SystemPriority.Essential;
    
    // Glutathione pools
    public double GSH_Reduced { get; set; } = 150.0;
    public double GSSG_Oxidized { get; set; } = 15.0;
    public double GSH_Total => GSH_Reduced + (GSSG_Oxidized * 2);
    public double GSH_GSSG_Ratio => GSH_Reduced / Math.Max(GSSG_Oxidized, 0.1);
    
    // Synthesis from transsulfuration pathway
    public double CysteineavailableFor GSH { get; set; } = 40.0;
    public double GlutamateAvailable { get; set; } = 100.0;
    public double GlycineAvailable { get; set; } = 100.0;
    
    // Enzymes
    public double GCL_Activity { get; set; } = 1.0;   // Glutamate-cysteine ligase (rate-limiting)
    public double GS_Activity { get; set; } = 1.0;    // Glutathione synthase
    public double GPx_Activity { get; set; } = 1.0;   // Glutathione peroxidase
    public double GR_Activity { get; set; } = 1.0;    // Glutathione reductase
    
    // Consumption
    public double DetoxificationLoad { get; set; } = 20.0;
    public double OxidativeStressBurden { get; set; } = 15.0;
    
    // Genetic modifiers
    public double GCLC_Modifier { get; set; } = 1.0;
    public double GPX1_Modifier { get; set; } = 1.0;
    
    public Dictionary<string, double> GetProduction(double dt)
    {
        // GSH synthesis rate
        var synthRate = Math.Min(
            Math.Min(CysteineavailableFor GSH, GlutamateAvailable),
            GlycineAvailable
        ) * GCL_Activity * GCLC_Modifier * dt;
        
        return new Dictionary<string, double>
        {
            ["Glutathione"] = synthRate
        };
    }
    
    public Dictionary<string, double> GetDemand(double dt)
    {
        return new Dictionary<string, double>
        {
            ["Cysteine"] = 10.0 * dt,
            ["Glutamate"] = 10.0 * dt,
            ["Glycine"] = 10.0 * dt,
            ["NADPH"] = 5.0 * dt,      // For glutathione reductase
            ["Selenium"] = 0.1 * dt     // For GPx cofactor
        };
    }
    
    public void Update(double dt, ResourceAllocation allocation)
    {
        // Get allocated substrates
        var cysteine = allocation.GetAllocation("Cysteine");
        var glutamate = allocation.GetAllocation("Glutamate");
        var glycine = allocation.GetAllocation("Glycine");
        var nadph = allocation.GetAllocation("NADPH");
        
        // Synthesis: Glu + Cys → γ-Glu-Cys → GSH
        var synthRate = Math.Min(
            Math.Min(cysteine, glutamate),
            glycine
        ) * GCL_Activity * GCLC_Modifier;
        
        // Consumption: GSH + ROS → GSSG
        var oxidationRate = 
            (DetoxificationLoad + OxidativeStressBurden) * 
            GPx_Activity * GPX1_Modifier;
        
        // Recycling: GSSG → 2 GSH (requires NADPH)
        var recyclingRate = Math.Min(
            GSSG_Oxidized * GR_Activity,
            nadph / 2.0  // NADPH is limiting
        );
        
        // Update pools
        GSH_Reduced += (synthRate - oxidationRate + recyclingRate * 2) * dt;
        GSSG_Oxidized += (oxidationRate / 2.0 - recyclingRate) * dt;
        
        // Bounds
        GSH_Reduced = Math.Max(20.0, Math.Min(GSH_Reduced, 500.0));
        GSSG_Oxidized = Math.Max(1.0, Math.Min(GSSG_Oxidized, 100.0));
    }
    
    public void ApplyRegulation(RegulatorySignals signals)
    {
        // High ROS upregulates GCL
        if (signals.ROS_Level > 2.0)
        {
            GCL_Activity = 1.5;
        }
        else
        {
            GCL_Activity = 1.0;
        }
        
        // High oxidative stress detected through GSH/GSSG ratio
        if (GSH_GSSG_Ratio < 10.0)
        {
            GR_Activity = 1.3;  // Upregulate recycling
        }
        
        // Calculate oxidative stress burden from lifestyle
        OxidativeStressBurden = signals.ROS_Level * 15.0;
    }
    
    public SystemState GetState()
    {
        var concentrations = new Dictionary<string, double>
        {
            ["GSH (Reduced)"] = GSH_Reduced,
            ["GSSG (Oxidized)"] = GSSG_Oxidized,
            ["Total Glutathione"] = GSH_Total,
            ["GSH/GSSG Ratio"] = GSH_GSSG_Ratio
        };
        
        var enzymes = new Dictionary<string, double>
        {
            ["GCL"] = GCL_Activity * GCLC_Modifier,
            ["GS"] = GS_Activity,
            ["GPx"] = GPx_Activity * GPX1_Modifier,
            ["GR"] = GR_Activity
        };
        
        var fluxes = new Dictionary<string, double>
        {
            ["Synthesis"] = CysteineavailableFor GSH * GCL_Activity * GCLC_Modifier,
            ["Oxidation"] = (DetoxificationLoad + OxidativeStressBurden) * GPx_Activity,
            ["Recycling"] = GSSG_Oxidized * GR_Activity
        };
        
        // Health based on GSH/GSSG ratio (normal >10, optimal >30)
        var healthScore = Math.Min(GSH_GSSG_Ratio / 30.0, 1.0);
        
        return new SystemState(SystemName, concentrations, enzymes, fluxes, healthScore);
    }
}
```

### 4. BH4 Cycle System

```csharp
public class BH4_CycleSystem : IMetabolicSubsystem
{
    public string SystemName => "BH4 Metabolism";
    public SystemPriority Priority => SystemPriority.Important;
    
    // BH4 pool
    public double BH4 { get; set; } = 20.0;
    public double BH2 { get; set; } = 2.0;  // Dihydrobiopterin (oxidized form)
    
    // Synthesis enzymes
    public double GTPCH_Activity { get; set; } = 1.0;   // GTP cyclohydrolase I (rate-limiting)
    public double PTPS_Activity { get; set; } = 1.0;
    public double SR_Activity { get; set; } = 1.0;
    
    // Recycling enzyme
    public double DHFR_Activity { get; set; } = 1.0;    // Dihydrofolate reductase (also recycles folate!)
    
    // Consumption by various systems
    public double NOS_Consumption { get; set; } = 5.0;   // Nitric oxide synthase
    public double TH_Consumption { get; set; } = 3.0;    // Tyrosine hydroxylase (dopamine)
    public double TPH_Consumption { get; set; } = 2.0;   // Tryptophan hydroxylase (serotonin)
    public double PAH_Consumption { get; set; } = 1.0;   // Phenylalanine hydroxylase
    
    // Connections to other systems
    public double StressLevel { get; set; } = 0.0;       // Increases NO demand
    public double NeurotransmitterDemand { get; set; } = 1.0;
    
    public Dictionary<string, double> GetProduction(double dt)
    {
        var synthRate = GTPCH_Activity * 10.0 * dt;  // From GTP
        
        return new Dictionary<string, double>
        {
            ["BH4"] = synthRate
        };
    }
    
    public Dictionary<string, double> GetDemand(double dt)
    {
        return new Dictionary<string, double>
        {
            ["GTP"] = 2.0 * dt,         // For BH4 synthesis
            ["NADPH"] = 1.0 * dt,       // For BH2 → BH4 recycling
            ["Oxygen"] = 5.0 * dt       // For hydroxylation reactions
        };
    }
    
    public void Update(double dt, ResourceAllocation allocation)
    {
        var gtp = allocation.GetAllocation("GTP");
        var nadph = allocation.GetAllocation("NADPH");
        
        // Synthesis: GTP → BH4 (via multiple steps)
        var synthRate = Math.Min(gtp, 10.0) * GTPCH_Activity;
        
        // Consumption by competing systems
        var totalConsumption = 
            (NOS_Consumption * (1.0 + StressLevel * 0.5)) +  // Stress increases NO
            (TH_Consumption * NeurotransmitterDemand) +
            (TPH_Consumption * NeurotransmitterDemand) +
            PAH_Consumption;
        
        // BH4 → BH2 (oxidation during use)
        var oxidationRate = totalConsumption;
        
        // BH2 → BH4 (recycling via DHFR)
        var recyclingRate = Math.Min(BH2 * DHFR_Activity, nadph);
        
        // Update pools
        BH4 += (synthRate - oxidationRate + recyclingRate) * dt;
        BH2 += (oxidationRate - recyclingRate) * dt;
        
        // Bounds
        BH4 = Math.Max(5.0, Math.Min(BH4, 100.0));
        BH2 = Math.Max(0.5, Math.Min(BH2, 20.0));
    }
    
    public void ApplyRegulation(RegulatorySignals signals)
    {
        // Stress increases cortisol → NO production
        StressLevel = signals.CortisolLevel / 100.0;
        
        // High ROS can degrade BH4
        if (signals.ROS_Level > 2.0)
        {
            DHFR_Activity = 1.3;  // Upregulate recycling
        }
    }
    
    public SystemState GetState()
    {
        var concentrations = new Dictionary<string, double>
        {
            ["BH4"] = BH4,
            ["BH2"] = BH2,
            ["BH4/BH2 Ratio"] = BH4 / Math.Max(BH2, 0.1)
        };
        
        var enzymes = new Dictionary<string, double>
        {
            ["GTPCH"] = GTPCH_Activity,
            ["DHFR"] = DHFR_Activity
        };
        
        var fluxes = new Dictionary<string, double>
        {
            ["Synthesis"] = GTPCH_Activity * 10.0,
            ["NO Production"] = NOS_Consumption * (1.0 + StressLevel * 0.5),
            ["Dopamine Synthesis"] = TH_Consumption * NeurotransmitterDemand,
            ["Serotonin Synthesis"] = TPH_Consumption * NeurotransmitterDemand,
            ["Recycling"] = BH2 * DHFR_Activity
        };
        
        // Health based on BH4 availability for all systems
        var healthScore = Math.Min(BH4 / 40.0, 1.0);
        
        return new SystemState(SystemName, concentrations, enzymes, fluxes, healthScore);
    }
}
```

I'll continue with the implementation roadmap and data flow integration in a follow-up message due to length. Would you like me to continue with:

1. Neurotransmitter system implementation
2. Krebs cycle with amino acid interconnections
3. Complete data flow architecture
4. Implementation roadmap with phase-by-phase tasks

Let me know which aspect you'd like me to dive deeper into next!