// rk4Solver.ts - Runge-Kutta 4 Integrator
import { BioMath } from './bioMath';
import { Pathway, SimulationState, Enzyme } from './types';

export class RungeKuttaSolver {
  
  /**
   * Advances the simulation by one time step `dt`.
   */
  static step(currentState: SimulationState, dt: number, pathway: Pathway, enzymeLookup: Record<string, Enzyme>): SimulationState {
    // k1
    const k1 = this.calculateDerivatives(currentState, pathway, enzymeLookup);

    // k2
    const stateK2 = this.applyStep(currentState, k1, dt * 0.5);
    stateK2.time += dt * 0.5;
    const k2 = this.calculateDerivatives(stateK2, pathway, enzymeLookup);

    // k3
    const stateK3 = this.applyStep(currentState, k2, dt * 0.5);
    stateK3.time += dt * 0.5;
    const k3 = this.calculateDerivatives(stateK3, pathway, enzymeLookup);

    // k4
    const stateK4 = this.applyStep(currentState, k3, dt);
    stateK4.time += dt;
    const k4 = this.calculateDerivatives(stateK4, pathway, enzymeLookup);

    // Combine
    const nextConcentrations = { ...currentState.concentrations };
    
    // We need to iterate over all metabolites in the pathway to update them
    pathway.metabolites.forEach(met => {
      const id = met.id;
      const delta = (dt / 6.0) * (
        (k1[id] || 0) + 
        2 * (k2[id] || 0) + 
        2 * (k3[id] || 0) + 
        (k4[id] || 0)
      );

      // Prevent negative concentrations
      nextConcentrations[id] = Math.max(0, (currentState.concentrations[id] || 0) + delta);
    });

    return {
      time: currentState.time + dt,
      concentrations: nextConcentrations,
      fluxes: {} // Fluxes would ideally be recalculated for the final state if needed for UI
    };
  }

  private static calculateDerivatives(
    state: SimulationState, 
    pathway: Pathway, 
    enzymeLookup: Record<string, Enzyme>
  ): Record<string, number> {
    const derivatives: Record<string, number> = {};

    // Initialize derivatives for all metabolites to 0
    pathway.metabolites.forEach(m => derivatives[m.id] = 0);

    pathway.reactions.forEach(reaction => {
      const enzyme = enzymeLookup[reaction.enzymeId];
      if (!enzyme) return;

      // Calculate Rate (Flux)
      let rate = 0;
      
      // Assume first substrate is the limiting one for simple M-M, 
      // or simplistic product of substrates for Mass Action.
      // Ideally this logic should match the C# implementation exactly.
      
      if (reaction.kinetics === 'MichaelisMenten') {
        // Limiting substrate is usually the first one in this data model
        const sId = reaction.substrates[0]?.metaboliteId;
        const sConc = state.concentrations[sId] || 0;
        
        rate = BioMath.michaelisMenten(enzyme.vmax, enzyme.km, sConc);

        // Apply Inhibition
        if (reaction.inhibitors && reaction.ki) {
          const iId = reaction.inhibitors[0];
          const iConc = state.concentrations[iId] || 0;
          // Recalculate using competitive inhibition formula
          rate = BioMath.competitiveInhibition(enzyme.vmax, enzyme.km, sConc, iConc, reaction.ki);
        }

        // Apply Activation
        if (reaction.activators && reaction.ka) {
            const aId = reaction.activators[0];
            const aConc = state.concentrations[aId] || 0;
            rate = BioMath.activation(rate, aConc, reaction.ka);
        }

      } else {
        // Mass Action (Simplified: k * [S1])
        const sId = reaction.substrates[0]?.metaboliteId;
        const sConc = state.concentrations[sId] || 0;
        rate = enzyme.vmax * sConc; // Treating Vmax as 'k' for mass action here
      }

      // Apply flux to substrates (consumption) and products (production)
      reaction.substrates.forEach(s => {
        derivatives[s.metaboliteId] = (derivatives[s.metaboliteId] || 0) - (rate * s.coefficient);
      });

      reaction.products.forEach(p => {
        derivatives[p.metaboliteId] = (derivatives[p.metaboliteId] || 0) + (rate * p.coefficient);
      });
    });

    return derivatives;
  }

  private static applyStep(
    original: SimulationState, 
    derivatives: Record<string, number>, 
    stepSize: number
  ): SimulationState {
    const nextConcentrations = { ...original.concentrations };
    for (const [id, change] of Object.entries(derivatives)) {
      nextConcentrations[id] = Math.max(0, (nextConcentrations[id] || 0) + change * stepSize);
    }
    return {
        time: original.time + stepSize,
        concentrations: nextConcentrations,
        fluxes: {}
    };
  }
}
