namespace MetabolicSimulator.Domain.Entities;

public enum Gender { Male, Female }

/// <summary>
/// Represents the basic biological parameters of the user.
/// </summary>
public record UserProfile(
    int Age,
    double WeightKg,
    double HeightCm,
    Gender Gender,
    double SleepHours,
    double SleepQuality)
{
    public double BMI => WeightKg / Math.Pow(HeightCm / 100.0, 2);
    
    // Biological age adjustment with Sleep Penalty
    public double OxidativeStressMultiplier 
    {
        get 
        {
            var ageFactor = 1.0 + (Age > 40 ? (Age - 40) * 0.02 : 0);
            var sleepPenalty = (SleepQuality < 70 || SleepHours < 6) ? 1.2 : 1.0;
            return ageFactor * sleepPenalty;
        }
    }

    public double NadDeclineFactor => 1.0 - (Age > 30 ? (Age - 30) * 0.015 : 0); // 1.5% drop per year after 30
}
