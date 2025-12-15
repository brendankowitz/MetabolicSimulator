import scheduleData from '../data/schedule.json';

export interface ScheduleEvent {
    timeMinutes: number; // 0 - 1440
    type: string;
    description: string;
    payload: any;
}

export class TimeController {
    private schedule: ScheduleEvent[] = [];

    constructor() {
        this.parseSchedule();
    }

    private parseSchedule() {
        // Convert "HH:mm" strings to minutes from midnight
        // Access 'Events' property from the JSON structure
        const events = (scheduleData as any).Events || [];
        this.schedule = events.map((e: any) => {
            const [h, m] = e.Time.split(':').map(Number);
            return {
                timeMinutes: h * 60 + m,
                type: e.Type,
                description: e.Description,
                payload: e.Payload
            };
        }).sort((a: ScheduleEvent, b: ScheduleEvent) => a.timeMinutes - b.timeMinutes);
    }

    /**
     * Gets the current simulation time in minutes based on real wall-clock time
     */
    public getRealTimeMinutes(): number {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    /**
     * Returns the active "State" (e.g. Fasted, Fed) based on the time
     * This modifies enzyme multipliers.
     */
    public getModifiersForTime(minutes: number): Record<string, number> {
        const hour = minutes / 60;
        
        // Circadian Rhythms (Sine Waves)
        // Cortisol: Peaks at 7am (7.0), Low at midnight
        // Formula: Peak at 7, Trough at 19. 
        const cortisolMult = 1.0 + 0.5 * Math.sin((Math.PI / 12) * (hour - 1)); // Simplified

        // Melatonin: Peaks at 2am, Low during day
        const melatoninMult = hour < 7 || hour > 22 ? 2.0 : 0.1;

        // NAD+ Recycling (NAMPT): Peaks at night
        const namptMult = hour < 6 || hour > 20 ? 1.3 : 0.8;

        return {
            'cortisol': cortisolMult,
            'gsh_cyto': melatoninMult, // Melatonin boosts GSH activity
            'nampt': namptMult
        };
    }

    public getEventsForTimeWindow(startMin: number, endMin: number): ScheduleEvent[] {
        // Handle wrap-around midnight if needed (omitted for simple MVP)
        return this.schedule.filter(e => e.timeMinutes >= startMin && e.timeMinutes < endMin);
    }
}
