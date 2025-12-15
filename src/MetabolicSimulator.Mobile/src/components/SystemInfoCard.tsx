import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/react';

interface InfoProps {
  selectedOrgan: string | null;
  data: any; // The current simulation state
}

const SystemInfoCard: React.FC<InfoProps> = ({ selectedOrgan, data }) => {
  if (!selectedOrgan) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>System Status</IonCardTitle>
          <IonCardSubtitle>Select an organ to view details</IonCardSubtitle>
        </IonCardHeader>
      </IonCard>
    );
  }

  // Map Organ -> Data Keys
  const metrics: Record<string, { label: string, val: number, unit: string }[]> = {
    'Brain': [
      { label: 'Methylation (SAM)', val: data['sam'], unit: 'mM' },
      { label: 'NAD+ Supply', val: data['nad_plus_mito'], unit: 'mM' }
    ],
    'Heart': [
        { label: 'ATP Energy', val: data['atp_cyto'], unit: 'mM' },
        { label: 'Oxygen Stress (ROS)', val: data['ros'], unit: 'mM' }
    ],
    'Liver': [
        { label: 'Glutathione', val: data['gsh_cyto'], unit: 'mM' },
        { label: 'Fatty Acids', val: data['fatty_acids_blood'], unit: 'mM' },
        { label: 'Homocysteine', val: data['hcy'], unit: 'mM' }
    ],
    'Muscle': [
        { label: 'ATP Energy', val: data['atp_cyto'], unit: 'mM' },
        { label: 'Lactate/Pyruvate', val: data['pyruvate'], unit: 'mM' } // Simplified
    ],
    'Gut': [
        { label: 'Glucose Intake', val: data['glucose_blood'], unit: 'mM' },
        { label: 'Absorption', val: 100, unit: '%' }
    ]
  };

  const currentMetrics = metrics[selectedOrgan] || [];

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{selectedOrgan} System</IonCardTitle>
        <IonCardSubtitle>Real-time Telemetry</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        {currentMetrics.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{m.label}</span>
                <span style={{ fontWeight: 'bold' }}>{m.val?.toFixed(4) || 0} {m.unit}</span>
            </div>
        ))}
      </IonCardContent>
    </IonCard>
  );
};

export default SystemInfoCard;
