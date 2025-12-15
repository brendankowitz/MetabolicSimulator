namespace MetabolicSimulator.Domain.Entities;

public class DailySchedule
{
    public TimeSpan WakeTime { get; set; }
    public TimeSpan SleepTime { get; set; }
    public List<ScheduleEvent> Events { get; set; } = new();
}

public class ScheduleEvent
{
    public TimeSpan Time { get; set; }
    public EventType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, double> Payload { get; set; } = new();
}

public enum EventType
{
    Meal,
    Exercise,
    Sleep,
    Stress,
    Supplement,
    Therapy,
    Substance
}
