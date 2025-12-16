// utils/levelTable.js

const levelTableData = require('../data/levelTable.json');
const logger = require('../config/logger');

/**
 * Cached level data for fast access
 */
let levelCache = null;
let amountToLevelCache = null;
let levelToMinAmountCache = null;

/**
 * Initialize the level caches for fast lookups
 */
const initializeCaches = () => {
  if (!levelCache) {
    levelCache = levelTableData.levels;
    amountToLevelCache = levelTableData.amountToLevel;
    levelToMinAmountCache = levelTableData.levelToMinAmount;
    
    logger.info(`Level table cache initialized with ${levelCache.length} levels (0-${levelTableData.metadata.maxLevel})`);
  }
};

/**
 * Gets level data for a specific level
 * @param {number} level - The level to get data for
 * @returns {object|null} - The level data object or null if not found
 */
const getLevelData = (level) => {
  initializeCaches();
  return levelCache.find(item => item.level === level) || null;
};

/**
 * Gets the minimum amount required for a specific level using O(1) lookup
 * @param {number} level - The level to get minimum amount for
 * @returns {number} - The minimum amount required
 */
const getMinimumAmountForLevel = (level) => {
  initializeCaches();
  
  if (level < 0) return 0;
  if (level > levelTableData.metadata.maxLevel) {
    return levelToMinAmountCache[levelTableData.metadata.maxLevel] || 0;
  }
  
  return levelToMinAmountCache[level] || 0;
};

/**
 * Calculates the level based on total amount using binary search O(log n)
 * @param {number} totalAmount - The total points/amount
 * @returns {number} - The calculated level
 */
const calculateLevelFromAmount = (totalAmount) => {
  initializeCaches();
  
  if (totalAmount < 0) return 0;
  
  // Binary search for the highest level where totalAmount >= minimumAmount
  let left = 0;
  let right = amountToLevelCache.length - 1;
  let result = 0;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midAmount = amountToLevelCache[mid].amount;
    
    if (midAmount <= totalAmount) {
      result = amountToLevelCache[mid].level;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return result;
};

/**
 * Gets the remaining amount needed to reach the next level
 * @param {number} totalAmount - The current total amount
 * @param {number} currentLevel - The current level
 * @returns {object} - Object containing remainingAmount, currentPoints, and minPointsNextLevel
 */
const getRemainingAmountToNextLevel = (totalAmount, currentLevel) => {
  initializeCaches();
  
  const maxLevel = levelTableData.metadata.maxLevel;
  
  if (currentLevel >= maxLevel) {
    const currentLevelData = getLevelData(maxLevel);
    const prevLevelData = getLevelData(maxLevel - 1);
    const levelRange = currentLevelData.minimumAmount - (prevLevelData ? prevLevelData.minimumAmount : 0);
    
    return {
      remainingAmount: 0,
      currentPoints: levelRange,
      minPointsNextLevel: levelRange,
    };
  }

  if (currentLevel === 0) {
    const nextLevelData = getLevelData(1);
    const remainingAmount = nextLevelData ? nextLevelData.minimumAmount - totalAmount : 0;
    
    return {
      remainingAmount: Math.max(0, remainingAmount),
      currentPoints: totalAmount,
      minPointsNextLevel: nextLevelData ? nextLevelData.minimumAmount : 0,
    };
  }

  const nextLevel = currentLevel + 1;
  const nextLevelData = getLevelData(nextLevel);
  const currentLevelData = getLevelData(currentLevel);
  
  if (!nextLevelData || !currentLevelData) {
    return {
      remainingAmount: 0,
      currentPoints: 0,
      minPointsNextLevel: 0,
    };
  }

  const remainingAmount = nextLevelData.minimumAmount - totalAmount;
  const currentPoints = totalAmount - currentLevelData.minimumAmount;
  const requiredPointsForLevel = nextLevelData.minimumAmount - currentLevelData.minimumAmount;

  return {
    remainingAmount: Math.max(0, remainingAmount),
    currentPoints: Math.max(0, currentPoints),
    minPointsNextLevel: requiredPointsForLevel,
  };
};

/**
 * Gets the maximum level from the table
 * @returns {number} - The maximum level
 */
const getMaxLevel = () => {
  return levelTableData.metadata.maxLevel;
};

/**
 * Gets the minimum level from the table
 * @returns {number} - The minimum level
 */
const getMinLevel = () => {
  return levelTableData.metadata.minLevel;
};

/**
 * Gets metadata about the level table
 * @returns {object} - The metadata object
 */
const getMetadata = () => {
  return levelTableData.metadata;
};

/**
 * Gets all level data (use sparingly, prefer specific lookups)
 * @returns {Array} - Array of all level data
 */
const getAllLevels = () => {
  initializeCaches();
  return levelCache;
};

/**
 * Validates if a level exists in the table
 * @param {number} level - The level to validate
 * @returns {boolean} - True if level exists
 */
const isValidLevel = (level) => {
  return level >= levelTableData.metadata.minLevel && level <= levelTableData.metadata.maxLevel;
};

module.exports = {
  getLevelData,
  getMinimumAmountForLevel,
  calculateLevelFromAmount,
  getRemainingAmountToNextLevel,
  getMaxLevel,
  getMinLevel,
  getMetadata,
  getAllLevels,
  isValidLevel,
};
