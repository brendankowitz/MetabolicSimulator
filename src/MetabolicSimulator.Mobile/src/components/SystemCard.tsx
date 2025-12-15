import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import {
  flashOutline as brainIcon,
  heartOutline as heartIcon,
  barbellOutline as muscleIcon,
  waterOutline as liverIcon,
  nutritionOutline as gutIcon
} from 'ionicons/icons';

interface SystemCardProps {
  systemId: string;
  systemName: string;
  healthScore: number; // 0-100
  keyMetrics: { name: string; value: number; status: 'good' | 'warning' | 'bad' }[];
  onClick: () => void;
  scoreDelta?: number; // Change since last update - positive = improving, negative = declining
}

const SystemCard: React.FC<SystemCardProps> = ({ systemId, systemName, healthScore, keyMetrics, onClick, scoreDelta = 0 }) => {

  const getIcon = () => {
    switch(systemId) {
      case 'Brain': return brainIcon;
      case 'Heart': return heartIcon;
      case 'Muscle': return muscleIcon;
      case 'Liver': return liverIcon;
      case 'Gut': return gutIcon;
      default: return gutIcon;
    }
  };

  const getHealthColor = () => {
    if (healthScore >= 75) return '#2ecc71';
    if (healthScore >= 50) return '#3498db';
    if (healthScore >= 25) return '#f39c12';
    return '#e74c3c';
  };

  const getHealthLabel = () => {
    if (healthScore >= 75) return 'Excellent';
    if (healthScore >= 50) return 'Good';
    if (healthScore >= 25) return 'Fair';
    return 'Poor';
  };

  const healthColor = getHealthColor();
  const healthLabel = getHealthLabel();

  return (
    <IonCard
      onClick={onClick}
      style={{
        margin: '8px',
        borderRadius: '16px',
        boxShadow: scoreDelta > 2 
          ? '0 4px 20px rgba(46, 204, 113, 0.4)'  // Green glow when improving
          : scoreDelta < -2 
            ? '0 4px 20px rgba(231, 76, 60, 0.4)'  // Red glow when declining
            : '0 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.3s',
        border: scoreDelta > 2 
          ? '2px solid #2ecc71'   // Green border when improving
          : scoreDelta < -2 
            ? '2px solid #e74c3c'  // Red border when declining
            : `2px solid ${healthColor}20`,
        animation: Math.abs(scoreDelta) > 2 ? 'pulse 1s ease-in-out' : 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
    >
      <IonCardContent style={{padding: '16px'}}>
        {/* Header with Icon and Status */}
        <div style={{display: 'flex', alignItems: 'center', marginBottom: '12px'}}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${healthColor}22, ${healthColor}44)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <IonIcon
              icon={getIcon()}
              style={{
                fontSize: '28px',
                color: healthColor
              }}
            />
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2c3e50'}}>{systemName}</div>
            <div style={{fontSize: '13px', fontWeight: '600', color: healthColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px'}}>
              {healthLabel} ({healthScore}%)
              {scoreDelta !== 0 && Math.abs(scoreDelta) > 0.5 && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: scoreDelta > 0 ? '#2ecc71' : '#e74c3c',
                  background: scoreDelta > 0 ? '#2ecc7122' : '#e74c3c22',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{marginTop: '12px'}}>
          {keyMetrics.map((metric, idx) => {
            const statusColor = metric.status === 'good' ? '#2ecc71' :
                               metric.status === 'warning' ? '#f39c12' : '#e74c3c';
            return (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: idx < keyMetrics.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <div style={{fontSize: '11px', color: '#666'}}>{metric.name}</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: statusColor,
                    marginRight: '6px'
                  }} />
                  <span style={{fontSize: '12px', fontWeight: '600', color: '#333'}}>
                    {metric.value.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tap to expand indicator */}
        <div style={{
          marginTop: '12px',
          fontSize: '10px',
          color: '#95a5a6',
          textAlign: 'center'
        }}>
          Tap for details →
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default SystemCard;
