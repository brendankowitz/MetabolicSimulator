using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Infrastructure.Simulation;

public static class MetabolicAdjuster
{
    /// <summary>
    /// Returns a NEW list of pathways with the UserProfile adjustments applied.
    /// Since Domain entities are immutable records, we must recreate the object graph.
    /// </summary>
    public static List<Pathway> ApplyProfile(List<Pathway> pathways, UserProfile profile)
    {
        var adjustedPathways = new List<Pathway>();

        foreach (var pathway in pathways)
        {
            // 1. Adjust Metabolites (Initial Concentrations)
            var newMetabolites = pathway.Metabolites.Select(m => 
            {
                // Age-related NAD+ decline
                if (m.Id == "nad_plus_cyto" || m.Id == "nad_plus_mito")
                {
                    return m with { InitialConcentration = m.InitialConcentration * profile.NadDeclineFactor };
                }
                
                // Age/Stress-related ROS increase (if not already handled by reaction logic)
                if (m.Id == "ros")
                {
                    return m with { InitialConcentration = m.InitialConcentration * profile.OxidativeStressMultiplier };
                }

                // Sleep Deprivation -> High Cortisol
                if (m.Id == "cortisol")
                {
                    if (profile.SleepHours < 6 || profile.SleepQuality < 60)
                    {
                        return m with { InitialConcentration = m.InitialConcentration * 1.5 }; // +50% Cortisol
                    }
                }

                return m;
            }).ToList();

            // 2. Adjust Reactions (Enzyme Vmax)
            var newReactions = pathway.Reactions.Select(r => 
            {
                // CD38 activity increases with age (draining NAD+)
                if (r.Enzyme.Id == "cd38")
                {
                    // Roughly doubles every 30 years -> linear approximation for simulation
                    double ageFactor = 1.0 + (profile.Age / 60.0); 
                    var newEnzyme = r.Enzyme with { Vmax = r.Enzyme.Vmax * ageFactor };
                    return r with { Enzyme = newEnzyme };
                }

                // Mitochondrial efficiency decline (Complex I Vmax reduction)
                if (r.Enzyme.Id == "etc_complex1")
                {
                    // 10% decline per decade after 30
                    double decline = (profile.Age > 30) ? (profile.Age - 30) * 0.01 : 0;
                    double efficiency = Math.Max(0.5, 1.0 - decline); // Floor at 50%
                    var newEnzyme = r.Enzyme with { Vmax = r.Enzyme.Vmax * efficiency };
                    return r with { Enzyme = newEnzyme };
                }

                // SLEEP IMPACTS
                // Poor sleep reduces NAMPT (NAD+ recycling)
                if (r.Enzyme.Id == "nampt")
                {
                    if (profile.SleepQuality < 70 || profile.SleepHours < 6)
                    {
                        var newEnzyme = r.Enzyme with { Vmax = r.Enzyme.Vmax * 0.7 }; // 30% reduction
                        return r with { Enzyme = newEnzyme };
                    }
                }

                // Poor sleep increases baseline Cortisol (simulated by increasing Inflammatory signaling if modeled, 
                // or here we assume Cortisol is an input metabolite, so we might need to adjust metabolite initial conc instead).
                // Actually, Cortisol is a Metabolite. We should adjust it in the metabolite section.
                // However, Urea Cycle efficiency drops with poor sleep (Glymphatic proxy)
                if (r.Enzyme.Id == "cps1" || r.Enzyme.Id == "otc")
                {
                    if (profile.SleepQuality < 60)
                    {
                        var newEnzyme = r.Enzyme with { Vmax = r.Enzyme.Vmax * 0.8 }; // Reduced clearance
                        return r with { Enzyme = newEnzyme };
                    }
                }

                return r;
            }).ToList();

            // Create new Pathway with adjusted components
            adjustedPathways.Add(pathway with 
            { 
                Metabolites = newMetabolites, 
                Reactions = newReactions 
            });
        }

        return adjustedPathways;
    }

    /// <summary>
    /// Merges multiple pathways into one unified "Human Body" pathway.
    /// Handles duplicate metabolite merging.
    /// </summary>
    public static Pathway MergePathways(List<Pathway> sourcePathways)
    {
        var allMetabolites = new Dictionary<string, Metabolite>();
        var allReactions = new List<Reaction>();

        foreach (var p in sourcePathways)
        {
            foreach (var m in p.Metabolites)
            {
                if (!allMetabolites.ContainsKey(m.Id))
                {
                    allMetabolites[m.Id] = m;
                }
                else
                {
                    // Conflict Resolution:
                    // If we see the same ID (e.g. "atp_cyto") again, we might want to ensure
                    // we don't overwrite a customized/adjusted value with a default one.
                    // For now, first-write-wins is safe if consistent.
                }
            }
            allReactions.AddRange(p.Reactions);
        }

        return new Pathway(
            "whole_body", 
            "Unified Whole Body Metabolism", 
            "Merged System of Systems", 
            allMetabolites.Values.ToList(), 
            allReactions
        );
    }
}