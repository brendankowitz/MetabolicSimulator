import React from 'react';
import './AnatomyView.css';

interface AnatomyProps {
  atp: number;       
  inflammation: number; 
  methylation: number;  
  nad: number;       
  onOrganClick: (organ: string) => void;
}

const AnatomyView: React.FC<AnatomyProps> = ({ atp, inflammation, methylation, nad, onOrganClick }) => {
  
  // Status Logic
  const getStatusClass = (val: number, type: 'energy' | 'stress' | 'methyl') => {
      if (type === 'energy') return val > 4.0 ? 'glow-good' : val > 2.0 ? 'glow-warn' : 'glow-bad';
      if (type === 'stress') return val < 0.001 ? 'glow-good' : 'glow-bad';
      if (type === 'methyl') return val > 0.05 ? 'glow-good' : 'glow-bad';
      return '';
  };

  const getFillColor = (statusClass: string) => {
      if (statusClass === 'glow-good') return '#00ff9d';
      if (statusClass === 'glow-warn') return '#f1c40f';
      return '#ff0055';
  };

  const energyStatus = getStatusClass(atp, 'energy');
  const stressStatus = getStatusClass(inflammation, 'stress');
  const methylStatus = getStatusClass(methylation, 'methyl');
  
  // NAD+ controls the global aura color
  const auraColor = nad > 0.8 ? '#00f3ff' : '#bdc3c7';

  return (
    <div className="anatomy-container">
      <svg viewBox="0 0 240 460" className="human-svg">
        <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a3e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#151520" stopOpacity="0.4" />
            </linearGradient>
            <filter id="auraGlow">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={auraColor} floodOpacity="0.5"/>
            </filter>
        </defs>

        {/* Human Silhouette - Clean outline matching person.jpg */}
        <g>
          {/* Head */}
          <circle cx="120" cy="32" r="15"
                  fill="url(#bodyGradient)"
                  stroke={auraColor}
                  strokeWidth="2"
                  filter="url(#auraGlow)" />

          {/* Body continuous outline */}
          <path d="
            M110,45
            L110,65
            L85,72
            L85,168
            L90,172
            L58,180
            L56,185
            L60,185
            L90,177
            L95,250
            L100,350
            L102,420
            L110,420
            L110,355
            L112,280
            L115,200
            L118,280
            L120,355
            L122,280
            L125,200
            L128,280
            L130,355
            L130,420
            L138,420
            L140,350
            L145,250
            L150,177
            L180,185
            L184,185
            L182,180
            L150,172
            L155,168
            L155,72
            L130,65
            L130,45
            Z
          "
          fill="url(#bodyGradient)"
          stroke={auraColor}
          strokeWidth="2"
          strokeLinejoin="round"
          filter="url(#auraGlow)" />
        </g>

        {/* Brain Node */}
        <g className={`organ-group ${methylStatus}`} onClick={() => onOrganClick('Brain')}>
          <circle cx="120" cy="55" r="14" className="organ-circle" fill={getFillColor(methylStatus)} fillOpacity="0.2" />
          <circle cx="120" cy="55" r="6" fill={getFillColor(methylStatus)} />
          <text x="150" y="58" className="organ-label" fill="#fff" fontSize="10">BRAIN</text>
          <line x1="134" y1="55" x2="148" y2="55" stroke="rgba(255,255,255,0.3)" />
        </g>

        {/* Heart Node */}
        <g className={`organ-group ${energyStatus}`} onClick={() => onOrganClick('Heart')}>
          <circle cx="130" cy="130" r="12" className="organ-circle" fill={getFillColor(energyStatus)} fillOpacity="0.2" />
          <circle cx="130" cy="130" r="5" fill={getFillColor(energyStatus)} />
          <text x="160" y="133" className="organ-label" fill="#fff" fontSize="10">HEART</text>
          <line x1="142" y1="130" x2="158" y2="130" stroke="rgba(255,255,255,0.3)" />
        </g>

        {/* Liver Node */}
        <g className={`organ-group ${stressStatus}`} onClick={() => onOrganClick('Liver')}>
          <circle cx="100" cy="170" r="16" className="organ-circle" fill={getFillColor(stressStatus)} fillOpacity="0.2" />
          <circle cx="100" cy="170" r="7" fill={getFillColor(stressStatus)} />
          <text x="50" y="173" className="organ-label" fill="#fff" fontSize="10" textAnchor="end">LIVER</text>
          <line x1="84" y1="170" x2="52" y2="170" stroke="rgba(255,255,255,0.3)" />
        </g>

        {/* Muscle Node */}
        <g className={`organ-group ${energyStatus}`} onClick={() => onOrganClick('Muscle')}>
          <circle cx="150" cy="220" r="14" className="organ-circle" fill={getFillColor(energyStatus)} fillOpacity="0.2" />
          <circle cx="150" cy="220" r="6" fill={getFillColor(energyStatus)} />
          <text x="180" y="223" className="organ-label" fill="#fff" fontSize="10">MUSCLE</text>
          <line x1="164" y1="220" x2="178" y2="220" stroke="rgba(255,255,255,0.3)" />
        </g>

        {/* Connections (Veins) */}
        {/* Brain -> Heart */}
        <path d="M120,69 Q120,100 130,118" stroke={getFillColor(methylStatus)} strokeWidth="2" fill="none" strokeDasharray="4 4" className="pulse-path" />
        
        {/* Heart -> Liver */}
        <path d="M130,142 Q130,160 116,170" stroke={getFillColor(energyStatus)} strokeWidth="2" fill="none" strokeDasharray="4 4" className="pulse-path" />

        {/* Liver -> Muscle */}
        <path d="M116,170 Q130,190 150,206" stroke={getFillColor(stressStatus)} strokeWidth="2" fill="none" strokeDasharray="4 4" className="pulse-path" />

      </svg>
    </div>
  );
};

export default AnatomyView;