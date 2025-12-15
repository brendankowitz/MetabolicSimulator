namespace MetabolicSimulator.Infrastructure.Simulation;

/// <summary>
/// Fourth-order Runge-Kutta (RK4) ODE solver for metabolic simulations.
/// </summary>
public class RungeKuttaSolver
{
    /// <summary>
    /// Performs a single RK4 integration step.
    /// </summary>
    /// <param name="y">Current state vector (concentrations).</param>
    /// <param name="t">Current time.</param>
    /// <param name="dt">Time step.</param>
    /// <param name="derivatives">Function computing derivatives (dy/dt).</param>
    /// <returns>New state vector after one time step.</returns>
    public double[] Step(
        double[] y,
        double t,
        double dt,
        Func<double[], double, double[]> derivatives)
    {
        int n = y.Length;
        
        // k1 = f(y, t)
        double[] k1 = derivatives(y, t);
        
        // k2 = f(y + dt/2 * k1, t + dt/2)
        double[] y2 = new double[n];
        for (int i = 0; i < n; i++)
            y2[i] = y[i] + dt / 2 * k1[i];
        double[] k2 = derivatives(y2, t + dt / 2);
        
        // k3 = f(y + dt/2 * k2, t + dt/2)
        double[] y3 = new double[n];
        for (int i = 0; i < n; i++)
            y3[i] = y[i] + dt / 2 * k2[i];
        double[] k3 = derivatives(y3, t + dt / 2);
        
        // k4 = f(y + dt * k3, t + dt)
        double[] y4 = new double[n];
        for (int i = 0; i < n; i++)
            y4[i] = y[i] + dt * k3[i];
        double[] k4 = derivatives(y4, t + dt);
        
        // y_new = y + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        double[] yNew = new double[n];
        for (int i = 0; i < n; i++)
        {
            yNew[i] = y[i] + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
            
            // Ensure concentrations don't go negative
            if (yNew[i] < 0)
                yNew[i] = 0;
        }
        
        return yNew;
    }
    
    /// <summary>
    /// Integrates the ODE system over a time range.
    /// </summary>
    /// <param name="y0">Initial state vector.</param>
    /// <param name="tStart">Start time.</param>
    /// <param name="tEnd">End time.</param>
    /// <param name="dt">Time step.</param>
    /// <param name="derivatives">Function computing derivatives.</param>
    /// <param name="outputInterval">Interval for recording output.</param>
    /// <returns>List of (time, state) tuples at output intervals.</returns>
    public List<(double Time, double[] State)> Integrate(
        double[] y0,
        double tStart,
        double tEnd,
        double dt,
        Func<double[], double, double[]> derivatives,
        double outputInterval)
    {
        var results = new List<(double Time, double[] State)>();
        double[] y = (double[])y0.Clone();
        double t = tStart;
        double lastOutput = tStart;
        
        // Record initial state
        results.Add((t, (double[])y.Clone()));
        
        while (t < tEnd)
        {
            y = Step(y, t, dt, derivatives);
            t += dt;
            
            // Record at output intervals
            if (t - lastOutput >= outputInterval || t >= tEnd)
            {
                results.Add((t, (double[])y.Clone()));
                lastOutput = t;
            }
        }
        
        return results;
    }
}
