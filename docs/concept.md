# Metabolic Pathway Simulator: Feasibility Study and Requirements Document

Building a personalized metabolic pathway simulator that integrates genetic data with supplement interventions is **technically feasible** using .NET/C# with a React frontend, though the project presents significant biochemical modeling complexity. The core technical components—ODE solving, file parsing, pathway visualization, and API integration—all have mature .NET and JavaScript library support. The primary challenges lie in accurately modeling enzyme kinetics influenced by genetic variants and curating reliable SNP-to-function mappings.

---

## Biochemical foundation: two interconnected systems

The simulator must model two deeply interconnected metabolic networks that share cofactors, regulatory signals, and metabolic intermediates.

### Krebs cycle architecture

The citric acid cycle comprises **8 enzymatic reactions** converting acetyl-CoA to CO₂ while generating reducing equivalents for ATP synthesis. Three enzymes serve as primary regulatory control points:

| Regulatory Enzyme | EC Number | Inhibitors | Activators | Cofactors |
|-------------------|-----------|------------|------------|-----------|
| Citrate synthase | 2.3.3.1 | ATP, NADH, succinyl-CoA | ADP, oxaloacetate | Mg²⁺ |
| Isocitrate dehydrogenase | 1.1.1.41 | ATP, NADH | ADP, Ca²⁺, NAD⁺ | Mn²⁺/Mg²⁺ |
| α-Ketoglutarate dehydrogenase | 1.2.4.2 | Succinyl-CoA, NADH | Ca²⁺, AMP | TPP, lipoate, FAD, NAD⁺, CoA |

**Isocitrate dehydrogenase** represents the primary rate-limiting step. The cycle requires five B-vitamin-derived cofactors: NAD⁺ (B3), FAD (B2), CoA (B5), TPP (B1), and lipoic acid. Each turn yields approximately **10 ATP equivalents** through oxidative phosphorylation of 3 NADH and 1 FADH₂.

### Methylation cycle complexity

The methylation system involves four interconnected cycles with complex feedback regulation:

**Methionine cycle** converts homocysteine back to methionine using either the folate-dependent pathway (MTR enzyme requiring B12) or the betaine-dependent bypass (BHMT enzyme). S-adenosylmethionine (SAM), synthesized from methionine by MAT enzymes, serves as the universal methyl donor for **200+ methyltransferase reactions** including DNA methylation, neurotransmitter metabolism, and creatine synthesis.

**Folate cycle** supplies methyl groups via 5-methyltetrahydrofolate (5-MTHF), produced by MTHFR from 5,10-methyleneTHF. MTHFR requires FAD as a cofactor—explaining why riboflavin (B2) supplementation benefits those with MTHFR variants.

**Transsulfuration pathway** irreversibly commits homocysteine to cysteine synthesis via CBS (B6-dependent), ultimately producing glutathione and hydrogen sulfide. SAM allosterically activates CBS while inhibiting MTHFR, creating a metabolic switch that directs homocysteine toward either remethylation or transsulfuration based on methylation status.

The critical regulatory relationship for modeling: **SAM inhibits MTHFR and activates CBS**, creating a feedback loop where high methylation status redirects homocysteine away from remethylation toward glutathione synthesis.

---

## Genetic variants that modify pathway function

### 23andMe data format specification

The raw data download provides a tab-separated text file with approximately **640,000 SNPs** on the v5 chip:

```
# rsid    chromosome    position    genotype
rs1801133    1    11856378    CT
rs4680    22    19951271    AG
```

Key parsing considerations: skip `#` comment lines, handle `--` as missing data, positions reference **GRCh37/hg19** (not GRCh38), and genotypes report the positive strand. The file size ranges from 16-21 MB uncompressed.

### Priority SNPs for methylation pathway simulation

| Gene | rsID | Variant | Functional Impact | Simulation Parameter |
|------|------|---------|-------------------|---------------------|
| MTHFR | rs1801133 | C677T | T/T: 30% residual activity; C/T: 65% | Reduce MTHFR Vmax |
| MTHFR | rs1801131 | A1298C | C/C: 40-50% reduced activity | Additional Vmax reduction |
| COMT | rs4680 | Val158Met | A/A (Met): 3-4× lower activity | Modify COMT kinetics |
| MTR | rs1805087 | A2756G | G allele: may increase activity | Adjust MTR Vmax |
| MTRR | rs1801394 | A66G | G/G: impaired B12 recycling | Reduce B12 availability factor |
| CBS | rs234706 | C699T | Variable effect on transsulfuration | Modify CBS parameters |
| BHMT | rs3733890 | G716A | Alters alternative methylation pathway | Adjust BHMT Vmax |

