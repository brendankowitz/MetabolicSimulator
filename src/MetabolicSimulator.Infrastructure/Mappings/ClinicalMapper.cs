using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Infrastructure.Mappings;

public static class ClinicalMapper
{
    // Dictionary mapping standard lab names to specific Metabolite IDs and conversion logic
    // Value = (TargetMetaboliteId, ConversionFactor to mM)
    private static readonly Dictionary<string, (string MetaboliteId, double Factor)> _mappings = new()
    {
        // Glucose: 1 mg/dL = 0.0555 mM
        { "Fasting Glucose", ("glucose_blood", 0.0555) },
        
        // Homocysteine: 1 umol/L = 0.001 mM (since simulation uses mM)
        // Usually Hcy is reported in umol/L. 11.5 umol/L = 0.0115 mM
        { "Homocysteine", ("hcy", 0.001) },
        
        // Triglycerides (approximate as Fatty Acids/Acetyl-CoA potential for now)
        // 1 mg/dL = ~0.0113 mM (standard approximation)
        // We don't have a direct 'triglyceride' metabolite yet, mapping to Acetyl-CoA potential is complex.
        // For now, we'll map to a generic lipid pool if we add one later.
        
        // Vitamin D: Not yet in simulation, but ready for Vitamin D pathway addition
    };

    public static void ApplyLabsToPathways(List<Pathway> pathways, List<LabResult> labs)
    {
        var metaboliteLookup = new Dictionary<string, Metabolite>();
        foreach (var p in pathways)
        {
            foreach (var m in p.Metabolites)
            {
                if (!metaboliteLookup.ContainsKey(m.Id))
                    metaboliteLookup[m.Id] = m;
            }
        }

        foreach (var lab in labs)
        {
            if (_mappings.TryGetValue(lab.Name, out var mapping))
            {
                if (metaboliteLookup.TryGetValue(mapping.MetaboliteId, out var metabolite))
                {
                    // Update the INITIAL concentration based on the lab value
                    // Note: In a real C# Record, this is immutable.
                    // We need a way to mutate the simulation state initialization, not the definition.
                    // The SimulationEngine takes the Pathway definition.
                    // We need to implement a "StateInitializer" that applies these overrides.
                    
                    // For this prototype, we'll assume we can modify the property (if we change record to class or use with { })
                    // Since Metabolite is a record, we can't set it.
                    // We will return a Dictionary of Overrides instead.
                }
            }
        }
    }

    /// <summary>
    /// Returns a dictionary of [MetaboliteId] -> [Concentration mM] based on lab work.
    /// </summary>
    public static Dictionary<string, double> GetInitialConcentrations(List<LabResult> labs)
    {
        var overrides = new Dictionary<string, double>();

        foreach (var lab in labs)
        {
            if (_mappings.TryGetValue(lab.Name, out var mapping))
            {
                // Simple unit conversion
                // For more complex conversions (e.g. HbA1c to Avg Glucose), we'd need functions.
                
                if (lab.Name == "HbA1c")
                {
                    // HbA1c conversion to estimated Average Glucose (eAG)
                    // eAG (mg/dL) = (28.7 * A1c) - 46.7
                    // Then convert to mM
                    double avgGlucoseMgDl = (28.7 * lab.Value) - 46.7;
                    overrides["glucose_blood"] = avgGlucoseMgDl * 0.0555;
                }
                else
                {
                    overrides[mapping.MetaboliteId] = lab.Value * mapping.Factor;
                }
            }
        }
        return overrides;
    }
}
