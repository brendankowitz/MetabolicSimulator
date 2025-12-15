import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonProgressBar, IonRange } from '@ionic/react';
import {
  play, pause, refresh,
  flashOutline, happyOutline, heartOutline, eyeOutline,
  alertCircleOutline, fitnessOutline, flameOutline, moonOutline,
  restaurantOutline
} from 'ionicons/icons';
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
import { HomeostaticControls, MetabolicStores, MealInProgress } from '../engine/HomeostaticControls';
import { HealthIndicators } from '../engine/HealthIndicators';
import { checkRange } from '../engine/RangeChecker';
import SystemCard from '../components/SystemCard';
import SystemDetail from './SystemDetail';
import ScheduleTimeline from '../components/ScheduleTimeline';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Home: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [clockTime, setClockTime] = useState(0); // Minutes from midnight
  const [isRealTime, setIsRealTime] = useState(true);
  const [atpLevel, setAtpLevel] = useState(0);
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [currentConcs, setCurrentConcs] = useState<Record<string, number>>({});
  const [recentEvent, setRecentEvent] = useState<{description: string, time: number} | null>(null);
  const [dailyRanges, setDailyRanges] = useState<Record<string, {min: number, max: number}>>({});
  const [isAsleepState, setIsAsleepState] = useState(false);
  const [systemScoreDelta, setSystemScoreDelta] = useState<Record<string, number>>({});
  
  const stateRef = useRef<SimulationState>({ time: 0, concentrations: {}, fluxes: {} });
  const pathwayRef = useRef<Pathway | null>(null);
  const enzymeLookupRef = useRef<Record<string, Enzyme>>({});
  const timeCtrlRef = useRef<TimeController>(new TimeController());
  const metabolicStoresRef = useRef<MetabolicStores>(HomeostaticControls.getDefaultStores());
  const mealQueueRef = useRef<MealInProgress[]>([]);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const prevSystemScoresRef = useRef<Record<string, number>>({});

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
    let timeoutId: number;

    const loop = () => {
      if (!isRunning || !pathwayRef.current) return;

      // Calculate elapsed time since last frame
      const now = Date.now();
      const deltaSeconds = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      // 1. Update Clock
      let newTime = clockTime;
      if (isRealTime) {
          // Simulation Speed: 1 real second = 24 sim minutes (full day = 60 sec)
          const simMinutesElapsed = deltaSeconds * 24;
          newTime = (clockTime + simMinutesElapsed) % 1440;
      } else {
          // Manual Slider Mode (Paused time)
          // If simply paused, we don't advance time unless manual scrub
      }

      // Only update React state if changed significantly to avoid re-renders
      if (isRealTime && Math.abs(newTime - clockTime) > 0.1) setClockTime(newTime);

      // 2. Get Circadian Modifiers
      const modifiers = timeCtrlRef.current.getModifiersForTime(newTime);
      // Set cortisol based on circadian rhythm (not multiply - that causes exponential behavior)
      const baseCortisol = 0.3; // Baseline cortisol level in mM
      if (modifiers['cortisol']) {
          stateRef.current.concentrations['cortisol'] = baseCortisol * modifiers['cortisol'];
      }

      // 2b. Apply Sleep Effects
      const isAsleep = timeCtrlRef.current.isAsleep(newTime);
      setIsAsleepState(isAsleep);
      if (isAsleep) {
          // During sleep: reduced metabolic rate, enhanced repair
          // Reduce basal ATP consumption (body at rest)
          stateRef.current.concentrations['atp_cyto'] = Math.min(6.0,
              (stateRef.current.concentrations['atp_cyto'] || 5.0) + 0.01
          );
          // Enhanced GSH regeneration (repair mode)
          stateRef.current.concentrations['gsh_cyto'] = Math.min(6.0,
              (stateRef.current.concentrations['gsh_cyto'] || 4.0) + 0.005
          );
          // NAD+ salvage enhanced during sleep
          stateRef.current.concentrations['nad_plus_cyto'] = Math.min(1.0,
              (stateRef.current.concentrations['nad_plus_cyto'] || 0.8) + 0.002
          );
          // Melatonin high
          stateRef.current.concentrations['melatonin'] = 0.5;
      } else {
          stateRef.current.concentrations['melatonin'] = 0.05;
      }

      // 2c. Check for Active Exercise (duration-based)
      const activeExercise = timeCtrlRef.current.getActiveExercise(newTime);
      if (activeExercise) {
          // Continuous ATP drain during exercise
          const intensity = activeExercise.payload?.Intensity === 'High' ? 0.15 : 0.08;
          stateRef.current.concentrations['atp_cyto'] = Math.max(2.0,
              (stateRef.current.concentrations['atp_cyto'] || 5.0) - intensity
          );
          // AMP increases (energy stress signal)
          stateRef.current.concentrations['amp'] = Math.min(0.5,
              (stateRef.current.concentrations['amp'] || 0.05) + 0.02
          );
          // Glucose consumption
          stateRef.current.concentrations['glucose_blood'] = Math.max(3.5,
              (stateRef.current.concentrations['glucose_blood'] || 5.0) - 0.03
          );
          // AMPK activation from exercise
          stateRef.current.concentrations['ampk_active'] = Math.min(0.8,
              (stateRef.current.concentrations['ampk_active'] || 0.1) + 0.01
          );
      }

      // 2d. Fasting State Detection
      const minutesSinceLastMeal = timeCtrlRef.current.getMinutesSinceLastMeal(newTime);
      if (minutesSinceLastMeal > 180 && !isAsleep) { // >3 hours since meal, not sleeping
          // Fasted state: switch to fat burning
          stateRef.current.concentrations['fatty_acids_blood'] = Math.min(1.0,
              (stateRef.current.concentrations['fatty_acids_blood'] || 0.5) + 0.005
          );
          // AMPK activation in fasted state
          stateRef.current.concentrations['ampk_active'] = Math.min(0.5,
              (stateRef.current.concentrations['ampk_active'] || 0.1) + 0.002
          );
          // mTOR suppression in fasted state
          stateRef.current.concentrations['mtor_active'] = Math.max(0.1,
              (stateRef.current.concentrations['mtor_active'] || 0.5) - 0.002
          );
      }

      // 3. Check for Schedule Events
      const events = timeCtrlRef.current.getEventsForTimeWindow(clockTime, newTime);
      events.forEach(e => {
          // Show event notification
          setRecentEvent({ description: e.description, time: newTime });

          if (e.type === "Meal") {
              // Queue meal for gradual absorption (60-120 min)
              mealQueueRef.current.push({
                startTime: e.timeMinutes,
                absorptionDuration: 90, // minutes (1.5 hours)
                glucoseRemaining: e.payload.GlucoseLoad || 0,
                proteinRemaining: e.payload.ProteinLoad || 0,
                fatRemaining: e.payload.FatLoad || 0
              });

              // Immediate insulin response to meal
              stateRef.current.concentrations['insulin'] = (stateRef.current.concentrations['insulin'] || 0.5) + 8.0;
          }
          if (e.type === "Exercise") {
              // Exercise increases ATP demand (will be compensated by homeostasis)
              stateRef.current.concentrations['atp_cyto'] = Math.max(1.0, (stateRef.current.concentrations['atp_cyto'] || 5.0) * 0.7);
              stateRef.current.concentrations['amp'] = (stateRef.current.concentrations['amp'] || 0.05) + 1.5;
              // Increase glucose uptake
              stateRef.current.concentrations['glucose_blood'] = Math.max(3.5, (stateRef.current.concentrations['glucose_blood'] || 5.0) - 0.5);
          }
      });

      // 4. Process Meal Absorption (gradual nutrient release)
      const absorptionResult = HomeostaticControls.processMealAbsorption(
        mealQueueRef.current,
        newTime,
        stateRef.current,
        metabolicStoresRef.current
      );
      stateRef.current = absorptionResult.state;
      metabolicStoresRef.current = absorptionResult.stores;
      mealQueueRef.current = absorptionResult.mealQueue;

      // 5. Run Physics
      const dt = 0.01;
      const stepsPerFrame = 10;

      for(let i=0; i<stepsPerFrame; i++) {
        stateRef.current = RungeKuttaSolver.step(
            stateRef.current,
            dt,
            pathwayRef.current,
            enzymeLookupRef.current
        );

        // Apply homeostatic controls after each step to prevent depletion
        const homeoResult = HomeostaticControls.applyHomeostasis(
          stateRef.current,
          metabolicStoresRef.current,
          dt
        );
        stateRef.current = homeoResult.state;
        metabolicStoresRef.current = homeoResult.stores;
      }

      // 6. Update UI State
      setAtpLevel(stateRef.current.concentrations['atp_cyto'] || 0);

      // Update daily ranges
      const newRanges = { ...dailyRanges };
      Object.keys(stateRef.current.concentrations).forEach(key => {
        const value = stateRef.current.concentrations[key];
        if (!newRanges[key]) {
          newRanges[key] = { min: value, max: value };
        } else {
          newRanges[key].min = Math.min(newRanges[key].min, value);
          newRanges[key].max = Math.max(newRanges[key].max, value);
        }
      });
      setDailyRanges(newRanges);

      // Update concentrations every frame for smooth UI
      setCurrentConcs({ ...stateRef.current.concentrations });

      // Calculate system score deltas for pulse effect
      const concs = stateRef.current.concentrations;
      const newScores: Record<string, number> = {
        Brain: Math.round(Math.min(40, ((concs['sam'] || 0) / 0.1) * 40) + Math.min(30, ((concs['methyl_thf'] || 0) / 0.03) * 30) + ((concs['glucose_blood'] || 0) >= 4.0 && (concs['glucose_blood'] || 0) <= 6.0 ? 30 : 15)),
        Heart: Math.round(Math.min(60, ((concs['atp_cyto'] || 0) / 5.0) * 60) + Math.min(40, ((concs['nad_plus_mito'] || 0) / 1.0) * 40)),
        Liver: Math.max(0, Math.round(100 - Math.min(40, (concs['ros'] || 0) * 4000) - ((concs['hcy'] || 0) > 0.02 ? 20 : 0) + Math.min(20, ((concs['sam'] || 0) / 0.1) * 20))),
        Muscle: Math.round(Math.min(60, ((concs['atp_cyto'] || 0) / 5.0) * 60) + Math.min(40, (((concs['glucose_blood'] || 0) - 3.0) / 3.0) * 40))
      };
      
      const deltas: Record<string, number> = {};
      Object.keys(newScores).forEach(key => {
        const prev = prevSystemScoresRef.current[key] || newScores[key];
        deltas[key] = newScores[key] - prev;
      });
      prevSystemScoresRef.current = newScores;
      setSystemScoreDelta(deltas);

      // Run loop every 100ms for smooth but controlled updates
      timeoutId = window.setTimeout(loop, 100);
    };

    if (isRunning) {
      lastFrameTimeRef.current = Date.now(); // Reset timer on start
      timeoutId = window.setTimeout(loop, 100);
    }

    return () => clearTimeout(timeoutId);
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
      return <SystemDetail organId={selectedOrgan} simulationState={currentConcs} dailyRanges={dailyRanges} onBack={() => setSelectedOrgan(null)} />;
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
                <div>
                    <div style={{fontWeight: 'bold', fontSize: '18px', color: '#2c3e50'}}>{formatTime(clockTime)}</div>
                    {recentEvent && (
                        <div style={{
                            fontSize: '11px',
                            color: '#3498db',
                            marginTop: '4px',
                            background: '#e3f2fd',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: '500'
                        }}>
                            📍 {recentEvent.description}
                        </div>
                    )}
                </div>
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

            {/* Schedule Timeline */}
            <ScheduleTimeline currentTime={clockTime} />
        </div>

        {/* System Health Cards */}
        <div style={{marginBottom: '15px'}}>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <SystemCard
                  systemId="Brain"
                  systemName="Brain"
                  healthScore={(() => {
                    const sam = currentConcs['sam'] || 0;
                    const methylThf = currentConcs['methyl_thf'] || 0;
                    const glucose = currentConcs['glucose_blood'] || 0;
                    let score = 0;
                    score += Math.min(40, (sam / 0.1) * 40);
                    score += Math.min(30, (methylThf / 0.03) * 30);
                    score += glucose >= 4.0 && glucose <= 6.0 ? 30 : 15;
                    return Math.round(score);
                  })()}
                  keyMetrics={[
                    { name: 'SAM', value: currentConcs['sam'] || 0, status: (currentConcs['sam'] || 0) > 0.06 ? 'good' : 'warning' },
                    { name: 'Glucose', value: currentConcs['glucose_blood'] || 0, status: (currentConcs['glucose_blood'] || 0) >= 4.0 && (currentConcs['glucose_blood'] || 0) <= 6.0 ? 'good' : 'warning' }
                  ]}
                  onClick={() => setSelectedOrgan('Brain')}
                  scoreDelta={systemScoreDelta['Brain'] || 0}
                />
              </IonCol>
              <IonCol size="6">
                <SystemCard
                  systemId="Heart"
                  systemName="Heart"
                  healthScore={(() => {
                    const atp = currentConcs['atp_cyto'] || 0;
                    const nadPlus = currentConcs['nad_plus_mito'] || 0;
                    let score = 0;
                    score += Math.min(60, (atp / 5.0) * 60);
                    score += Math.min(40, (nadPlus / 1.0) * 40);
                    return Math.round(score);
                  })()}
                  keyMetrics={[
                    { name: 'ATP', value: currentConcs['atp_cyto'] || 0, status: (currentConcs['atp_cyto'] || 0) > 3.5 ? 'good' : 'warning' },
                    { name: 'NAD+', value: currentConcs['nad_plus_mito'] || 0, status: (currentConcs['nad_plus_mito'] || 0) > 0.7 ? 'good' : 'warning' }
                  ]}
                  onClick={() => setSelectedOrgan('Heart')}
                  scoreDelta={systemScoreDelta['Heart'] || 0}
                />
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="6">
                <SystemCard
                  systemId="Liver"
                  systemName="Liver"
                  healthScore={(() => {
                    const ros = currentConcs['ros'] || 0;
                    const sam = currentConcs['sam'] || 0;
                    const hcy = currentConcs['hcy'] || 0;
                    let score = 100;
                    score -= Math.min(40, ros * 4000);
                    score -= hcy > 0.02 ? 20 : 0;
                    score += Math.min(20, (sam / 0.1) * 20);
                    return Math.max(0, Math.round(score));
                  })()}
                  keyMetrics={[
                    { name: 'ROS', value: currentConcs['ros'] || 0, status: (currentConcs['ros'] || 0) < 0.005 ? 'good' : 'warning' },
                    { name: 'Homocysteine', value: currentConcs['hcy'] || 0, status: (currentConcs['hcy'] || 0) < 0.02 ? 'good' : 'bad' }
                  ]}
                  onClick={() => setSelectedOrgan('Liver')}
                  scoreDelta={systemScoreDelta['Liver'] || 0}
                />
              </IonCol>
              <IonCol size="6">
                <SystemCard
                  systemId="Muscle"
                  systemName="Muscle"
                  healthScore={(() => {
                    const atp = currentConcs['atp_cyto'] || 0;
                    const glucose = currentConcs['glucose_blood'] || 0;
                    let score = 0;
                    score += Math.min(60, (atp / 5.0) * 60);
                    score += Math.min(40, ((glucose - 3.0) / 3.0) * 40);
                    return Math.round(score);
                  })()}
                  keyMetrics={[
                    { name: 'ATP', value: currentConcs['atp_cyto'] || 0, status: (currentConcs['atp_cyto'] || 0) > 3.5 ? 'good' : 'warning' },
                    { name: 'Glucose', value: currentConcs['glucose_blood'] || 0, status: (currentConcs['glucose_blood'] || 0) > 4.0 ? 'good' : 'warning' }
                  ]}
                  onClick={() => setSelectedOrgan('Muscle')}
                  scoreDelta={systemScoreDelta['Muscle'] || 0}
                />
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Global Stats with Ranges */}
        <div style={{background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <IonGrid className="ion-no-padding">
                <IonRow>
                    <IonCol size="6">
                        <div style={{ padding: '8px' }}>
                            <div style={{fontSize: '11px', color: '#666', marginBottom: '4px'}}>ATP</div>
                            <div style={{fontSize: '22px', fontWeight: 'bold', color: atpLevel < 3 ? '#e74c3c' : atpLevel > 5.5 ? '#3498db' : '#2ecc71'}}>
                                {atpLevel.toFixed(2)} <span style={{fontSize: '12px', fontWeight: 'normal'}}>mM</span>
                            </div>
                            {/* Range visualization */}
                            <div style={{position: 'relative', height: '20px', marginTop: '8px'}}>
                                {/* Background track */}
                                <div style={{position: 'absolute', top: '8px', left: 0, right: 0, height: '4px', background: '#e0e0e0', borderRadius: '2px'}} />
                                {/* Normal range (green zone) */}
                                <div style={{
                                    position: 'absolute', top: '8px',
                                    left: `${(3.0 / 8.0) * 100}%`,
                                    width: `${((5.5 - 3.0) / 8.0) * 100}%`,
                                    height: '4px', background: '#2ecc7155', borderRadius: '2px'
                                }} />
                                {/* Daily range bar */}
                                {dailyRanges['atp_cyto'] && dailyRanges['atp_cyto'].min !== dailyRanges['atp_cyto'].max && (
                                    <div style={{
                                        position: 'absolute', top: '6px',
                                        left: `${Math.max(0, (dailyRanges['atp_cyto'].min / 8.0) * 100)}%`,
                                        width: `${Math.min(100, ((dailyRanges['atp_cyto'].max - dailyRanges['atp_cyto'].min) / 8.0) * 100)}%`,
                                        height: '8px', background: '#3498db44', borderRadius: '4px', border: '1px solid #3498db'
                                    }} />
                                )}
                                {/* Current value marker */}
                                <div style={{
                                    position: 'absolute', top: '4px',
                                    left: `${Math.min(100, (atpLevel / 8.0) * 100)}%`,
                                    width: '4px', height: '12px',
                                    background: atpLevel < 3 ? '#e74c3c' : '#2ecc71',
                                    borderRadius: '2px', transform: 'translateX(-50%)',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                                }} />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#999', marginTop: '2px'}}>
                                <span>0</span>
                                <span style={{color: '#2ecc71'}}>Normal: 3-5.5</span>
                                <span>8</span>
                            </div>
                            {dailyRanges['atp_cyto'] && (
                                <div style={{fontSize: '9px', color: '#3498db', textAlign: 'center', marginTop: '2px'}}>
                                    Today: {dailyRanges['atp_cyto'].min.toFixed(2)} - {dailyRanges['atp_cyto'].max.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </IonCol>
                    <IonCol size="6">
                        <div style={{ padding: '8px' }}>
                            <div style={{fontSize: '11px', color: '#666', marginBottom: '4px'}}>Glucose</div>
                            <div style={{fontSize: '22px', fontWeight: 'bold', color: (currentConcs['glucose_blood'] || 0) < 3.9 ? '#e74c3c' : (currentConcs['glucose_blood'] || 0) > 6.5 ? '#f39c12' : '#2ecc71'}}>
                                {(currentConcs['glucose_blood'] || 0).toFixed(2)} <span style={{fontSize: '12px', fontWeight: 'normal'}}>mM</span>
                            </div>
                            {/* Range visualization */}
                            <div style={{position: 'relative', height: '20px', marginTop: '8px'}}>
                                {/* Background track */}
                                <div style={{position: 'absolute', top: '8px', left: 0, right: 0, height: '4px', background: '#e0e0e0', borderRadius: '2px'}} />
                                {/* Normal range (green zone) 3.9-5.6 */}
                                <div style={{
                                    position: 'absolute', top: '8px',
                                    left: `${(3.9 / 12.0) * 100}%`,
                                    width: `${((5.6 - 3.9) / 12.0) * 100}%`,
                                    height: '4px', background: '#2ecc7155', borderRadius: '2px'
                                }} />
                                {/* Daily range bar */}
                                {dailyRanges['glucose_blood'] && dailyRanges['glucose_blood'].min !== dailyRanges['glucose_blood'].max && (
                                    <div style={{
                                        position: 'absolute', top: '6px',
                                        left: `${Math.max(0, (dailyRanges['glucose_blood'].min / 12.0) * 100)}%`,
                                        width: `${Math.min(100, ((dailyRanges['glucose_blood'].max - dailyRanges['glucose_blood'].min) / 12.0) * 100)}%`,
                                        height: '8px', background: '#3498db44', borderRadius: '4px', border: '1px solid #3498db'
                                    }} />
                                )}
                                {/* Current value marker */}
                                <div style={{
                                    position: 'absolute', top: '4px',
                                    left: `${Math.min(100, ((currentConcs['glucose_blood'] || 0) / 12.0) * 100)}%`,
                                    width: '4px', height: '12px',
                                    background: (currentConcs['glucose_blood'] || 0) < 3.9 ? '#e74c3c' : (currentConcs['glucose_blood'] || 0) > 6.5 ? '#f39c12' : '#2ecc71',
                                    borderRadius: '2px', transform: 'translateX(-50%)',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                                }} />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#999', marginTop: '2px'}}>
                                <span>0</span>
                                <span style={{color: '#2ecc71'}}>Normal: 3.9-5.6</span>
                                <span>12</span>
                            </div>
                            {dailyRanges['glucose_blood'] && (
                                <div style={{fontSize: '9px', color: '#3498db', textAlign: 'center', marginTop: '2px'}}>
                                    Today: {dailyRanges['glucose_blood'].min.toFixed(2)} - {dailyRanges['glucose_blood'].max.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </IonCol>
                </IonRow>
            </IonGrid>
        </div>

        {/* Health Indicators */}
        <div style={{background: '#fff', padding: '12px', borderRadius: '12px', marginTop: '15px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <div style={{fontWeight: 'bold', fontSize: '12px', color: '#2c3e50', marginBottom: '10px'}}>HOW YOU FEEL</div>
            <IonGrid className="ion-no-padding">
                {(() => {
                    const health = HealthIndicators.calculateAll(currentConcs, isAsleepState);
                    const indicators = [
                        { key: 'energy', label: 'Energy', data: health.energy, icon: flashOutline },
                        { key: 'focus', label: 'Focus', data: health.focus, icon: eyeOutline },
                        { key: 'mood', label: 'Mood', data: health.mood, icon: happyOutline },
                        { key: 'alertness', label: 'Alertness', data: health.alertness, icon: flashOutline },
                        { key: 'stress', label: 'Stress', data: health.stress, icon: alertCircleOutline },
                        { key: 'recovery', label: 'Recovery', data: health.recovery, icon: fitnessOutline },
                        { key: 'inflammation', label: 'Inflammation', data: health.inflammation, icon: flameOutline },
                        { key: 'sleepQuality', label: 'Sleep Quality', data: health.sleepQuality, icon: moonOutline },
                        { key: 'hunger', label: 'Hunger', data: health.hunger, icon: restaurantOutline },
                        { key: 'libido', label: 'Libido', data: health.libido, icon: heartOutline }
                    ];

                    return (
                        <>
                            {indicators.map((indicator, idx) => (
                                <IonRow key={indicator.key} style={{marginBottom: idx < indicators.length - 1 ? '6px' : '0', alignItems: 'center'}}>
                                    <IonCol size="5" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        <IonIcon icon={indicator.icon} style={{fontSize: '14px', color: indicator.data.color}} />
                                        <span style={{fontSize: '11px', color: '#666'}}>{indicator.label}</span>
                                    </IonCol>
                                    <IonCol size="7" style={{textAlign: 'right'}}>
                                        <span style={{fontSize: '12px', fontWeight: 'bold', color: indicator.data.color}}>{indicator.data.label}</span>
                                        <IonProgressBar value={indicator.data.level / 100} style={{height: '5px', marginTop: '2px', '--background': '#e0e0e0', '--progress-background': indicator.data.color}}></IonProgressBar>
                                    </IonCol>
                                </IonRow>
                            ))}
                        </>
                    );
                })()}
            </IonGrid>
        </div>

        {/* Out of Range Alerts */}
        {(() => {
            const keyMetabolites = ['glucose_blood', 'atp_cyto', 'nad_plus_mito', 'sam', 'hcy', 'ros'];
            const outOfRange = keyMetabolites
                .map(id => ({ id, value: currentConcs[id] || 0, range: checkRange(id, currentConcs[id] || 0) }))
                .filter(m => m.range.status === 'Out of Range');

            if (outOfRange.length === 0) return null;

            return (
                <div style={{background: '#fff3cd', padding: '12px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #ffc107'}}>
                    <div style={{fontWeight: 'bold', fontSize: '12px', color: '#856404', marginBottom: '8px'}}>⚠️ OUT OF RANGE</div>
                    {outOfRange.map(m => (
                        <div key={m.id} style={{fontSize: '11px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid #ffe69c'}}>
                            <div style={{fontWeight: '600', color: '#333'}}>{m.id.replace(/_/g, ' ').toUpperCase()}: {m.value.toFixed(3)} mM</div>
                            <div style={{color: '#666', marginTop: '2px'}}>
                                Normal: {m.range.min?.toFixed(2)} - {m.range.max?.toFixed(2)} mM
                            </div>
                        </div>
                    ))}
                </div>
            );
        })()}

        {/* Metabolic Stores */}
        <div style={{background: '#fff', padding: '12px', borderRadius: '12px', marginTop: '15px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <div style={{fontWeight: 'bold', fontSize: '12px', color: '#2c3e50', marginBottom: '10px'}}>ENERGY RESERVES</div>
            <IonGrid className="ion-no-padding">
                <IonRow style={{marginBottom: '6px'}}>
                    <IonCol size="6" style={{fontSize: '11px', color: '#666'}}>Liver Glycogen</IonCol>
                    <IonCol size="6" style={{fontSize: '11px', fontWeight: 'bold', textAlign: 'right'}}>
                        {metabolicStoresRef.current.glycogen_liver.toFixed(0)}g
                        <IonProgressBar value={metabolicStoresRef.current.glycogen_liver / 100} color="warning" style={{height: '4px', marginTop: '2px'}}></IonProgressBar>
                    </IonCol>
                </IonRow>
                <IonRow style={{marginBottom: '6px'}}>
                    <IonCol size="6" style={{fontSize: '11px', color: '#666'}}>Muscle Glycogen</IonCol>
                    <IonCol size="6" style={{fontSize: '11px', fontWeight: 'bold', textAlign: 'right'}}>
                        {metabolicStoresRef.current.glycogen_muscle.toFixed(0)}g
                        <IonProgressBar value={metabolicStoresRef.current.glycogen_muscle / 400} color="warning" style={{height: '4px', marginTop: '2px'}}></IonProgressBar>
                    </IonCol>
                </IonRow>
                <IonRow style={{marginBottom: '6px'}}>
                    <IonCol size="6" style={{fontSize: '11px', color: '#666'}}>Body Fat</IonCol>
                    <IonCol size="6" style={{fontSize: '11px', fontWeight: 'bold', textAlign: 'right'}}>
                        {((metabolicStoresRef.current.adipose_triglycerides / 1000 / 80) * 100).toFixed(1)}%
                        <IonProgressBar value={(metabolicStoresRef.current.adipose_triglycerides / 1000 / 80)} color="tertiary" style={{height: '4px', marginTop: '2px'}}></IonProgressBar>
                    </IonCol>
                </IonRow>
            </IonGrid>
        </div>

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