**MTHFR C677T** has the most robust functional data: homozygous T/T individuals show ~70% reduced enzyme activity and require methylfolate rather than folic acid for adequate 5-MTHF production. The prevalence of T/T genotype ranges from **10-20%** depending on ethnicity.

### SNP-to-function data sources

- **PharmGKB** provides the most actionable data linking genetic variants to enzyme function changes, with evidence-level classifications (1A/1B for strong clinical evidence)
- **ClinVar** offers clinical significance classifications but focuses more on pathogenic variants than functional polymorphisms
- **MyVariant.info** aggregates data from multiple sources via a unified REST API with Python/R clients
- **SNPedia** provides wiki-format annotations accessible via MediaWiki API

---

## Supplements affecting target pathways

### DoNotAge.org product catalog mapped to pathways

DoNotAge positions itself as a longevity research organization with **200,000+ customers**. Products directly relevant to Krebs/methylation simulation:

**NAD+ metabolism**: Pure NMN ($80/500mg), Pure NR ($45), Pure Apigenin ($55, CD38 inhibitor to preserve NAD+)

**Methylation support**: Pure TMG ($20, methyl donor bypassing folate pathway)

**Krebs cycle intermediates**: Ca-AKG ($49, alpha-ketoglutarate—central TCA intermediate)

**Mitochondrial function**: Pure CoQ10 ($30, electron transport chain), SIRT6Activator ($97), Pure Resveratrol ($54)

**Senolytics**: Pure Fisetin ($95), Pure Quercetin ($35), Pure Spermidine ($39)

### Supplement mechanisms for simulation modeling

| Supplement | Primary Target | Mechanism | Modeling Approach |
|------------|---------------|-----------|-------------------|
| Methylfolate | MTR substrate | Direct 5-MTHF supply, bypasses MTHFR | Increase 5-MTHF concentration |
| Methylcobalamin | MTR cofactor | Methyl donor for homocysteine remethylation | Increase B12 availability |
| TMG/Betaine | BHMT substrate | Alternative homocysteine methylation pathway | Increase BHMT flux capacity |
| Riboflavin (B2) | MTHFR cofactor | Stabilizes MTHFR enzyme, particularly for C677T | Modify MTHFR Km or stability |
| P5P (B6) | CBS, SHMT cofactor | Enables transsulfuration pathway | Increase CBS/SHMT activity |
| NMN/NR | NAD+ precursor | Increases NAD+/NADH ratio affecting Krebs flux | Increase NAD+ pool |
| CoQ10 | ETC Complex I-III | Electron carrier, affects oxidative phosphorylation | Modify ATP yield factor |
| Alpha-lipoic acid | PDH, α-KGDH | Cofactor for decarboxylation reactions | Increase enzyme activity |
| Alpha-ketoglutarate | TCA intermediate | Direct substrate, AMPK activator | Increase α-KG concentration |
| Creatine | Methyl sink | Consuming supplemental creatine spares ~40% of SAM | Reduce methylation demand |

**Genetic-supplement interactions**: The simulator should model how MTHFR C677T carriers respond differently to methylfolate vs folic acid supplementation, and how slow COMT metabolizers may experience overmethylation symptoms from high-dose methylated B vitamins.

---

## Existing tools and available APIs

### Metabolic pathway simulators

**COPASI** (open-source, desktop) provides the most comprehensive simulation capabilities including deterministic ODE solving, stochastic simulation, parameter estimation, and sensitivity analysis. It reads/writes SBML format but lacks a built-in pathway editor—typically paired with CellDesigner for model creation.

**VCell** offers web-based simulation with spatial modeling capabilities, supporting PDEs for diffusion and compartmentalized reactions. Both tools model reaction kinetics using **Michaelis-Menten**, **mass action**, and **Hill equation** formulations.

