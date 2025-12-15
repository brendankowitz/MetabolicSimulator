# DigitalMe: Visual Interface & Interaction Specification

## 1. Vision
**DigitalMe** is a personal bio-simulation interface that transforms complex metabolic data into an intuitive, living visualization. It bridges the gap between "scientific data" and "human experience," allowing users to visualize their own biology, interact with it via interventions (supplements, lifestyle), and drill down from a whole-body view to molecular kinetics.

---

## 2. Core Experience: The "Living Mannequin" (Top Level)

### 2.1 Visual Metaphor
*   **Anatomical HUD:** A modern, stylized human outline (glass/wireframe aesthetic).
*   **System Nodes:** Glowing interactive zones representing key physiological systems, placed anatomically:
    *   **Brain:** Neurotransmitters (Dopamine, Serotonin), Cognitive function.
    *   **Thyroid/Throat:** Hormonal regulation (TSH, T3/T4) - Global metabolic rate control.
    *   **Heart:** Cardiovascular transport, Pulse pressure.
    *   **Liver:** Methylation hub, Detoxification (Phase I/II), Glycogen storage, Urea Cycle (Ammonia detox), Gluconeogenesis.
    *   **Gut:** Microbiome inputs, Absorption efficiency.
    *   **Muscle:** Energy demand (ATP), Glycolysis, Beta-Oxidation (Fat burning), Mitochondrial biogenesis.
    *   **Adipose:** Lipid storage, Leptin signaling.
    *   **Cellular Control:** mTOR (Growth) vs. AMPK (Repair/Autophagy) switches.
*   **Vital Flux:** Animated "veins" or connection lines showing resource flow (Oxygen, Glucose, Methyl groups).
    *   *Pulse Speed:* Metabolic Rate / Flux.
    *   *Color Coding:* 
        *   🔵 Blue/Green: Homeostasis / Optimal.
        *   🟠 Orange: Strain / Compensatory mechanisms active.
        *   🔴 Red: Inflammation / Bottleneck / Failure.

### 2.2 Dashboard Overlays
*   **KPI Floaters:** Key stats hovering near relevant organs (e.g., "Liver Fat: 3%", "Brain NAD+: Optimal").
*   **The "Health Assistant" Panel:**
    *   **Status:** "System is adapting to new inputs..." vs. "Homeostasis Reached."
    *   **Alerts:** "Warning: Glutathione depletion in liver detected."
    *   **Recommendations:** "Increase Glycine to support detoxification." (Actionable button: "Simulate +1g Glycine").

## 3. Data Ingestion: "The Quantified Self"
Before simulation begins, the Digital Twin initializes using real-world data:
*   **Genetics:** Import raw 23andMe/AncestryDNA files (TXT/ZIP).
    *   *System Action:* Parses SNPs (e.g., MTHFR C677T) and permanently adjusts Enzyme $V_{max}$ parameters.
*   **Bloodwork:** Manual entry or PDF upload of lab results.
    *   *Mapped Biomarkers:* Glucose, HbA1c, Homocysteine, Triglycerides, Vitamin D, CRP.
    *   *System Action:* Overrides initial metabolite concentrations ($[S]_0$) to match clinical reality.
*   **Wearables (Future):** Integration with Apple Health / Oura.
    *   *Inputs:* Daily Steps (ATP Demand), Sleep Score (Cortisol/Melatonin baseline), HRV (Stress multiplier).
*   **Daily Routine (New):** A "Day in the Life" scheduler.
    *   *Inputs:* Wake time, Meal times (and composition), Exercise windows, Sleep time.
    *   *Function:* Transforms the simulation from a static snapshot into a 24-hour dynamic movie, triggering state changes (Fasted -> Fed -> Stressed -> Recovering) automatically.

### 3.1 Future Integrations (Automated Inputs)
*   **Wearable Sync (Apple Health / Oura):** 
    *   *Mechanism:* Automatically generates the `schedule.json` based on actual sleep/wake times and workout heart rate zones detected by the device.
    *   *Value:* Removes manual entry; simulation evolves daily with your actual lifestyle.
