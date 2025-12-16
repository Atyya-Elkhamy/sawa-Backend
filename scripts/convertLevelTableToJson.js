#!/usr/bin/env node

/**
 * Script to convert level_table_with_commas.csv to optimized JSON format
 * Usage: node scripts/convertLevelTableToJson.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Parses a comma-separated number string (e.g., "1,000") to a regular number
 * @param {string} value - The comma-separated number string
 * @returns {number} - The parsed number
 */
const parseCommaSeparatedNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove quotes and commas, then parse as integer
    return parseInt(value.replace(/[",]/g, ''), 10) || 0;
  }
  return 0;
};

/**
 * Parse CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} - Parsed values
 */
const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
};

/**
 * Main conversion function
 */
const convertCsvToJson = () => {
  try {
    // Define paths
    const csvPath = path.join(__dirname, '../src/data/level_table_with_commas.csv');
    const outputPath = path.join(__dirname, '../src/data/levelTable.json');
    
    console.log('Reading CSV file from:', csvPath);
    
    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found at:', csvPath);
      console.log('Looking for CSV file in root directory...');
      
      const rootCsvPath = path.join(__dirname, '../level_table_with_commas.csv');
      if (fs.existsSync(rootCsvPath)) {
        console.log('Found CSV file in root directory:', rootCsvPath);
        // Copy it to the data directory first
        const dataDir = path.join(__dirname, '../src/data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.copyFileSync(rootCsvPath, csvPath);
        console.log('Copied CSV file to data directory');
      } else {
        console.error('CSV file not found in root directory either');
        process.exit(1);
      }
    }
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row and filter out empty lines
    const dataLines = lines.slice(1).filter(line => line.trim() && !line.startsWith(','));
    
    console.log(`Processing ${dataLines.length} data rows...`);
    
    // Parse data into structured format
    const levelData = dataLines.map(line => {
      const [level, minimumAmount, nextLevelAmount, difference] = parseCsvLine(line);
      
      return {
        level: parseInt(level, 10),
        minimumAmount: parseCommaSeparatedNumber(minimumAmount),
        nextLevelAmount: parseCommaSeparatedNumber(nextLevelAmount),
        difference: parseCommaSeparatedNumber(difference)
      };
    }).filter(item => !isNaN(item.level)); // Filter out invalid entries
    
    // Create optimized data structure
    const optimizedData = {
      metadata: {
        maxLevel: Math.max(...levelData.map(item => item.level)),
        minLevel: Math.min(...levelData.map(item => item.level)),
        totalLevels: levelData.length,
        generatedAt: new Date().toISOString(),
        version: "1.0.0"
      },
      levels: levelData,
      // Create lookup maps for faster access
      levelToMinAmount: {},
      amountToLevel: [] // Sorted array for binary search
    };
    
    // Build lookup maps
    levelData.forEach(item => {
      optimizedData.levelToMinAmount[item.level] = item.minimumAmount;
    });
    
    // Create sorted array for amount-to-level lookup (for binary search)
    optimizedData.amountToLevel = levelData
      .map(item => ({
        amount: item.minimumAmount,
        level: item.level
      }))
      .sort((a, b) => a.amount - b.amount);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('Created output directory:', outputDir);
    }
    
    // Write JSON file
    fs.writeFileSync(outputPath, JSON.stringify(optimizedData, null, 2));
    
    console.log('✅ Successfully converted CSV to JSON!');
    console.log('📊 Statistics:');
    console.log(`   - Total levels: ${optimizedData.metadata.totalLevels}`);
    console.log(`   - Level range: ${optimizedData.metadata.minLevel} - ${optimizedData.metadata.maxLevel}`);
    console.log(`   - Output file: ${outputPath}`);
    console.log(`   - File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
    // Validate the conversion by checking a few key values
    console.log('\n🔍 Validation:');
    console.log(`   - Level 0 min amount: ${optimizedData.levelToMinAmount[0]}`);
    console.log(`   - Level 1 min amount: ${optimizedData.levelToMinAmount[1]}`);
    console.log(`   - Level 100 min amount: ${optimizedData.levelToMinAmount[100]}`);
    console.log(`   - Max level min amount: ${optimizedData.levelToMinAmount[optimizedData.metadata.maxLevel]}`);
    
  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error.message);
    process.exit(1);
  }
};

// Run the conversion
if (require.main === module) {
  convertCsvToJson();
}

module.exports = { convertCsvToJson };
