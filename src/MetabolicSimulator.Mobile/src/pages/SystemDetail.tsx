import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonGrid, IonRow, IonCol } from '@ionic/react';
import { chevronDown, chevronUp, arrowBack } from 'ionicons/icons';
import pathwaysData from '../data/pathways.json';
import FluxMonitor from '../components/FluxMonitor';
import MetabolicMap from '../components/MetabolicMap';
import { checkRange } from '../engine/RangeChecker';

export interface SystemDetailProps {
    organId: string;
    simulationState: any;
    dailyRanges: Record<string, {min: number, max: number}>;
    onBack: () => void;
}

// Simple mapping from Organ -> Pathway ID
const ORGAN_MAP: Record<string, string[]> = {
    'Liver': ['methylation_cycle', 'fat_metabolism', 'urea_cycle'],
    'Muscle': ['glycolysis', 'krebs_cycle', 'fat_metabolism'],
    'Brain': ['methylation_cycle', 'nad_salvage'], 
    'Heart': ['krebs_cycle', 'fat_metabolism'],
    'Gut': ['glycolysis']
};

const SystemDetail: React.FC<SystemDetailProps> = ({ organId, simulationState, dailyRanges, onBack }) => {
  const pathwayIds = ORGAN_MAP[organId] || [];
  
  const rawPathways: any[] = pathwaysData as any;
  const activePathways = rawPathways.filter(p => pathwayIds.includes(p.Id));

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onBack}>
                <IonIcon slot="icon-only" icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{organId} Systems</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding" style={{'--background': '#f4f5f8'}}>
        
        {activePathways.length === 0 ? (
            <div style={{textAlign: 'center', marginTop: '50px', color: '#666'}}>
                No detailed models available for {organId} yet.
            </div>
        ) : (
            activePathways.map(pathway => (
                <IonCard key={pathway.Id}>
                    <IonCardHeader style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <IonTitle size="small">{pathway.Name}</IonTitle>
                        <IonButton fill="clear" size="small" onClick={() => toggleExpand(pathway.Id)}>
                            <IonIcon icon={expandedId === pathway.Id ? chevronUp : chevronDown} />
                        </IonButton>
                    </IonCardHeader>
                    
                    <IonCardContent>
                        <p style={{fontSize: '12px', marginBottom: '15px'}}>{pathway.Description}</p>
                        
                        {/* High Level Friendly View with Ranges */}
                        <div style={{marginBottom: '15px'}}>
                            <div style={{fontSize: '10px', fontWeight: 'bold', color: '#999', marginBottom: '8px'}}>KEY BIOMARKERS</div>
                            <IonGrid className="ion-no-padding">
                                {pathway.Metabolites?.slice(0, 6).map((m: any) => {
                                    const val = simulationState[m.Id] || 0;
                                    const rangeInfo = checkRange(m.Id, val);
                                    const dayRange = dailyRanges[m.Id];

                                    return (
                                        <div key={m.Id} style={{marginBottom: '12px', padding: '8px', background: '#f9f9f9', borderRadius: '8px'}}>
                                            <IonRow style={{marginBottom: '4px'}}>
                                                <IonCol size="6" style={{display: 'flex', alignItems: 'center'}}>
                                                    <div style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        background: rangeInfo.color, marginRight: '8px',
                                                        boxShadow: `0 0 4px ${rangeInfo.color}`
                                                    }} />
                                                    <span style={{fontSize: '12px', fontWeight: '500'}}>{m.Name}</span>
                                                </IonCol>
                                                <IonCol size="6" style={{textAlign: 'right'}}>
                                                    <span style={{fontSize: '14px', fontWeight: 'bold', color: '#333'}}>{val.toFixed(3)}</span>
                                                    <span style={{fontSize: '10px', color: '#999', marginLeft: '4px'}}>mM</span>
                                                </IonCol>
                                            </IonRow>

                                            {/* Daily Range Visualization */}
                                            {dayRange && dayRange.min !== dayRange.max && (
                                                <div style={{marginTop: '6px'}}>
                                                    <div style={{fontSize: '9px', color: '#7f8c8d', marginBottom: '3px'}}>
                                                        Today: {dayRange.min.toFixed(3)} - {dayRange.max.toFixed(3)} mM
                                                    </div>
                                                    <div style={{
                                                        position: 'relative',
                                                        height: '6px',
                                                        background: '#e0e0e0',
                                                        borderRadius: '3px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {/* Target range background */}
                                                        {rangeInfo.min !== undefined && rangeInfo.max !== undefined && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: `${Math.max(0, Math.min(100, ((rangeInfo.min - dayRange.min) / (dayRange.max - dayRange.min)) * 100))}%`,
                                                                width: `${Math.max(0, Math.min(100, ((rangeInfo.max - rangeInfo.min) / (dayRange.max - dayRange.min)) * 100))}%`,
                                                                height: '100%',
                                                                background: '#2ecc7144'
                                                            }} />
                                                        )}
                                                        {/* Current value marker */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: `${Math.max(0, Math.min(100, ((val - dayRange.min) / (dayRange.max - dayRange.min)) * 100))}%`,
                                                            top: 0,
                                                            width: '2px',
                                                            height: '100%',
                                                            background: rangeInfo.color,
                                                            boxShadow: `0 0 3px ${rangeInfo.color}`
                                                        }} />
                                                    </div>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2px'}}>
                                                        <span style={{fontSize: '8px', color: '#999'}}>Min</span>
                                                        <span style={{fontSize: '8px', color: rangeInfo.color, fontWeight: '600'}}>{rangeInfo.status}</span>
                                                        <span style={{fontSize: '8px', color: '#999'}}>Max</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </IonGrid>
                        </div>

                        {/* Detailed Flow Views */}
                        {expandedId === pathway.Id && (
                            <div style={{marginTop: '20px', borderTop: '1px dashed #eee', paddingTop: '10px'}}>
                                <div style={{fontSize: '10px', fontWeight: 'bold', color: '#333', marginBottom: '10px'}}>PATHWAY TOPOLOGY</div>
                                <MetabolicMap pathway={pathway} />
                                
                                <div style={{height: '10px'}} />
                                
                                <div style={{fontSize: '10px', fontWeight: 'bold', color: '#333', marginBottom: '10px'}}>REAL-TIME FLUX</div>
                                <FluxMonitor pathways={[pathway]} simulationState={simulationState} />
                            </div>
                        )}
                    </IonCardContent>
                </IonCard>
            ))
        )}

      </IonContent>
    </IonPage>
  );
};

export default SystemDetail;