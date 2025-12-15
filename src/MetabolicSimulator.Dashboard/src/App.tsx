import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Reference Ranges (Hardcoded for Prototype) ---
const REFERENCE_RANGES: Record<string, { normMin: number; normMax: number; optMin: number; optMax: number }> = {
  atp_cyto: { normMin: 2.0, normMax: 5.0, optMin: 4.0, optMax: 6.0 },
  nad_plus_mito: { normMin: 0.3, normMax: 0.8, optMin: 0.8, optMax: 1.2 },
  gsh_cyto: { normMin: 2.0, normMax: 5.0, optMin: 5.0, optMax: 8.0 },
  hcy: { normMin: 0.005, normMax: 0.015, optMin: 0.005, optMax: 0.007 }, // Low is good
  sam: { normMin: 0.02, normMax: 0.08, optMin: 0.06, optMax: 0.10 }
};

const GROUPS = {
  energy: ['atp_cyto', 'nadh_mito', 'nad_plus_mito', 'glucose_cell', 'pyruvate', 'acetyl_coa'],
  methylation: ['sam', 'sah', 'hcy', 'methyl_thf', 'met'],
  inflammation: ['ros', 'gsh_cyto', 'gssg_cyto', 'nfkb_active', 'cortisol'],
  krebs: ['citrate', 'alpha_kg', 'succinate', 'fumarate', 'malate'],
  lipids: ['fatty_acids_blood', 'fatty_acyl_coa', 'carnitine', 'acyl_carnitine'],
  longevity: ['mtor_active', 'ampk_active', 'leucine', 'insulin'],
  waste: ['ammonia', 'urea', 'citrulline', 'arginine']
};

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('energy');
  const [chartData, setChartData] = useState<any>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        setData(rows);
        setLabels(rows.map((r: any) => r.Time.toString()));
      },
    });
  };

  useEffect(() => {
    if (data.length === 0) return;

    const keysToGraph = selectedGroup === 'all'
      ? Object.keys(data[0]).filter(k => k !== 'Time')
      : GROUPS[selectedGroup as keyof typeof GROUPS];

    const datasets = keysToGraph.map((key, index) => {
      if (data[0][key] === undefined) return null;

      const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
      return {
        label: key,
        data: data.map((row: any) => row[key]),
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      };
    }).filter(d => d !== null);

    setChartData({
      labels,
      datasets
    });
  }, [data, selectedGroup, labels]);

  const latest = data.length > 0 ? data[data.length - 1] : {};

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>🧬 Metabolic Digital Twin (React Dashboard)</h1>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Upload Simulation Data</h3>
        <p style={{ color: '#666' }}>Select <code>whole_body_simulation.csv</code></p>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      {data.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <KpiCard id="atp_cyto" label="ATP Energy" value={latest.atp_cyto} unit="mM" />
            <KpiCard id="nad_plus_mito" label="Mito NAD+" value={latest.nad_plus_mito} unit="mM" />
            <KpiCard id="sam" label="SAM (Methyl)" value={latest.sam} unit="mM" />
            <KpiCard id="gsh_cyto" label="Glutathione" value={latest.gsh_cyto} unit="mM" />
            <KpiCard id="hcy" label="Homocysteine" value={latest.hcy} unit="mM" />
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>View Pathway:</label>
              <select 
                value={selectedGroup} 
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={{ padding: '8px', fontSize: '16px', borderRadius: '4px' }}
              >
                <option value="energy">Energy (ATP, NADH, Glucose)</option>
                <option value="methylation">Methylation (SAM, Hcy, 5-MTHF)</option>
                <option value="inflammation">Inflammation (ROS, GSH, NF-kB)</option>
                <option value="krebs">Krebs Cycle (Citrate, Succinate)</option>
                <option value="lipids">Lipids (Fatty Acids, Carnitine)</option>
                <option value="longevity">Longevity (mTOR, AMPK)</option>
                <option value="waste">Waste Management (Ammonia, Urea)</option>
                <option value="all">All Metabolites</option>
              </select>
            </div>
            
            {chartData && (
              <div style={{ height: '400px' }}>
                <Line 
                  data={chartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                      x: { title: { display: true, text: 'Time (seconds)' } },
                      y: { title: { display: true, text: 'Concentration (mM)' } }
                    }
                  }} 
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ id, label, value, unit }: { id: string, label: string, value: number | undefined, unit: string }) {
  if (value === undefined) return null;

  const range = REFERENCE_RANGES[id];
  let status = "Unknown";
  let color = "#7f8c8d"; // Grey

  if (range) {
    if (value >= range.optMin && value <= range.optMax) {
      status = "Optimal 🌟";
      color = "#27ae60"; // Green
    } else if (value >= range.normMin && value <= range.normMax) {
      status = "Normal ✅";
      color = "#2980b9"; // Blue
    } else {
      status = "Out of Range ⚠️";
      color = "#e74c3c"; // Red
    }
  }

  return (
    <div style={{ background: '#fff', border: `1px solid #eee`, padding: '15px', borderRadius: '6px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{value.toFixed(3)} <span style={{fontSize: '14px', fontWeight:'normal'}}>{unit}</span></div>
      {range && <div style={{ fontSize: '12px', color: color, marginTop: '5px', fontWeight: 'bold' }}>{status}</div>}
      {range && <div style={{ fontSize: '10px', color: '#95a5a6' }}>Target: {range.optMin}-{range.optMax}</div>}
    </div>
  );
}