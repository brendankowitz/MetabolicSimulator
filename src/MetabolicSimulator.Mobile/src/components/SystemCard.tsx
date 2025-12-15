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
  healthScore: number;
  keyMetrics: { name: string; value: number; status: 'good' | 'warning' | 'bad' }[];
  onClick: () => void;
  scoreDelta?: number;
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

  const getPulseStyle = () => {
    if (scoreDelta > 2) {
      return {
        boxShadow: '0 4px 20px rgba(46, 204, 113, 0.5)',
        border: '2px solid #2ecc71'
      };
    } else if (scoreDelta < -2) {
      return {
        boxShadow: '0 4px 20px rgba(231, 76, 60, 0.5)',
        border: '2px solid #e74c3c'
      };
    }
    return {
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '2px solid ' + healthColor + '20'
    };
  };

  const pulseStyle = getPulseStyle();

  return (
    <IonCard
      onClick={onClick}
      style={{
        margin: '8px',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.3s, border 0.3s',
        ...pulseStyle
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = pulseStyle.boxShadow;
      }}
    >
      <IonCardContent style={{padding: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', marginBottom: '12px'}}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, ' + healthColor + '22, ' + healthColor + '44)',
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

        <div style={{
          height: '6px',
          background: '#e0e0e0',
          borderRadius: '3px',
          marginBottom: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: healthScore + '%',
            height: '100%',
            background: 'linear-gradient(90deg, ' + healthColor + '88, ' + healthColor + ')',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{marginTop: '8px'}}>
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
                    marginRight: '6px',
                    boxShadow: '0 0 4px ' + statusColor
                  }} />
                  <span style={{fontSize: '12px', fontWeight: '600', color: '#333'}}>
                    {metric.value.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '12px',
          fontSize: '10px',
          color: '#95a5a6',
          textAlign: 'center'
        }}>
          Tap for details
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default SystemCard;

