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

        // CORTISOL: Realistic circadian rhythm with afternoon dip
        // - Peak: 6-8am (Cortisol Awakening Response)
        // - Morning decline: 8am-12pm
        // - AFTERNOON DIP: 2-4pm (lowest - causes "3pm slump")
        // - Small evening rise: 5-7pm ("second wind")
        // - Night low: 10pm-5am
        let cortisolMult: number;
        if (hour >= 6 && hour < 8) {
            // Morning peak (CAR - Cortisol Awakening Response)
            cortisolMult = 1.3 + 0.2 * Math.sin((hour - 6) * Math.PI / 4);
        } else if (hour >= 8 && hour < 14) {
            // Morning decline
            cortisolMult = 1.4 - (hour - 8) * 0.1;
        } else if (hour >= 14 && hour < 17) {
            // AFTERNOON SLUMP - lowest cortisol of the day
            // This is why you feel tired at 3pm!
            cortisolMult = 0.7 - 0.15 * Math.sin((hour - 14) * Math.PI / 3);
        } else if (hour >= 17 && hour < 20) {
            // Evening "second wind" - small cortisol bump
            cortisolMult = 0.7 + 0.15 * Math.sin((hour - 17) * Math.PI / 6);
        } else if (hour >= 20 || hour < 2) {
            // Night decline toward sleep
            cortisolMult = 0.6;
        } else {
            // Deep night (2am-6am) - lowest
            cortisolMult = 0.4;
        }

        // Melatonin: Peaks at 2am, Low during day
        const melatoninMult = hour < 7 || hour > 22 ? 2.0 : 0.1;

        // NAD+ Recycling (NAMPT): Peaks at night
        const namptMult = hour < 6 || hour > 20 ? 1.3 : 0.8;

        // Adenosine pressure: Builds throughout wakefulness (promotes sleepiness)
        // Resets during sleep
        const wakeHours = hour >= 7 ? hour - 7 : hour + 17; // Hours since wake
        const adenosineMult = Math.min(2.0, 1.0 + wakeHours * 0.08);

        return {
            'cortisol': cortisolMult,
            'gsh_cyto': melatoninMult, // Melatonin boosts GSH activity
            'nampt': namptMult,
            'adenosine': adenosineMult // Sleep pressure accumulation
        };
    }

    public getEventsForTimeWindow(startMin: number, endMin: number): ScheduleEvent[] {
        // Handle wrap-around midnight
        if (endMin < startMin) {
            // We crossed midnight - check both ranges
            return this.schedule.filter(e =>
                e.timeMinutes >= startMin || e.timeMinutes < endMin
            );
        }
        return this.schedule.filter(e => e.timeMinutes >= startMin && e.timeMinutes < endMin);
    }

    /**
     * Check if currently in sleep period
     */
    public isAsleep(minutes: number): boolean {
        const wakeTime = this.parseTimeString((scheduleData as any).WakeTime || "07:00");
        const sleepTime = this.parseTimeString((scheduleData as any).SleepTime || "23:00");

        // Sleep period crosses midnight (e.g., 23:00 - 07:00)
        if (sleepTime > wakeTime) {
            return minutes >= sleepTime || minutes < wakeTime;
        }
        return minutes >= sleepTime && minutes < wakeTime;
    }

    /**
     * Check if currently exercising (within exercise event duration)
     */
    public getActiveExercise(minutes: number): ScheduleEvent | null {
        for (const event of this.schedule) {
            if (event.type === 'Exercise') {
                const duration = event.payload?.DurationMinutes || 60;
                const endTime = event.timeMinutes + duration;

                // Handle midnight wrap
                if (endTime > 1440) {
                    if (minutes >= event.timeMinutes || minutes < (endTime - 1440)) {
                        return event;
                    }
                } else {
                    if (minutes >= event.timeMinutes && minutes < endTime) {
                        return event;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Get minutes since last meal (for fasting state)
     */
    public getMinutesSinceLastMeal(currentMinutes: number): number {
        const meals = this.schedule.filter(e => e.type === 'Meal');
        if (meals.length === 0) return 1440; // No meals = always fasted

        let minTimeSince = 1440;
        for (const meal of meals) {
            let timeSince = currentMinutes - meal.timeMinutes;
            if (timeSince < 0) timeSince += 1440;
            if (timeSince < minTimeSince) minTimeSince = timeSince;
        }
        return minTimeSince;
    }

    private parseTimeString(timeStr: string): number {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
}
