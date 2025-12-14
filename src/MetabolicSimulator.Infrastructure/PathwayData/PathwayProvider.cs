using MetabolicSimulator.Application.Interfaces;
using MetabolicSimulator.Domain.Entities;
using MetabolicSimulator.Domain.Enums;

namespace MetabolicSimulator.Infrastructure.PathwayData;

/// <summary>
/// Provides predefined metabolic pathway models.
/// </summary>
public class PathwayProvider : IPathwayProvider
{
    /// <summary>
    /// Gets the Krebs cycle (citric acid cycle) pathway model.
    /// The cycle comprises 8 enzymatic reactions with regulatory control points.
    /// </summary>
    public Pathway GetKrebsCycle()
    {
        // Define metabolites with steady-state concentrations
        var acetylCoA = new Metabolite("acetyl_coa", "Acetyl-CoA", 0.1, "mitochondria");
        var oxaloacetate = new Metabolite("oxaloacetate", "Oxaloacetate", 0.02, "mitochondria");
        var citrate = new Metabolite("citrate", "Citrate", 0.3, "mitochondria");
        var isocitrate = new Metabolite("isocitrate", "Isocitrate", 0.02, "mitochondria");
        var alphaKetoglutarate = new Metabolite("alpha_kg", "α-Ketoglutarate", 0.1, "mitochondria");
        var succinylCoA = new Metabolite("succinyl_coa", "Succinyl-CoA", 0.05, "mitochondria");
        var succinate = new Metabolite("succinate", "Succinate", 0.4, "mitochondria");
        var fumarate = new Metabolite("fumarate", "Fumarate", 0.03, "mitochondria");
        var malate = new Metabolite("malate", "Malate", 0.3, "mitochondria");
        
        // Cofactors (tracked as metabolites for inhibition/activation modeling)
        var nadPlus = new Metabolite("nad_plus", "NAD+", 1.0, "mitochondria");
        var nadh = new Metabolite("nadh", "NADH", 0.1, "mitochondria");
        var fad = new Metabolite("fad", "FAD", 0.3, "mitochondria");
        var fadh2 = new Metabolite("fadh2", "FADH₂", 0.05, "mitochondria");
        var coA = new Metabolite("coa", "CoA", 0.5, "mitochondria");
        var gtp = new Metabolite("gtp", "GTP", 0.5, "mitochondria");
        var gdp = new Metabolite("gdp", "GDP", 0.3, "mitochondria");

        var metabolites = new List<Metabolite>
        {
            acetylCoA, oxaloacetate, citrate, isocitrate, alphaKetoglutarate,
            succinylCoA, succinate, fumarate, malate,
            nadPlus, nadh, fad, fadh2, coA, gtp, gdp
        };

        // Define enzymes
        var citrateSynthase = new Enzyme(
            "cs", "Citrate Synthase", "2.3.3.1",
            Vmax: 0.05, Km: 0.01,
            Cofactors: new List<string> { "Mg2+" },
            GeneticModifiers: new List<GeneticModifier>());

        var aconitase = new Enzyme(
            "aco", "Aconitase", "4.2.1.3",
            Vmax: 0.1, Km: 0.05,
            Cofactors: new List<string> { "Fe-S cluster" },
            GeneticModifiers: new List<GeneticModifier>());

        var isocitrateDehydrogenase = new Enzyme(
            "idh", "Isocitrate Dehydrogenase", "1.1.1.41",
            Vmax: 0.03, Km: 0.02,
            Cofactors: new List<string> { "NAD+", "Mn2+/Mg2+" },
            GeneticModifiers: new List<GeneticModifier>());

        var alphaKGDehydrogenase = new Enzyme(
            "akgdh", "α-Ketoglutarate Dehydrogenase", "1.2.4.2",
            Vmax: 0.025, Km: 0.03,
            Cofactors: new List<string> { "TPP", "lipoate", "FAD", "NAD+", "CoA" },
            GeneticModifiers: new List<GeneticModifier>());

        var succinylCoASynthetase = new Enzyme(
            "scs", "Succinyl-CoA Synthetase", "6.2.1.4",
            Vmax: 0.04, Km: 0.02,
            Cofactors: new List<string> { "Mg2+" },
            GeneticModifiers: new List<GeneticModifier>());

        var succinateDehydrogenase = new Enzyme(
            "sdh", "Succinate Dehydrogenase", "1.3.5.1",
            Vmax: 0.035, Km: 0.04,
            Cofactors: new List<string> { "FAD", "Fe-S clusters" },
            GeneticModifiers: new List<GeneticModifier>());

        var fumarase = new Enzyme(
            "fum", "Fumarase", "4.2.1.2",
            Vmax: 0.08, Km: 0.01,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        var malateDehydrogenase = new Enzyme(
            "mdh", "Malate Dehydrogenase", "1.1.1.37",
            Vmax: 0.06, Km: 0.03,
            Cofactors: new List<string> { "NAD+" },
            GeneticModifiers: new List<GeneticModifier>());

        // Input/Output enzymes for steady state
        var acetylCoAInput = new Enzyme(
            "acetyl_input", "Acetyl-CoA Input", "input",
            Vmax: 0.02, Km: 100.0, // High Km = constant input rate
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        var nadhOutput = new Enzyme(
            "nadh_output", "NADH Oxidation (ETC)", "output",
            Vmax: 0.1, Km: 0.1,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        // Define reactions (8 reactions of the Krebs cycle + input/output)
        var reactions = new List<Reaction>
        {
            // 1. Citrate Synthase: Acetyl-CoA + Oxaloacetate -> Citrate + CoA
            new Reaction(
                "krebs_1", "Citrate Synthase Reaction",
                citrateSynthase,
                new List<ReactionParticipant>
                {
                    new(acetylCoA, 1),
                    new(oxaloacetate, 1)
                },
                new List<ReactionParticipant>
                {
                    new(citrate, 1),
                    new(coA, 1)
                },
                KineticsType.MichaelisMenten,
                Inhibitors: new List<string> { "nadh", "succinyl_coa" }),

            // 2. Aconitase: Citrate -> Isocitrate
            new Reaction(
                "krebs_2", "Aconitase Reaction",
                aconitase,
                new List<ReactionParticipant> { new(citrate, 1) },
                new List<ReactionParticipant> { new(isocitrate, 1) },
                KineticsType.MichaelisMenten),

            // 3. Isocitrate Dehydrogenase: Isocitrate + NAD+ -> α-KG + NADH
            new Reaction(
                "krebs_3", "Isocitrate Dehydrogenase Reaction",
                isocitrateDehydrogenase,
                new List<ReactionParticipant>
                {
                    new(isocitrate, 1),
                    new(nadPlus, 1)
                },
                new List<ReactionParticipant>
                {
                    new(alphaKetoglutarate, 1),
                    new(nadh, 1)
                },
                KineticsType.MichaelisMenten,
                Inhibitors: new List<string> { "nadh" }),

            // 4. α-Ketoglutarate Dehydrogenase: α-KG + NAD+ + CoA -> Succinyl-CoA + NADH
            new Reaction(
                "krebs_4", "α-Ketoglutarate Dehydrogenase Reaction",
                alphaKGDehydrogenase,
                new List<ReactionParticipant>
                {
                    new(alphaKetoglutarate, 1),
                    new(nadPlus, 1),
                    new(coA, 1)
                },
                new List<ReactionParticipant>
                {
                    new(succinylCoA, 1),
                    new(nadh, 1)
                },
                KineticsType.MichaelisMenten,
                Inhibitors: new List<string> { "succinyl_coa", "nadh" }),

            // 5. Succinyl-CoA Synthetase: Succinyl-CoA + GDP -> Succinate + CoA + GTP
            new Reaction(
                "krebs_5", "Succinyl-CoA Synthetase Reaction",
                succinylCoASynthetase,
                new List<ReactionParticipant>
                {
                    new(succinylCoA, 1),
                    new(gdp, 1)
                },
                new List<ReactionParticipant>
                {
                    new(succinate, 1),
                    new(coA, 1),
                    new(gtp, 1)
                },
                KineticsType.MichaelisMenten),

            // 6. Succinate Dehydrogenase: Succinate + FAD -> Fumarate + FADH2
            new Reaction(
                "krebs_6", "Succinate Dehydrogenase Reaction",
                succinateDehydrogenase,
                new List<ReactionParticipant>
                {
                    new(succinate, 1),
                    new(fad, 1)
                },
                new List<ReactionParticipant>
                {
                    new(fumarate, 1),
                    new(fadh2, 1)
                },
                KineticsType.MichaelisMenten),

            // 7. Fumarase: Fumarate -> Malate
            new Reaction(
                "krebs_7", "Fumarase Reaction",
                fumarase,
                new List<ReactionParticipant> { new(fumarate, 1) },
                new List<ReactionParticipant> { new(malate, 1) },
                KineticsType.MichaelisMenten),

            // 8. Malate Dehydrogenase: Malate + NAD+ -> Oxaloacetate + NADH
            new Reaction(
                "krebs_8", "Malate Dehydrogenase Reaction",
                malateDehydrogenase,
                new List<ReactionParticipant>
                {
                    new(malate, 1),
                    new(nadPlus, 1)
                },
                new List<ReactionParticipant>
                {
                    new(oxaloacetate, 1),
                    new(nadh, 1)
                },
                KineticsType.MichaelisMenten),

            // Input: Constant acetyl-CoA supply (from glycolysis/beta-oxidation)
            new Reaction(
                "input_acetyl", "Acetyl-CoA Input",
                acetylCoAInput,
                new List<ReactionParticipant> { new(coA, 1) },
                new List<ReactionParticipant> { new(acetylCoA, 1) },
                KineticsType.MassAction),

            // Output: NADH oxidation (ETC regenerates NAD+)
            new Reaction(
                "output_nadh", "NADH Oxidation",
                nadhOutput,
                new List<ReactionParticipant> { new(nadh, 1) },
                new List<ReactionParticipant> { new(nadPlus, 1) },
                KineticsType.MichaelisMenten)
        };

        return new Pathway(
            "krebs_cycle",
            "Krebs Cycle (Citric Acid Cycle)",
            "The citric acid cycle comprises 8 enzymatic reactions converting acetyl-CoA to CO₂ " +
            "while generating reducing equivalents (NADH, FADH₂) for ATP synthesis via oxidative phosphorylation.",
            metabolites,
            reactions);
    }

    /// <summary>
    /// Gets the methylation cycle pathway model.
    /// Includes methionine cycle, folate cycle, and MTHFR with genetic variant support.
    /// </summary>
    public Pathway GetMethylationCycle()
    {
        // Define metabolites with steady-state concentrations
        var methionine = new Metabolite("met", "Methionine", 0.03, "cytosol");
        var sam = new Metabolite("sam", "S-Adenosylmethionine (SAM)", 0.08, "cytosol");
        var sah = new Metabolite("sah", "S-Adenosylhomocysteine (SAH)", 0.02, "cytosol");
        var homocysteine = new Metabolite("hcy", "Homocysteine", 0.015, "cytosol");
        var cystathionine = new Metabolite("cysta", "Cystathionine", 0.005, "cytosol");
        var cysteine = new Metabolite("cys", "Cysteine", 0.2, "cytosol");
        
        // Folate cycle metabolites
        var thf = new Metabolite("thf", "Tetrahydrofolate (THF)", 0.02, "cytosol");
        var methyleneTHF = new Metabolite("methylene_thf", "5,10-Methylenetetrahydrofolate", 0.015, "cytosol");
        var methylTHF = new Metabolite("methyl_thf", "5-Methyltetrahydrofolate (5-MTHF)", 0.02, "cytosol");
        
        // Betaine pathway
        var betaine = new Metabolite("bet", "Betaine (TMG)", 0.1, "cytosol");
        var dimethylglycine = new Metabolite("dmg", "Dimethylglycine", 0.02, "cytosol");
        
        // ATP for reactions
        var atp_methyl = new Metabolite("atp_methyl", "ATP", 3.0, "cytosol");

        var metabolites = new List<Metabolite>
        {
            methionine, sam, sah, homocysteine, cystathionine, cysteine,
            thf, methyleneTHF, methylTHF,
            betaine, dimethylglycine,
            atp_methyl
        };

        // Define enzymes with genetic modifiers
        
        // MTHFR - Key enzyme with well-characterized variants
        // Normal Vmax should exceed MTR consumption rate for net 5-MTHF production
        var mthfr = new Enzyme(
            "mthfr", "Methylenetetrahydrofolate Reductase", "1.5.1.20",
            Vmax: 0.015, Km: 0.01,
            Cofactors: new List<string> { "FAD", "NADPH" },
            GeneticModifiers: new List<GeneticModifier>
            {
                new("rs1801133", "MTHFR", "T", 0.30, 0.65, 
                    "C677T: T/T shows ~70% reduced activity, C/T shows ~35% reduced activity"),
                new("rs1801131", "MTHFR", "C", 0.50, 0.75,
                    "A1298C: C/C shows ~50% reduced activity, A/C shows ~25% reduced activity")
            });

        // MTR (Methionine Synthase) - B12-dependent
        // Rate-limited by 5-MTHF availability
        var mtr = new Enzyme(
            "mtr", "Methionine Synthase", "2.1.1.13",
            Vmax: 0.008, Km: 0.015,
            Cofactors: new List<string> { "Methylcobalamin" },
            GeneticModifiers: new List<GeneticModifier>
            {
                new("rs1805087", "MTR", "G", 1.2, 1.1,
                    "A2756G: G allele may increase activity")
            });

        // MAT (Methionine Adenosyltransferase)
        var mat = new Enzyme(
            "mat", "Methionine Adenosyltransferase", "2.5.1.6",
            Vmax: 0.012, Km: 0.01,
            Cofactors: new List<string> { "ATP", "Mg2+" },
            GeneticModifiers: new List<GeneticModifier>());

        // SAHH (SAH Hydrolase)
        var sahh = new Enzyme(
            "sahh", "S-Adenosylhomocysteine Hydrolase", "3.3.1.1",
            Vmax: 0.015, Km: 0.008,
            Cofactors: new List<string> { "NAD+" },
            GeneticModifiers: new List<GeneticModifier>());

        // CBS - Transsulfuration pathway (commits homocysteine to cysteine synthesis)
        var cbs = new Enzyme(
            "cbs", "Cystathionine β-Synthase", "4.2.1.22",
            Vmax: 0.002, Km: 0.02,
            Cofactors: new List<string> { "PLP (B6)" },
            GeneticModifiers: new List<GeneticModifier>
            {
                new("rs234706", "CBS", "T", 0.8, 0.9,
                    "C699T: Variable effect on transsulfuration")
            });

        // CGL (Cystathionine gamma-lyase)
        var cgl = new Enzyme(
            "cgl", "Cystathionine γ-Lyase", "4.4.1.1",
            Vmax: 0.005, Km: 0.01,
            Cofactors: new List<string> { "PLP (B6)" },
            GeneticModifiers: new List<GeneticModifier>());

        // BHMT - Alternative methylation pathway (liver-specific, about 50% of remethylation in liver)
        var bhmt = new Enzyme(
            "bhmt", "Betaine-Homocysteine Methyltransferase", "2.1.1.5",
            Vmax: 0.002, Km: 0.02,
            Cofactors: new List<string> { "Zn2+" },
            GeneticModifiers: new List<GeneticModifier>
            {
                new("rs3733890", "BHMT", "A", 0.7, 0.85,
                    "G716A: Alters alternative methylation pathway efficiency")
            });

        // COMT - Major methyl consumer
        var comt = new Enzyme(
            "comt", "Catechol-O-Methyltransferase", "2.1.1.6",
            Vmax: 0.01, Km: 0.02,
            Cofactors: new List<string> { "Mg2+", "SAM" },
            GeneticModifiers: new List<GeneticModifier>
            {
                new("rs4680", "COMT", "A", 0.30, 0.65,
                    "Val158Met: A/A (Met/Met) has 3-4× lower activity")
            });

        // SHMT - Serine hydroxymethyltransferase
        var shmt = new Enzyme(
            "shmt", "Serine Hydroxymethyltransferase", "2.1.2.1",
            Vmax: 0.01, Km: 0.015,
            Cofactors: new List<string> { "PLP (B6)", "THF" },
            GeneticModifiers: new List<GeneticModifier>());

        // Input/Output enzymes for steady state
        var methionineInput = new Enzyme(
            "met_input", "Methionine Input (Diet)", "input",
            Vmax: 0.003, Km: 100.0,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        var thfInput = new Enzyme(
            "thf_input", "THF Input (Folate Diet)", "input",
            Vmax: 0.002, Km: 100.0,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        var cysteineOutput = new Enzyme(
            "cys_output", "Cysteine Utilization", "output",
            Vmax: 0.01, Km: 0.1,
            Cofactors: new List<string>(),
            GeneticModifiers: new List<GeneticModifier>());

        // Define reactions
        var reactions = new List<Reaction>
        {
            // Methionine Cycle
            // 1. MAT: Methionine + ATP -> SAM
            new Reaction(
                "methyl_1", "Methionine to SAM",
                mat,
                new List<ReactionParticipant>
                {
                    new(methionine, 1),
                    new(atp_methyl, 1)
                },
                new List<ReactionParticipant> { new(sam, 1) },
                KineticsType.MichaelisMenten),

            // 2. Methyltransferases (represented by COMT): SAM -> SAH
            new Reaction(
                "methyl_2", "SAM Methylation (COMT)",
                comt,
                new List<ReactionParticipant> { new(sam, 1) },
                new List<ReactionParticipant> { new(sah, 1) },
                KineticsType.MichaelisMenten),

            // 3. SAHH: SAH -> Homocysteine
            new Reaction(
                "methyl_3", "SAH to Homocysteine",
                sahh,
                new List<ReactionParticipant> { new(sah, 1) },
                new List<ReactionParticipant> { new(homocysteine, 1) },
                KineticsType.MichaelisMenten),

            // 4. MTR: Homocysteine + 5-MTHF -> Methionine + THF (B12-dependent)
            new Reaction(
                "methyl_4", "Homocysteine Remethylation (MTR)",
                mtr,
                new List<ReactionParticipant>
                {
                    new(homocysteine, 1),
                    new(methylTHF, 1)
                },
                new List<ReactionParticipant>
                {
                    new(methionine, 1),
                    new(thf, 1)
                },
                KineticsType.MichaelisMenten),

            // Folate Cycle
            // 5. SHMT: THF -> 5,10-Methylene-THF
            new Reaction(
                "folate_1", "THF to Methylene-THF",
                shmt,
                new List<ReactionParticipant> { new(thf, 1) },
                new List<ReactionParticipant> { new(methyleneTHF, 1) },
                KineticsType.MichaelisMenten),

            // 6. MTHFR: 5,10-Methylene-THF -> 5-MTHF (KEY REACTION)
            new Reaction(
                "folate_2", "MTHFR Reaction",
                mthfr,
                new List<ReactionParticipant> { new(methyleneTHF, 1) },
                new List<ReactionParticipant> { new(methylTHF, 1) },
                KineticsType.MichaelisMenten,
                Inhibitors: new List<string> { "sam" },  // SAM inhibits MTHFR
                Ki: 0.1),

            // Betaine Pathway
            // 7. BHMT: Homocysteine + Betaine -> Methionine + DMG
            new Reaction(
                "betaine_1", "BHMT Pathway",
                bhmt,
                new List<ReactionParticipant>
                {
                    new(homocysteine, 1),
                    new(betaine, 1)
                },
                new List<ReactionParticipant>
                {
                    new(methionine, 1),
                    new(dimethylglycine, 1)
                },
                KineticsType.MichaelisMenten),

            // Transsulfuration Pathway
            // 8. CBS: Homocysteine -> Cystathionine (B6-dependent)
            new Reaction(
                "transsulf_1", "CBS Reaction",
                cbs,
                new List<ReactionParticipant> { new(homocysteine, 1) },
                new List<ReactionParticipant> { new(cystathionine, 1) },
                KineticsType.MichaelisMenten),

            // 9. CGL: Cystathionine -> Cysteine
            new Reaction(
                "transsulf_2", "CGL Reaction",
                cgl,
                new List<ReactionParticipant> { new(cystathionine, 1) },
                new List<ReactionParticipant> { new(cysteine, 1) },
                KineticsType.MichaelisMenten),

            // Input/Output reactions for steady state
            // Methionine input (dietary intake)
            new Reaction(
                "input_met", "Dietary Methionine Input",
                methionineInput,
                new List<ReactionParticipant>(),
                new List<ReactionParticipant> { new(methionine, 1) },
                KineticsType.MassAction),

            // THF input (folate from diet)
            new Reaction(
                "input_thf", "Dietary Folate Input",
                thfInput,
                new List<ReactionParticipant>(),
                new List<ReactionParticipant> { new(thf, 1) },
                KineticsType.MassAction),

            // Cysteine output (used for glutathione, protein synthesis)
            new Reaction(
                "output_cys", "Cysteine Utilization",
                cysteineOutput,
                new List<ReactionParticipant> { new(cysteine, 1) },
                new List<ReactionParticipant>(),
                KineticsType.MichaelisMenten)
        };

        return new Pathway(
            "methylation_cycle",
            "Methylation Cycle",
            "The methylation system involves interconnected cycles: the methionine cycle, folate cycle, " +
            "betaine pathway, and transsulfuration pathway. SAM serves as the universal methyl donor, " +
            "and the system is regulated by feedback mechanisms where SAM inhibits MTHFR and activates CBS.",
            metabolites,
            reactions);
    }

    /// <summary>
    /// Gets both Krebs and methylation cycles as a combined pathway.
    /// </summary>
    public Pathway GetCombinedPathway()
    {
        var krebs = GetKrebsCycle();
        var methylation = GetMethylationCycle();

        return new Pathway(
            "combined_krebs_methylation",
            "Combined Krebs and Methylation Cycles",
            "Combined pathway model including both the citric acid cycle (Krebs cycle) and the " +
            "methylation system with their shared cofactors and regulatory relationships.",
            krebs.Metabolites.Concat(methylation.Metabolites).ToList(),
            krebs.Reactions.Concat(methylation.Reactions).ToList());
    }
}