No existing tool combines genetic variant data with supplement intervention modeling for personalized simulation.

### Pathway database APIs

| Database | API Type | Best Use | Access |
|----------|----------|----------|--------|
| **Reactome** | REST (JSON) | Pathway topology, Neo4j graph queries | Free, excellent documentation |
| **WikiPathways** | OpenAPI | Open-access pathway data, GPML format | CC0 public domain |
| **KEGG** | REST | Comprehensive compounds/reactions | Academic-only, 3 req/sec limit |
| **MetaCyc** | Pathway Tools | Experimentally verified pathways | Subscription for API |

**Reactome** provides the most developer-friendly REST API with JSON responses and a Neo4j graph database backend. WikiPathways offers complete open access with monthly data releases at data.wikipathways.org.

### Compound and interaction databases

- **PubChem PUG REST API**: Free compound data (structure, properties, bioassay results)
- **DrugBank**: Comprehensive drug-drug interactions (1.3M+), requires license for full API
- **HMDB**: 41,000+ human metabolites with clinical annotations

---

## Technical implementation feasibility

### Recommended .NET libraries

| Purpose | Library | NuGet Package | License |
|---------|---------|---------------|---------|
| Linear algebra, statistics | Math.NET Numerics | `MathNet.Numerics` | MIT |
| ODE solving | Numerics.NET | `Numerics.NET` | Commercial (30-day trial) |
| SBML parsing | libSBML | `libsbmlcs` | LGPL |

**Math.NET Numerics** provides the mathematical foundation including matrix operations, numerical integration, and root-finding algorithms. For ODE solving, **Numerics.NET** offers production-grade integrators including adaptive Runge-Kutta-Fehlberg (RKF45) and CVODE for stiff systems—essential since metabolic simulations can exhibit stiffness when fast and slow reactions coexist.

