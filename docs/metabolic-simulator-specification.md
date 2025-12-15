# Metabolic Pathway Simulator: Technical Specification v2.0

## Table of Contents
1. [System Architecture (ODE Integration)](#system-architecture-ode-integration)
2. [PersonalizedProfile System](#personalizedprofile-system)
3. [Biochemical Logic & Math](#biochemical-logic--math)
4. [Data Persistence & Configuration](#data-persistence--configuration)
5. [Implementation Roadmap](#implementation-roadmap)

---

## System Architecture (ODE Integration)

### Core Philosophy
Unlike simple game-loop simulations (Euler integration), this system uses **Numerical Integration (RK4)** to solve the system of differential equations. This ensures stability when handling stiff reactions (fast enzyme kinetics vs. slow metabolic changes).

### Simulation Engine

```csharp
public interface ISimulationEngine
{
    // The "Heart" of the simulator
    SimulationState Step(SimulationState currentState, double dt);
}

// Represents the snapshot of all metabolite concentrations at time T
public class SimulationState
{
    public double Time { get; init; }
    public Dictionary<string, double> Metabolites { get; init; } // Key: MetaboliteID, Value: Concentration (uM)
    public Dictionary<string, double> Fluxes { get; init; }      // Key: ReactionID, Value: Rate (uM/s)
}

// Interface for all metabolic pathways (Krebs, Methylation, etc.)
public interface IMetabolicSystem
{
    // Returns dy/dt (rate of change) for each metabolite in this system
    // independent of the time step 'dt'
    void ComputeDerivatives(
        SimulationState state, 
        Dictionary<string, double> derivatives, 
        Dictionary<string, double> fluxes,
        MetabolicParameters parameters
    );
}
```

### Numerical Solver (Runge-Kutta 4)

```csharp
public class RK4Solver
{
    public SimulationState Solve(SimulationState initial, double dt, List<IMetabolicSystem> systems, MetabolicParameters params)
    {
        // k1, k2, k3, k4 calculations...
        // Weighted average to find new state
    }
}
```

---

## PersonalizedProfile System

### Genetic Profile & Strand Orientation
**Critical Update:** 23andMe reports genotypes on the **Positive (+)** strand of GRCh37. Many risk variants in literature are reported on the **Coding** strand (which may be Negative). The parser must handle strand flipping (complementary bases: A↔T, C↔G).

```csharp
public class SnpVariantDefinition
{
    public string RsId { get; set; }
    public string Gene { get; set; }
    public string RiskAllele { get; set; } // The allele as reported in literature
    public Strand Orientation { get; set; } // Plus or Minus relative to GRCh37
}

public enum Strand { Plus, Minus }

public class GeneticAnalyzer
{
    public bool HasRiskAllele(SnpGenotype rawData, SnpVariantDefinition definition)
    {
        var genotype = rawData.Genotype;
        
        // If definition is on Minus strand, flip the raw data (which is Plus) to match
        if (definition.Orientation == Strand.Minus)
        {
            genotype = DNAUtils.Complement(genotype); 
        }

        return genotype.Contains(definition.RiskAllele);
    }
}
```

---

## Biochemical Logic & Math

### Enzyme Kinetics
We replace linear rates with **Michaelis-Menten Kinetics** to model enzyme saturation.

```csharp
public static class BioMath
{
    /// <summary>
    /// Calculates reaction rate V = (Vmax * [S]) / (Km + [S])
    /// </summary>
    public static double MichaelisMenten(double vmax, double km, double substrateConc)
    {
        if (substrateConc <= 0) return 0;
        return (vmax * substrateConc) / (km + substrateConc);
    }

    /// <summary>
    /// Handles inhibition: V = Vmax_app * [S] / (Km_app + [S])
    /// </summary>
    public static double CompetitiveInhibition(double vmax, double km, double s, double i, double ki)
    {
        var kmApp = km * (1 + (i / ki));
        return (vmax * s) / (kmApp + s);
    }
}
```

### Metabolic States (Hormonal Overlay)
Enzymes are regulated by the broader body state.

```csharp
public enum MetabolicState
{
    Fed,      // High Insulin, Anabolic (Building)
    Fasted,   // High Glucagon, Catabolic (Breaking down)
    Stressed  // High Cortisol, Mobilizing
}

public class StateManager
{
    // Modifiers applied to Vmax based on state
    public double GetStateModifier(string enzymeId, MetabolicState state) 
    {
        // Example: Fasting upregulates Gluconeogenesis enzymes
        return state == MetabolicState.Fasted && IsGluconeogenic(enzymeId) ? 1.5 : 1.0;
    }
}
```

---

## Data Persistence & Configuration

### JSON Configuration
Hardcoded values are removed. All kinetic parameters are loaded from external JSON files to allow tweaking without recompilation.

**`data/enzymes.json`**
```json
[
  {
    "id": "MTHFR",
    "name": "Methylenetetrahydrofolate reductase",
    "vmax": 10.0,
    "km": 50.0,
    "substrate": "5,10-methyleneTHF",
    "inhibitors": [
      { "metabolite": "SAM", "ki": 20.0, "type": "Allosteric" }
    ]
  },
  {
    "id": "MTR",
    "vmax": 8.5,
    "km": 25.0,
    "cofactors": ["B12", "Zn"]
  }
]
```

### 23andMe Parser Logic

```csharp
public async Task<GeneticProfile> ParseAsync(string filePath)
{
    // 1. Load Raw Data
    var rawSnps = await _fileReader.Read23andMe(filePath);
    
    // 2. Load Variant Definitions (JSON)
    var definitions = await _config.LoadVariants("variants.json");
    
    // 3. Analyze
    var profile = new GeneticProfile();
    foreach(var def in definitions)
    {
        if (rawSnps.TryGetValue(def.RsId, out var snp))
        {
            if (_analyzer.HasRiskAllele(snp, def))
            {
                profile.DetectedVariants.Add(def);
                // Apply Vmax reduction penalty
                profile.EnzymeModifiers[def.TargetEnzyme] = def.ActivityPenalty; 
            }
        }
    }
    return profile;
}
```

---

## Implementation Roadmap

### Phase 1: The Core (Week 1)
1.  **Project Setup:** .NET 8 Solution with Clean Architecture (Domain, Application, Infrastructure).
2.  **Configuration:** Implement JSON loaders for Enzymes and Metabolites.
3.  **Math Engine:** Implement `RK4Solver` and `BioMath` static classes.
4.  **Unit Tests:** Verify RK4 against known simple ODEs (e.g., exponential decay).

### Phase 2: Domain Modeling (Week 2)
1.  **Pathway Definitions:** Create the C# classes implementing `IMetabolicSystem` for:
    *   `MethylationSystem` (MTHFR, MTR, MAT, CBS).
    *   `KrebsCycle` (Simplified).
2.  **Wiring:** Connect the systems via the `SimulationState` dictionary.

### Phase 3: Genetics & Personalization (Week 3)
1.  **Parser:** Implement 23andMe parser with Strand Orientation logic.
2.  **Modifiers:** Implement the logic to reduce `Vmax` based on loaded GeneticProfile.
3.  **Comparisons:** Implement "Baseline" vs "Personalized" simulation runner.

### Phase 4: CLI Prototype (Week 4)
1.  **Input:** CLI command to load a genome file.
2.  **Simulation:** Run a 10-minute simulation (virtual time).
3.  **Output:** Generate a CSV of Homocysteine levels over time.

### Phase 5: Visualization (Future)
1.  Web API and React frontend (as per original spec).
