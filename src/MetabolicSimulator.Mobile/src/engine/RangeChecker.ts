import referenceRanges from '../data/reference_ranges.json';

export interface RangeStatus {
  status: 'Optimal' | 'Normal' | 'Out of Range' | 'Unknown';
  color: string;
  min?: number;
  max?: number;
}

const rangesMap = new Map(referenceRanges.map(r => [r.MetaboliteId, r]));

export const checkRange = (metaboliteId: string, value: number): RangeStatus => {
  const range = rangesMap.get(metaboliteId);
  
  if (!range) return { status: 'Unknown', color: '#bdc3c7' }; // Grey

  if (value >= range.OptimalMin && value <= range.OptimalMax) {
    return { status: 'Optimal', color: '#2ecc71', min: range.OptimalMin, max: range.OptimalMax }; // Green
  }
  
  if (value >= range.NormalMin && value <= range.NormalMax) {
    return { status: 'Normal', color: '#3498db', min: range.NormalMin, max: range.NormalMax }; // Blue
  }

  return { status: 'Out of Range', color: '#e74c3c', min: range.NormalMin, max: range.NormalMax }; // Red
};
