// types.ts - Domain interfaces

export type Compartment = 'cytosol' | 'mitochondria' | 'blood' | 'nucleus';

export interface Metabolite {
  id: string;
  name: string;
  initialConcentration: number;
  compartment: string;
}

export interface Enzyme {
  id: string;
  name: string;
  ecNumber: string;
  vmax: number;
  km: number;
  cofactors?: string[];
  geneticModifiers?: GeneticModifier[];
}

export interface GeneticModifier {
  rsId: string;
  geneName: string;
  riskAllele: string;
  orientation: 'Plus' | 'Minus';
  homozygousEffect: number;
  heterozygousEffect: number;
  description: string;
}

export type KineticsType = 'MichaelisMenten' | 'MassAction';

export interface ReactionParticipant {
  metaboliteId: string;
  coefficient: number;
}

export interface Reaction {
  id: string;
  name: string;
  enzymeId: string;
  substrates: ReactionParticipant[];
  products: ReactionParticipant[];
  kinetics: KineticsType;
  inhibitors?: string[];
  activators?: string[];
  ki?: number;
  ka?: number;
}

export interface Pathway {
  id: string;
  name: string;
  description: string;
  metabolites: Metabolite[];
  reactions: Reaction[];
}

export interface SimulationState {
  time: number;
  concentrations: Record<string, number>; // Key: MetaboliteId
  fluxes: Record<string, number>; // Key: ReactionId
}
