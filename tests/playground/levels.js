const fs = require('fs');

// Constants
const START_AMOUNT = 800; // Starting amount
const MAX_CHARGE_LEVEL = 200; // Maximum charge level
const END_AMOUNT = 1500000000; // 1.5 billion units

/**
 * Calculates the minimum amount required for a given charge level using a hybrid progression.
 * @param {number} level - The charge level to calculate the minimum amount for.
 * @returns {number} - The minimum amount required for the charge level.
 */
const calculateMinAmount = (level) => {
  if (level < 1) return 0; // Level 0 starts at 0 amount
  if (level === 2) return 2200; // Adjusted for new START_AMOUNT
  if (level > MAX_CHARGE_LEVEL) return END_AMOUNT;
  if (level === 1) return START_AMOUNT; // Level 1 starts at START_AMOUNT

  const progress = (level - 1) / (MAX_CHARGE_LEVEL - 1);
  const linearComponent = START_AMOUNT + (END_AMOUNT - START_AMOUNT) * progress;
  const exponent = 1.5 + level / MAX_CHARGE_LEVEL; // Dynamic exponent
  return Math.floor(linearComponent * progress ** exponent);
};

/**
 * Dynamically calculates the user's charge level based on total charged amount.
 * @param {number} totalAmount - The total amount the user has charged.
 * @returns {number} - The calculated charge level.
 */
const calculateChargeLevel = (totalAmount) => {
  if (totalAmount < START_AMOUNT) return 0;
  if (totalAmount >= END_AMOUNT) return MAX_CHARGE_LEVEL;

  // Handle the special case for Level 2
  if (totalAmount >= START_AMOUNT && totalAmount < 2200) {
    return 1;
  }
  if (totalAmount >= 2200 && totalAmount < calculateMinAmount(3)) {
    return 2;
  }
  // For Level 3 and above
  // Invert the calculateMinAmount function to find the level from totalAmount
  let level = 3;
  while (level <= MAX_CHARGE_LEVEL && totalAmount >= calculateMinAmount(level)) {
    level += 1;
  }
  return level - 1;
};

/**
 * Generates CSV data for charge levels
 * @returns {string} - CSV formatted string with level data
 */
const generateCsvData = () => {
  // CSV header
  let csvContent = 'Level,MinimumAmount,NextLevelAmount,Difference\n';

  // Generate data for each level
  for (let level = 0; level <= MAX_CHARGE_LEVEL; level++) {
    const minAmount = calculateMinAmount(level);
    const nextLevelAmount = calculateMinAmount(level + 1);
    const difference = nextLevelAmount - minAmount;

    // Format with commas for thousands
    const formattedMin = minAmount.toLocaleString();
    const formattedNext = nextLevelAmount.toLocaleString();
    const formattedDiff = difference.toLocaleString();

    csvContent += `${level},${formattedMin},${formattedNext},${formattedDiff}\n`;
  }

  return csvContent;
};

// Generate the CSV and write it to a file
const csvData = generateCsvData();
const outputPath = './charge_levels.csv';

fs.writeFileSync(outputPath, csvData);
console.log(`CSV file generated at: ${outputPath}`);

// Example usage - print a few sample levels
console.log('Sample charge levels:');
const sampleAmounts = [0, 1000, 2000, 2200, 5000, 10000, 100000, 1000000, END_AMOUNT];
sampleAmounts.forEach((amount) => {
  console.log(`Total Amount: ${amount.toLocaleString()}, Level: ${calculateChargeLevel(amount)}`);
});
