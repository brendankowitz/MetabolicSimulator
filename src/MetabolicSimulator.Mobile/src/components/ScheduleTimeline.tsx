import React from 'react';
import scheduleData from '../data/schedule.json';

interface ScheduleTimelineProps {
  currentTime: number; // Minutes from midnight
}

interface ScheduleEvent {
  startMinutes: number;
  endMinutes: number;
  type: 'sleep' | 'meal' | 'exercise' | 'wake';
  label: string;
  color: string;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ currentTime }) => {

  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const wakeTime = parseTime(scheduleData.WakeTime);
  const sleepTime = parseTime(scheduleData.SleepTime);

  // Build events array
  const events: ScheduleEvent[] = [];

  // Sleep periods (night before and after)
  // Morning sleep: 0:00 -> WakeTime
  events.push({
    startMinutes: 0,
    endMinutes: wakeTime,
    type: 'sleep',
    label: 'Sleep',
    color: '#5c6bc0'
  });

  // Evening sleep: SleepTime -> 24:00
  events.push({
    startMinutes: sleepTime,
    endMinutes: 1440,
    type: 'sleep',
    label: 'Sleep',
    color: '#5c6bc0'
  });

  // Add schedule events
  scheduleData.Events.forEach((e: any) => {
    const startMinutes = parseTime(e.Time);
    let duration = 30; // Default duration for meals

    if (e.Type === 'Exercise' && e.Payload?.DurationMinutes) {
      duration = e.Payload.DurationMinutes;
    } else if (e.Type === 'Meal') {
      duration = 45; // Meal duration
    }

    events.push({
      startMinutes,
      endMinutes: startMinutes + duration,
      type: e.Type.toLowerCase() as 'meal' | 'exercise',
      label: e.Description,
      color: e.Type === 'Meal' ? '#4caf50' : '#ff9800'
    });
  });

  // Sort events by start time
  events.sort((a, b) => a.startMinutes - b.startMinutes);

  const formatTimeShort = (minutes: number): string => {
    const h = Math.floor(minutes / 60) % 24;
    const ampm = h >= 12 ? 'p' : 'a';
    const h12 = h % 12 || 12;
    return `${h12}${ampm}`;
  };

  const currentPercent = (currentTime / 1440) * 100;

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Timeline bar */}
      <div style={{
        position: 'relative',
        height: '28px',
        background: '#f5f5f5',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        {/* Event segments */}
        {events.map((event, idx) => {
          const leftPercent = (event.startMinutes / 1440) * 100;
          const widthPercent = ((event.endMinutes - event.startMinutes) / 1440) * 100;

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                height: '100%',
                background: event.color,
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
              title={`${event.label} (${formatTimeShort(event.startMinutes)}-${formatTimeShort(event.endMinutes)})`}
            >
              {widthPercent > 4 && (
                <span style={{
                  fontSize: '9px',
                  color: '#fff',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 2px'
                }}>
                  {event.type === 'sleep' ? '' : event.label}
                </span>
              )}
            </div>
          );
        })}

        {/* Current time indicator */}
        <div style={{
          position: 'absolute',
          left: `${currentPercent}%`,
          top: 0,
          width: '3px',
          height: '100%',
          background: '#e91e63',
          boxShadow: '0 0 6px #e91e63',
          zIndex: 10,
          transform: 'translateX(-50%)'
        }} />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '6px',
        fontSize: '9px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#5c6bc0' }} />
          <span style={{ color: '#666' }}>Sleep</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4caf50' }} />
          <span style={{ color: '#666' }}>Meal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff9800' }} />
          <span style={{ color: '#666' }}>Exercise</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '3px', height: '10px', background: '#e91e63', boxShadow: '0 0 3px #e91e63' }} />
          <span style={{ color: '#666' }}>Now</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimeline;