*   **AI Diet Logging (Gemini Vision):**
    *   *Mechanism:* User snaps a photo of their meal -> Gemini Multimodal API estimates Macros (Glucose/Fat/Protein g) -> System generates a specific `Meal` event payload.
    *   *Value:* High-fidelity nutritional inputs without tedious weighing/tracking.

---

## 4. Interactive Controls

### 4.1 Intervention Bar ("The Pharmacy")
*   **Drag-and-Drop:** Users can drag items onto the mannequin.
    *   *Supplements:* Ca-AKG, NMN, Methylfolate, Creatine.
    *   *Dietary:* "High Protein Meal", "Fast 16h".
    *   *Stressors:* "Sprint Interval", "Poor Sleep".
*   **Dosage Slider:** Adjust amounts (e.g., 500mg vs 1g NMN) and see the system react in real-time.

### 4.2 Therapeutic Interventions (Lifestyle & Hormesis)
Beyond pills, the Digital Twin models physical therapies by mapping their physiological mechanisms to kinetic parameters:

*   **Red Light Therapy (Photobiomodulation):**
    *   *Mechanism:* Photons absorbed by Cytochrome C Oxidase (Complex IV) in mitochondria.
    *   *Sim Effect:* Increases ETC efficiency (Complex I-IV $V_{max}$ multiplier) -> Boosts ATP production without increasing Glucose demand.
*   **Sauna (Heat Stress):**
    *   *Mechanism:* Heat Shock Protein activation, Nrf2 pathway (Antioxidant response), cardiovascular load.
    *   *Sim Effect:*
        *   Acute: Mild ATP drain (cardiac load).
        *   Adaptive: Increases $V_{max}$ of Antioxidant enzymes (`gpx`, `gr`) and Heat Shock Proteins (chaperones preventing protein misfolding).
*   **Massage / Lymphatic Work:**
    *   *Mechanism:* Parasympathetic activation, mechanical waste clearance.
    *   *Sim Effect:* Reduces `cortisol` levels; Increases clearance rate of `lactate`, `ammonia`, and metabolic waste.
*   **Cold Plunge:**
    *   *Mechanism:* Norepinephrine spike, Brown Adipose Tissue (BAT) activation.
    *   *Sim Effect:* Massively increases `fat_metabolism` $V_{max}$ (thermogenesis); Transiently spikes stress markers followed by improved baseline.

### 4.3 Common Substances & Social Inputs
*   **Caffeine:**
    *   *Mechanism:* Adenosine antagonism (neuro), CYP1A2 metabolism (liver).
    *   *Sim Effect:*
        *   Transiently increases metabolic rate (ATP demand).
        *   Triggers "Sympathetic" state: Increases `cortisol` and `glucose` release (Glycogenolysis).
        *   Promotes Lipid mobilization (`fatty_acids_blood` increase).
*   **Alcohol (Ethanol):**
    *   *Mechanism:* Alcohol Dehydrogenase (ADH) pathway.
    *   *Sim Effect (CRITICAL):*
        *   **NAD+ Crash:** Metabolism converts Ethanol -> Acetaldehyde -> Acetate, consuming massive amounts of NAD+ (converting it to NADH).
        *   **Fat Loss Block:** High NADH/NAD+ ratio inhibits Beta-Oxidation (liver stops burning fat to burn booze).
        *   **Toxicity:** Accumulation of `acetaldehyde` (if ALDH enzyme is slow/saturated) -> Increases `ros` and inflammation.

### 4.4 Time & State Control
*   **Time Warp:** Toggle between "Real-time" simulation and "Project 3 Months" (to see accumulation effects like tissue NAD+ levels).
*   **Circadian Slider:** Slider for Day/Night cycle (07:00 -> 23:00).
    *   *Visual:* Background darkens, Melatonin pathway lights up, Cortisol drops.
    *   *Mechanism:* Modifies enzyme activity multipliers based on time-of-day curves.
