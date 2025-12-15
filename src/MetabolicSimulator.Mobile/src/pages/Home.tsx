import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonProgressBar, IonRange } from '@ionic/react';
import { play, pause, refresh } from 'ionicons/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import pathwaysData from '../data/pathways.json';
import enzymesData from '../data/enzymes.json';
import { RungeKuttaSolver } from '../engine/rk4Solver';
import { Pathway, Enzyme, SimulationState } from '../engine/types';
import { TimeController } from '../engine/TimeController';
import AnatomyView from '../components/AnatomyView';
import SystemDetail from './SystemDetail';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Home: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [clockTime, setClockTime] = useState(0); // Minutes from midnight
  const [isRealTime, setIsRealTime] = useState(true);
  const [atpLevel, setAtpLevel] = useState(0);
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [currentConcs, setCurrentConcs] = useState<Record<string, number>>({});
  
  const stateRef = useRef<SimulationState>({ time: 0, concentrations: {}, fluxes: {} });
  const pathwayRef = useRef<Pathway | null>(null);
  const enzymeLookupRef = useRef<Record<string, Enzyme>>({});
  const timeCtrlRef = useRef<TimeController>(new TimeController());

  // Initialize Data
  useEffect(() => {
    setClockTime(timeCtrlRef.current.getRealTimeMinutes());

    const rawEnzymes: any[] = enzymesData as any;
    rawEnzymes.forEach(e => {
        enzymeLookupRef.current[e.Id] = {
            id: e.Id,
            name: e.Name,
            ecNumber: e.EcNumber,
            vmax: e.Vmax,
            km: e.Km,
            cofactors: e.Cofactors,
            geneticModifiers: e.GeneticModifiers
        };
    });

    const rawPathways: any[] = pathwaysData as any;
    const mergedMetabolites: any[] = [];
    const mergedReactions: any[] = [];
    const seenMets = new Set();

    rawPathways.forEach(p => {
        if (p.Metabolites) {
            p.Metabolites.forEach((m: any) => {
                if (!seenMets.has(m.Id)) {
                    mergedMetabolites.push({
                        id: m.Id,
                        name: m.Name,
                        initialConcentration: m.InitialConcentration,
                        compartment: m.Compartment
                    });
                    seenMets.add(m.Id);
                    stateRef.current.concentrations[m.Id] = m.InitialConcentration;
                }
            });
        }
        if (p.Reactions) {
            p.Reactions.forEach((r: any) => {
                mergedReactions.push({
                    id: r.Id,
                    name: r.Name,
                    enzymeId: r.EnzymeId,
                    kinetics: r.Kinetics,
                    substrates: r.Substrates?.map((s:any) => ({ metaboliteId: s.MetaboliteId, coefficient: s.Coefficient })) || [],
                    products: r.Products?.map((s:any) => ({ metaboliteId: s.MetaboliteId, coefficient: s.Coefficient })) || [],
                    inhibitors: r.Inhibitors,
                    activators: r.Activators,
                    ki: r.Ki,
                    ka: r.Ka
                });
            });
        }
    });

    pathwayRef.current = {
        id: 'merged',
        name: 'Whole Body',
        description: 'Merged',
        metabolites: mergedMetabolites,
        reactions: mergedReactions
    };

    setAtpLevel(stateRef.current.concentrations['atp_cyto'] || 0);
    setCurrentConcs(stateRef.current.concentrations);
  }, []);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (!isRunning || !pathwayRef.current) return;

      // 1. Update Clock
      let newTime = clockTime;
      if (isRealTime) {
          // Simulation Speed: 1 sec real time = 5 min sim time
          newTime = (clockTime + 5) % 1440; 
      } else {
          // Manual Slider Mode (Paused time)
          // If simply paused, we don't advance time unless manual scrub
      }
      
      // Only update React state if changed significantly to avoid re-renders
      if (isRealTime) setClockTime(newTime);

      // 2. Get Circadian Modifiers
      const modifiers = timeCtrlRef.current.getModifiersForTime(newTime);
      if (modifiers['cortisol']) {
          stateRef.current.concentrations['cortisol'] = (stateRef.current.concentrations['cortisol'] || 0.1) * modifiers['cortisol'];
      }

      // 3. Check for Schedule Events
      const events = timeCtrlRef.current.getEventsForTimeWindow(clockTime, newTime);
      events.forEach(e => {
          if (e.type === "Meal") {
              stateRef.current.concentrations['glucose_blood'] = (stateRef.current.concentrations['glucose_blood'] || 5.0) + (e.payload.GlucoseLoad || 0) * 0.1;
              stateRef.current.concentrations['insulin'] = (stateRef.current.concentrations['insulin'] || 0.5) + 5.0;
          }
          if (e.type === "Exercise") {
              stateRef.current.concentrations['atp_cyto'] *= 0.8; 
              stateRef.current.concentrations['amp'] = (stateRef.current.concentrations['amp'] || 0.05) + 2.0; 
          }
      });

      // 4. Run Physics
      const dt = 0.01; 
      const stepsPerFrame = 10; 

      for(let i=0; i<stepsPerFrame; i++) {
        stateRef.current = RungeKuttaSolver.step(
            stateRef.current, 
            dt, 
            pathwayRef.current, 
            enzymeLookupRef.current
        );
      }

      // 5. Update UI State
      setAtpLevel(stateRef.current.concentrations['atp_cyto'] || 0);
      
      // Throttle heavy updates
      if (Math.floor(clockTime) % 30 === 0) { // Every 30 min sim time
          setCurrentConcs({ ...stateRef.current.concentrations });
      }
      
      animationFrameId = requestAnimationFrame(loop);
    };

    if (isRunning) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, clockTime, isRealTime]);

  const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const toggleRun = () => setIsRunning(!isRunning);
  const reset = () => {
      setIsRunning(false);
      window.location.reload(); 
  };

  if (selectedOrgan) {
      return <SystemDetail organId={selectedOrgan} simulationState={currentConcs} onBack={() => setSelectedOrgan(null)} />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>DigitalMe</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        
        {/* Time Control Bar */}
        <div style={{background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', fontSize: '18px', color: '#2c3e50'}}>{formatTime(clockTime)}</div>
                <div style={{fontSize: '12px', color: '#7f8c8d'}}>{isRealTime ? 'LIVE SIM' : 'MANUAL'}</div>
            </div>
            <IonRange 
                min={0} max={1440} 
                value={clockTime} 
                onIonChange={e => {
                    setIsRealTime(false);
                    setClockTime(e.detail.value as number);
                }} 
            />
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#bdc3c7'}}>
                <span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
            </div>
        </div>

        {/* Anatomy Visualization */}
        <AnatomyView 
            atp={currentConcs['atp_cyto'] || 0}
            inflammation={currentConcs['ros'] || 0}
            methylation={currentConcs['sam'] || 0}
            nad={currentConcs['nad_plus_mito'] || 0}
            onOrganClick={setSelectedOrgan}
        />

        {/* Global Stats */}
        <IonGrid>
            <IonRow>
                <IonCol>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{fontSize: '12px', color: '#666'}}>Global ATP</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold'}}>{atpLevel.toFixed(2)} mM</div>
                        <IonProgressBar value={atpLevel / 6.0} color={atpLevel < 2 ? 'danger' : 'success'}></IonProgressBar>
                    </div>
                </IonCol>
                <IonCol>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{fontSize: '12px', color: '#666'}}>Glucose</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold'}}>{(currentConcs['glucose_blood'] || 0).toFixed(1)} mM</div>
                    </div>
                </IonCol>
            </IonRow>
        </IonGrid>

        {/* Controls */}
        <div style={{ textAlign: 'center', margin: '20px' }}>
            <IonButton onClick={toggleRun}>
                <IonIcon slot="start" icon={isRunning ? pause : play} />
                {isRunning ? 'Pause' : 'Start Day'}
            </IonButton>
            <IonButton fill="outline" onClick={reset}>
                <IonIcon slot="start" icon={refresh} />
                Reset
            </IonButton>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Home;
