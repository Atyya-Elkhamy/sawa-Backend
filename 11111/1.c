using System;
using System.Collections.Generic;
using UnityEngine;

public class PrizeSimulation : MonoBehaviour
{
    public void Start()
    {
        float keyCost = 100f;
        List<int> prizes = new List<int> { 1, 5, 8, 15, 50, 100, 300, 999 };
        float returnRate = 0.7f;

        TestScenario(keyCost, prizes, returnRate);
    }

    List<float> CalculatePrizeProbabilities(float keyCost, List<int> prizes, float returnRate)
    {
        float targetEv = keyCost * returnRate;
        List<float> probabilities = new List<float>();

        // Initial guess for each probability
        for (int i = 0; i < prizes.Count; i++)
        {
            probabilities.Add(1f / prizes.Count);
        }

        // Simple gradient descent (manual optimization)
        float learningRate = 0.001f;
        for (int iteration = 0; iteration < 10000; iteration++)
        {
            float ev = 0f;
            for (int i = 0; i < prizes.Count; i++)
            {
                ev += probabilities[i] * prizes[i];
            }

            if (Math.Abs(ev - targetEv) < 0.0001f)
                break;

            // Update probabilities to adjust towards targetEv
            for (int i = 0; i < probabilities.Count; i++)
            {
                float gradient = (ev - targetEv) * prizes[i];
                probabilities[i] -= learningRate * gradient;
                probabilities[i] = Mathf.Clamp(probabilities[i], 0, 1); // Keep probabilities between 0 and 1
            }

            // Normalize probabilities to sum to 1
            float sum = 0;
            for (int i = 0; i < probabilities.Count; i++)
            {
                sum += probabilities[i];
            }
            for (int i = 0; i < probabilities.Count; i++)
            {
                probabilities[i] /= sum;
            }
        }

        return probabilities;
    }

    Dictionary<int, int> SimulateGame(float keyCost, List<int> prizes, List<float> probabilities, int numSimulations)
    {
        float totalSpent = 0f;
        Dictionary<int, int> wonPrizesCount = new Dictionary<int, int>();
        float totalWon = 0f;

        // Initialize won prize counts
        foreach (var prize in prizes)
        {
            wonPrizesCount[prize] = 0;
        }

        // Run the simulation
        for (int i = 0; i < numSimulations; i++)
        {
            totalSpent += keyCost;

            // Simulate the outcome of the game
            float randomValue = UnityEngine.Random.value;
            float cumulativeProbability = 0f;

            for (int j = 0; j < prizes.Count; j++)
            {
                cumulativeProbability += probabilities[j];
                if (randomValue <= cumulativeProbability)
                {
                    int wonPrize = prizes[j];
                    totalWon += wonPrize;
                    wonPrizesCount[wonPrize]++;
                    break;
                }
            }
        }

        float actualReturnRate = totalWon / totalSpent;
        Debug.Log($"Actual Return Rate: {actualReturnRate:F6}");

        return wonPrizesCount;
    }

    void TestScenario(float keyCost, List<int> prizes, float returnRate)
    {
        Debug.Log($"\nScenario:");
        Debug.Log($"Key Cost: {keyCost}, Prizes: [{string.Join(", ", prizes)}], Return Rate: {returnRate}");

        // Calculate prize probabilities
        List<float> probabilities = CalculatePrizeProbabilities(keyCost, prizes, returnRate);

        // Display prize probabilities
        Debug.Log("\nPrize probabilities:");
        for (int i = 0; i < prizes.Count; i++)
        {
            Debug.Log($"Prize {prizes[i]}: {probabilities[i]:F6}");
        }

        // Calculate expected value
        float expectedValue = 0f;
        for (int i = 0; i < prizes.Count; i++)
        {
            expectedValue += probabilities[i] * prizes[i];
        }
        Debug.Log($"\nExpected value: {expectedValue:F6}");
        Debug.Log($"Target return: {keyCost * returnRate:F6}");

        // Simulate the game
        int numSimulations = 100000;
        Dictionary<int, int> wonPrizesCount = SimulateGame(keyCost, prizes, probabilities, numSimulations);

        // Display results
        Debug.Log("\nWon Prizes Count:");
        foreach (var kvp in wonPrizesCount)
        {
            Debug.Log($"Prize {kvp.Key}: {kvp.Value}");
        }
    }
}