*   **Stress Test Button:** "Run Sprint" mode to test metabolic flexibility (how fast can ATP recover?).

### 4.5 Subjective Calibration (The Feedback Loop)
*   **Mood/Stress Input:**
    *   *Input:* User rates "Current Stress" (1-10) and "Energy" (1-10).
    *   *System Action (Calibration):* The engine compares this to the calculated *Predicted State* (based on ATP/Cortisol).
    *   *Learning:* If Prediction != Reality, the system adjusts sensitivity parameters (e.g., Cortisol Tolerance Factor) in `profile.json` to "learn" the user's specific baseline.

---

## 5. Drill-Down Architecture (Zoom Levels)

### Level 1: System Topology ("The Subway Map")
*   **View:** 2D schematic of a specific organ's pathways (e.g., The Krebs Cycle interacting with the Urea Cycle in the Liver).
*   **Nodes:** Metabolites (Circles) and Enzymes (Rectangles).
*   **Edges:** Reactions. Thickness = Flux rate.
*   **Interaction:** 
    *   Hover over *MTHFR* to see "Activity: 30% (Genetic Variant)".
    *   Hover over *ATP* to see instantaneous concentration.

### Level 2: Molecular Kinetics ("The Engine Room")
*   **View:** Detailed physics view of a single reaction.
*   **Visual:** Animation of Enzyme saturation (Michaelis-Menten curve visualization).
*   **Data:** $V_{max}$, $K_m$, $[S]$, and $[I]$ (Inhibitor) charts updating live.
*   **Purpose:** Education and verifying scientific accuracy.

### Level 3: The Data Grid ("Source of Truth")
*   **View:** Raw tabular data / JSON inspector.
*   **Content:**
    *   Exact numerical values (Concentration, Flux).
    *   Differential Equations used.
    *   **Citations:** "Kinetic parameter source: BRENDA Database / PubMed ID 12345."
*   **Function:** Fact-checking, exporting data, and advanced parameter tuning.

---

## 5. Technical Requirements

### 5.1 Frontend (Visualization)
*   **Framework:** React.
*   **3D/2D Graphics:** 
    *   *Three.js / React Three Fiber:* For the top-level Anatomical Mannequin.
    *   *React Flow / D3.js:* For the interactive Pathway ("Subway") Maps.
*   **Charting:** Chart.js or Recharts for real-time telemetry.

### 5.2 Backend (Simulation Engine)
*   **Engine:** Existing C# .NET Core Engine (RK4 Solver).
*   **API Layer:** Must expose a **WebSocket / SignalR** stream.
    *   *Current State:* The engine calculates `t+1` and pushes the state to the frontend immediately, rather than writing to CSV.
    *   *Input Handling:* Receives "Add Supplement" events via API and modifies the running simulation state (`Vmax` or `Concentration` overrides).

---

## 6. Relevant Research & References
*   **Systems Biology:** *Kitano, H. (2002). Systems biology: a brief overview. Science.* (Foundation for pathway interaction).
*   **Metabolic Networks:** *Palsson, B. Ø. (2006). Systems biology: properties of reconstructed networks.*
*   **Aging & NAD+:** *Sinclair, D. A. et al.* (Dynamics of NAD+ decline and CD38).
*   **Personalized Medicine:** *Hood, L. & Flores, M. (2012). Systems medicine and the emergence of proactive P4 medicine.*

## 8. Implementation Roadmap
1.  **Backend Core (Complete):** C# Simulation Engine (RK4 Solver) with JSON-based pathways.
2.  **Personalization Layer (Complete):** Profile system loading Lab Results, Genetics, and Biometrics.
3.  **Frontend Dashboard (Prototype):** React-based Charts & KPI display reading CSV output.
4.  **Real-Time API (Next):** Wrap the Console Logic in an ASP.NET Core Web API with SignalR to replace CSV polling.
5.  **Visual Interface (Future):** Build the React Three Fiber "Living Mannequin" and "Subway Maps" defined in this spec.