Alternative: implement RK4 manually (~50 lines of C#) using Math.NET's linear algebra, suitable for non-stiff systems.

### 23andMe parsing implementation

```csharp
public async Task<Dictionary<string, SnpData>> ParseFileAsync(string filePath)
{
    var snpLookup = new Dictionary<string, SnpData>(800000);
    await foreach (var line in File.ReadLinesAsync(filePath))
    {
        if (line.StartsWith("#")) continue;
        var parts = line.Split('\t');
        if (parts.Length >= 4 && parts[3] != "--")
            snpLookup[parts[0]] = new SnpData(parts[0], parts[1], 
                int.Parse(parts[2]), parts[3]);
    }
    return snpLookup;
}
```

No existing .NET library handles 23andMe format; custom parsing is straightforward given the simple tab-delimited structure. Use `Dictionary<string, SnpData>` keyed by rsID for O(1) lookup.

### React visualization stack

**Cytoscape.js** with `react-cytoscapejs` provides the optimal solution for biological pathway visualization:
- Published in Oxford Bioinformatics journal
- Native SBGN (Systems Biology Graphical Notation) support
- Used by Reactome and Pathway Commons
- 10K+ GitHub stars with active maintenance

```jsx
import CytoscapeComponent from 'react-cytoscapejs';

function PathwayVisualization({ elements, simulationData }) {
  return (
    <CytoscapeComponent
      elements={elements}
      layout={{ name: 'cose-bilkent' }}
      stylesheet={sbgnStylesheet}
    />
  );
}
```

**SignalR** enables real-time simulation updates from server to client, essential for animated pathway visualization showing metabolite concentrations changing over time.

---

## Recommended architecture

### Clean Architecture project structure

```
MetabolicSimulator/
├── MetabolicSimulator.Domain/         # Entities: Metabolite, Enzyme, Reaction, Pathway
├── MetabolicSimulator.Application/    # Use cases, DTOs, simulation orchestration
├── MetabolicSimulator.Infrastructure/ # ODE solver, file I/O, external APIs
├── MetabolicSimulator.WebApi/         # ASP.NET Core controllers, SignalR hubs
├── MetabolicSimulator.Console/        # Phase 1 prototype
└── metabolic-simulator-ui/            # React frontend
```

**Key design principle**: The simulation engine must be completely decoupled from ASP.NET Core, enabling reuse in console, desktop, and web contexts.

```csharp
public interface ISimulationEngine
{
    SimulationResult Run(PathwayModel pathway, SimulationParameters parameters);
    IAsyncEnumerable<TimePoint> RunStreaming(PathwayModel pathway, SimulationParameters parameters);
}
```

### Console prototype vs web application

**Start with console prototype** to validate the biochemical model accuracy before investing in web infrastructure. The console app should:
- Parse 23andMe file and extract relevant SNPs
- Load Krebs/methylation pathway definitions
- Apply genetic variant effects to enzyme parameters
- Run simulation with configurable supplement interventions
- Output time-series concentration data to CSV for validation

---

## Key challenges and limitations

### Scientific accuracy challenges

**Kinetic parameter availability**: Many enzyme Km and Vmax values are poorly characterized in human tissues. SABIO-RK and BRENDA databases provide kinetic data, but values often come from in vitro studies with uncertain in vivo relevance.

**SNP effect quantification**: While MTHFR C677T has well-characterized activity reduction (~70% for T/T), most other variants lack precise quantitative functional data. The simulator must acknowledge this uncertainty.

**Supplement bioavailability**: Oral supplement doses don't translate directly to tissue concentrations. The simulator should model conceptual relative effects rather than absolute concentrations.

### Technical limitations

**Steady-state assumption**: Real metabolism operates in dynamic equilibrium affected by circadian rhythms, feeding status, and tissue-specific expression. The simulator will necessarily simplify to steady-state or short-term dynamics.

**Compartmentalization**: Methylation occurs primarily in cytosol while Krebs cycle operates in mitochondrial matrix. Full modeling would require compartmentalized transport kinetics, adding substantial complexity.

**Epistasis**: Multiple genetic variants may interact non-additively. Initial implementation should use multiplicative effects on enzyme parameters.

### Data integration challenges

**ID mapping**: Different databases use different identifiers (KEGG IDs, ChEBI, PubChem CID, UniProt). BridgeDb provides cross-reference mapping but adds complexity.

**API rate limits**: KEGG limits to 3 requests/second; PubChem to 5/second. Implement caching and consider bulk data downloads for production use.

---

## Project phases and milestones

### Phase 1: Console prototype (3-4 weeks)

**Deliverables**:
- Domain models for Metabolite, Enzyme, Reaction, Pathway
- 23andMe file parser with SNP extraction
- Basic Michaelis-Menten kinetics implementation
- RK4 ODE solver integration
- Krebs cycle model with 8 reactions
- Simplified methylation cycle (methionine cycle + MTHFR)
- Unit tests validating known biochemical relationships

**Success criteria**: Running simulation produces qualitatively correct behavior—e.g., reducing MTHFR activity increases homocysteine, adding methylfolate substrate reduces homocysteine.

### Phase 2: Genetic integration (2-3 weeks)

**Deliverables**:
- SNP effect database (JSON/SQLite) mapping rsIDs to enzyme parameter modifications
- Genetic profile loader that adjusts simulation parameters based on uploaded 23andMe data
- Enzyme inhibition models (competitive, non-competitive, allosteric)
- Validation against published MTHFR variant effects

### Phase 3: Web API and real-time simulation (3-4 weeks)

**Deliverables**:
- ASP.NET Core Web API with Clean Architecture
- SignalR hub for streaming simulation updates
- Genetic data upload endpoint with session management
- Supplement configuration API
- Basic authentication/session management

### Phase 4: React visualization MVP (3-4 weeks)

**Deliverables**:
- Cytoscape.js pathway diagram with SBGN notation
- Real-time concentration updates via SignalR
- Time-series charts showing metabolite dynamics
- Supplement selector with mechanism descriptions
- Genetic variant display panel

### Phase 5: Feature completion and polish (4-6 weeks)

**Deliverables**:
- Multiple pathway support (add transsulfuration, BH4)
- Supplement interaction warnings
- Export simulation results (CSV, PDF report)
- Pathway comparison mode (with/without variants)
- Documentation and user guide

---

## Data model specifications

### Core entities

```csharp
public record Metabolite(string Id, string Name, double InitialConcentration, string Compartment);

public record Enzyme(
    string Id, 
    string Name, 
    string EcNumber,
    double Vmax, 
    double Km, 
    List<string> Cofactors,
    List<GeneticModifier> GeneticModifiers);

public record Reaction(
    string Id,
    Enzyme Enzyme,
    List<(Metabolite, int)> Substrates,  // Metabolite + stoichiometry
    List<(Metabolite, int)> Products,
    KineticsType Kinetics);

public record GeneticModifier(
    string RsId,
    string RiskAllele,
    double HomozygousEffect,   // Multiplier for Vmax (e.g., 0.3 for 70% reduction)
    double HeterozygousEffect);
```

### Supplement intervention model

```csharp
public record SupplementIntervention(
    string SupplementId,
    string Name,
    InterventionType Type,
    string TargetId,           // Enzyme ID, metabolite ID, or cofactor
    double EffectMagnitude,    // Concentration increase, activity multiplier, etc.
    string Mechanism);

public enum InterventionType
{
    SubstrateIncrease,         // e.g., methylfolate increases 5-MTHF
    CofactorIncrease,          // e.g., riboflavin increases FAD availability
    EnzymeActivation,          // e.g., SAM activates CBS
    EnzymeInhibition,          // e.g., SAM inhibits MTHFR
    DirectMetaboliteAddition   // e.g., alpha-ketoglutarate
}
```

---

## External API integration specifications

### Reactome pathway data

```csharp
public async Task<PathwayModel> FetchKrebsCycleAsync()
{
    var client = new HttpClient { BaseAddress = new Uri("https://reactome.org/ContentService/") };
    var pathway = await client.GetFromJsonAsync<ReactomePathway>(
        "data/query/R-HSA-71403?content=all");  // TCA cycle stable ID
    return MapToPathwayModel(pathway);
}
```

### PharmGKB variant annotations

For SNP-to-enzyme-effect mapping, query PharmGKB's clinical annotations which provide structured data on how variants affect drug/supplement response, including affected genes and evidence levels.

### MyVariant.info for SNP details

```csharp
public async Task<VariantInfo> GetVariantInfoAsync(string rsId)
{
    var client = new HttpClient();
    var response = await client.GetFromJsonAsync<MyVariantResponse>(
        $"https://myvariant.info/v1/query?q={rsId}&fields=clinvar,dbsnp,snpeff");
    return ParseVariantInfo(response);
}
```

---

## Performance specifications

### Simulation performance targets

- **Pathway size**: 20-30 metabolites, 30-40 reactions
- **Timestep**: 0.01 seconds
- **Simulation duration**: 0-600 seconds (10 minutes metabolic time)
- **Target execution time**: <500ms for full simulation
- **SignalR update frequency**: Every 100ms real-time (batched timepoints)

### Memory considerations

- 23andMe data: ~800KB parsed into dictionary
- Pathway model: <1MB
- Simulation state: <10KB per timepoint
- Total session memory: <50MB per user

Enable **Intel MKL provider** for Math.NET in production for 10×+ speedup on matrix operations:

```csharp
Control.UseNativeMKL();
```

---

## Disclaimer and scope boundaries

This simulator is designed for **personal education and curiosity only**—not clinical decision-making. Key limitations to communicate to users:

- Genetic variant effects are approximations based on published research, not validated clinical predictions
- Supplement effects model conceptual mechanisms, not precise pharmacokinetics
- The simulator cannot account for individual variation in absorption, distribution, metabolism, and excretion
- Results should not replace professional medical advice

Include prominent disclaimers in the UI and require user acknowledgment before displaying personalized results.

---

## Conclusion

The metabolic pathway simulator is technically feasible with available .NET/React technologies. The **Math.NET + Numerics.NET** stack provides robust numerical computing, **Cytoscape.js** delivers publication-quality pathway visualization, and **SignalR** enables the real-time updates essential for engaging simulation display.

The primary development risk lies in biochemical model accuracy rather than technical implementation. Starting with a console prototype focused on validating Krebs and methylation cycle behavior against known biochemistry will establish a solid foundation before investing in web infrastructure. The phased approach—console → API → visualization—allows iterative validation at each stage.

For a solo developer, expect **4-6 months** to reach a functional MVP with genetic integration and basic visualization. The modular architecture enables ongoing pathway additions and refinement as understanding of supplement mechanisms evolves.