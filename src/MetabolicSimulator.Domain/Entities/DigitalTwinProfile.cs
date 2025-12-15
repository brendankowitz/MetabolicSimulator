namespace MetabolicSimulator.Domain.Entities;

public class DigitalTwinProfile
{
    public string DisplayName { get; set; } = "User";
    public int Age { get; set; }
    public double WeightKg { get; set; }
    public double HeightCm { get; set; }
    public Gender Gender { get; set; }
    public double SleepHours { get; set; } = 7.5;
    public double SleepQuality { get; set; } = 85.0; // 0-100 scale (e.g. Sleep Score)
    public string? GeneticDataPath { get; set; }
    public List<LabResult> LabResults { get; set; } = new();

    public UserProfile ToUserProfile()
    {
        return new UserProfile(Age, WeightKg, HeightCm, Gender, SleepHours, SleepQuality);
    }
}

public class LabResult
{
    public string Name { get; set; }
    public double Value { get; set; }
    public string Unit { get; set; }
    public DateTime Date { get; set; }
}
