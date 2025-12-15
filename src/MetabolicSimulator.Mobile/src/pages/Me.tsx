import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonRange, IonButton, IonIcon } from '@ionic/react';
import { saveOutline } from 'ionicons/icons';
import { useProfile } from '../contexts/ProfileContext';

const Me: React.FC = () => {
  const { profile, updateProfile } = useProfile();

  // Local state for form
  const [formData, setFormData] = React.useState(profile);

  // Sync when profile loads
  React.useEffect(() => {
      setFormData(profile);
  }, [profile]);

  const handleSave = () => {
      updateProfile(formData);
      // Logic to trigger simulation reset happens via Context listener in Home
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Digital Twin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList>
            <IonItem>
                <IonLabel position="stacked">Age (years)</IonLabel>
                <IonInput type="number" value={formData.age} onIonChange={e => setFormData({...formData, age: parseInt(e.detail.value!, 10)})} />
            </IonItem>
            
            <IonItem>
                <IonLabel position="stacked">Weight (kg)</IonLabel>
                <IonInput type="number" value={formData.weightKg} onIonChange={e => setFormData({...formData, weightKg: parseFloat(e.detail.value!)})} />
            </IonItem>

            <IonItem>
                <IonLabel position="stacked">Height (cm)</IonLabel>
                <IonInput type="number" value={formData.heightCm} onIonChange={e => setFormData({...formData, heightCm: parseFloat(e.detail.value!)})} />
            </IonItem>

            <IonItem>
                <IonLabel>Gender</IonLabel>
                <IonSelect value={formData.gender} onIonChange={e => setFormData({...formData, gender: e.detail.value})}>
                    <IonSelectOption value="Male">Male</IonSelectOption>
                    <IonSelectOption value="Female">Female</IonSelectOption>
                </IonSelect>
            </IonItem>

            <div style={{padding: '20px 15px 0'}}>
                <IonLabel color="medium" style={{fontSize: '12px'}}>SLEEP QUALITY</IonLabel>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                    <h2>{formData.sleepHours} hrs</h2>
                    <h2>{formData.sleepQuality}% Score</h2>
                </div>
                
                <IonItem lines="none">
                    <IonRange min={4} max={12} step={0.5} snaps={true} value={formData.sleepHours} onIonChange={e => setFormData({...formData, sleepHours: e.detail.value as number})}>
                        <IonIcon size="small" slot="start" name="moon" />
                    </IonRange>
                </IonItem>
                <IonItem lines="none">
                    <IonRange min={0} max={100} value={formData.sleepQuality} color="success" onIonChange={e => setFormData({...formData, sleepQuality: e.detail.value as number})} />
                </IonItem>
            </div>

        </IonList>

        <div style={{padding: '20px'}}>
            <IonButton expand="block" onClick={handleSave}>
                <IonIcon slot="start" icon={saveOutline} />
                Save & Recalibrate
            </IonButton>
            <p style={{textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '10px'}}>
                Updating will reset the simulation state.
            </p>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Me;
