using MetabolicSimulator.Domain.Entities;

namespace MetabolicSimulator.Infrastructure.Diagnostics;

public record DiagnosticIssue(string MetaboliteOrPathway, string Severity, string Message, string PotentialFix);

public class MetabolicAnalyzer
{
    public static List<DiagnosticIssue> Analyze(SimulationResult result)
    {
        var issues = new List<DiagnosticIssue>();
        var finalState = result.GetFinalConcentrations();
        var initialState = result.TimePoints.First().Concentrations;

        // 1. Energy Analysis (ATP Crash)
        // ATP < 2.0 mM is critical energy failure
        if (finalState.TryGetValue("atp_cyto", out var atp))
        {
            if (atp < 1.0)
            {
                issues.Add(new DiagnosticIssue(
                    "Energy Metabolism", 
                    "CRITICAL", 
                    $"ATP crashed to {atp:F3} mM. The cell is effectively dead.", 
                    "Increase Glycolysis input (Glucose) or reduce ATP consumption (Hexokinase/PFK-1 inhibition)."
                ));
            }
            else if (atp < 2.0)
            {
                issues.Add(new DiagnosticIssue(
                    "Energy Metabolism", 
                    "WARNING", 
                    $"Low ATP ({atp:F3} mM). Mitochondrial output insufficient for demand.", 
                    "Check Acetyl-CoA supply or NAD+ availability."
                ));
            }
        }

        // 2. Methylation Blockages (The "Traffic Jam" Check)
        // If Homocysteine is high but Methionine is low -> Methylation Block
        // If SAH is high -> Methyltransferase Block (COMT/DNMT)
        if (finalState.TryGetValue("hcy", out var hcy) && finalState.TryGetValue("met", out var met))
        {
            if (hcy > 0.015) // High Hcy
            {
                if (finalState.TryGetValue("methyl_thf", out var mthf) && mthf < 0.01)
                {
                    issues.Add(new DiagnosticIssue(
                        "Methylation", 
                        "WARNING", 
                        "High Homocysteine due to 'Folate Trap' (Low 5-MTHF).", 
                        "Check MTHFR activity or supplement Methylfolate."
                    ));
                }
                else
                {
                    issues.Add(new DiagnosticIssue(
                        "Methylation", 
                        "WARNING", 
                        "High Homocysteine despite adequate Folate. B12 (MTR) bottleneck suspected.", 
                        "Check MTR genetics or B12 status."
                    ));
                }
            }
        }

        // 3. Mitochondrial Health (NAD+ Ratio)
        if (finalState.TryGetValue("nad_plus_mito", out var nad) && finalState.TryGetValue("nadh_mito", out var nadh))
        {
            var ratio = nad / Math.Max(nadh, 0.0001);
            if (ratio < 3.0)
            {
                issues.Add(new DiagnosticIssue(
                    "Mitochondria", 
                    "WARNING", 
                    $"Low NAD+/NADH Ratio ({ratio:F1}). The Electron Transport Chain is backed up.", 
                    "Increase Complex I (ETC) activity or reduce Caloric Intake."
                ));
            }
        }

        // 4. Starvation Detection (What ran out?)
        foreach (var kvp in finalState)
        {
            if (kvp.Value < 0.0001 && initialState.GetValueOrDefault(kvp.Key) > 0.1)
            {
                // Only report if it started high and crashed to zero
                issues.Add(new DiagnosticIssue(
                    kvp.Key,
                    "INFO",
                    $"{kvp.Key} was completely depleted.",
                    $"Increase supply of {kvp.Key} or check upstream enzymes."
                ));
            }
        }

        return issues;
    }
}
