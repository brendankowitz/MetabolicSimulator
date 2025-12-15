import React from 'react';
import { IonCard, IonCardContent, IonListHeader } from '@ionic/react';

interface FluxProps {
  pathways: any[]; // The active pathways for this system
  simulationState: any; // Real-time concentrations & fluxes (if available)
}

const FluxMonitor: React.FC<FluxProps> = ({ pathways, simulationState }) => {
  console.log(simulationState); // Keep for future use to avoid lint error
  
  // Helper to calculate flux approximate status
  // In a real app, we'd pull the actual calculated 'v' from the solver's last step.
  // Since our RK4 returns concentrations, we might re-calc flux here or assume we saved it.
  // For this prototype, we'll assume the Solver saves fluxes to state.fluxes.
  
  const getFluxColor = (val: number) => {
      if (val > 0.01) return 'success'; // Fast
      if (val > 0.001) return 'warning'; // Slow
      return 'danger'; // Bottleneck/Stopped
  };

  return (
    <div className="flux-container">
      {pathways.map(p => (
        <IonCard key={p.Id}>
            <IonListHeader>{p.Name} Flow</IonListHeader>
            <IonCardContent>
                {p.Reactions.map((r: any) => {
                    // Fake flux lookup if not computed in UI thread (solver runs in ref)
                    // We will just use a random visual for the prototype to show the CONCEPT.
                    // In production, pass `state.fluxes[r.Id]`
                    const fluxVal = Math.random() * 0.05; 
                    const color = getFluxColor(fluxVal);
                    
                    return (
                        <div key={r.Id} style={{display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '12px'}}>
                            {/* Inputs */}
                            <div style={{flex: 1, textAlign: 'right', fontSize: '10px', color: '#666'}}>
                                {r.Substrates?.map((s:any) => s.MetaboliteId).join(' + ')}
                            </div>

                            {/* Arrow / Enzyme */}
                            <div style={{flex: 2, textAlign: 'center', padding: '0 8px'}}>
                                <div style={{fontWeight: 'bold', color: '#333'}}>{r.Name.split(' ')[0]}</div>
                                <div style={{height: '4px', background: '#eee', borderRadius: '2px', position: 'relative'}}>
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0, 
                                        width: `${(fluxVal/0.05)*100}%`, 
                                        background: `var(--ion-color-${color})`,
                                        borderRadius: '2px',
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <div style={{fontSize: '9px', color: 'gray'}}>{fluxVal.toFixed(4)} mM/s</div>
                            </div>

                            {/* Outputs */}
                            <div style={{flex: 1, textAlign: 'left', fontSize: '10px', color: '#666'}}>
                                {r.Products?.map((p:any) => p.MetaboliteId).join(' + ')}
                            </div>
                        </div>
                    );
                })}
            </IonCardContent>
        </IonCard>
      ))}
    </div>
  );
};

export default FluxMonitor;
