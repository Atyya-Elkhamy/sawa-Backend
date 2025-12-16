#!/usr/bin/env node

/**
 * Test script to verify the new level table system
 * Usage: node scripts/testLevelTable.js
 */

const path = require('path');

// Mock logger for testing
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
};

// Set up the require path
process.env.NODE_PATH = path.join(__dirname, '../src');
require('module').Module._initPaths();

// Mock the logger for the level table utility
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  if (args[0] === '../config/logger') {
    return mockLogger;
  }
  return originalRequire.apply(this, args);
};

// Now require the level table utility
const levelTable = require('../src/utils/levelTable');

console.log('🧪 Testing Level Table System\n');

// Test basic functionality
console.log('📊 Basic Information:');
console.log(`   Max Level: ${levelTable.getMaxLevel()}`);
console.log(`   Min Level: ${levelTable.getMinLevel()}`);
console.log(`   Metadata:`, levelTable.getMetadata());

console.log('\n🔍 Testing Level Calculations:');

// Test specific level calculations
const testCases = [
  { amount: 0, expectedLevel: 0 },
  { amount: 500, expectedLevel: 0 },
  { amount: 1000, expectedLevel: 1 },
  { amount: 3781, expectedLevel: 2 },
  { amount: 8843, expectedLevel: 3 },
  { amount: 50000, expectedLevel: null }, // We'll calculate this
  { amount: 1000000, expectedLevel: null },
  { amount: 36619486, expectedLevel: 100 },
  { amount: 202491569, expectedLevel: 200 },
  { amount: 999999999, expectedLevel: 200 },
];

testCases.forEach(({ amount, expectedLevel }) => {
  const calculatedLevel = levelTable.calculateLevelFromAmount(amount);
  const status = expectedLevel === null || calculatedLevel === expectedLevel ? '✅' : '❌';
  console.log(`   ${status} Amount: ${amount.toLocaleString()} → Level: ${calculatedLevel}`);
});

console.log('\n🎯 Testing Minimum Amount Lookup:');

// Test minimum amount lookups
const levelTests = [0, 1, 2, 3, 10, 50, 100, 150, 200];
levelTests.forEach(level => {
  const minAmount = levelTable.getMinimumAmountForLevel(level);
  console.log(`   Level ${level}: ${minAmount.toLocaleString()} minimum amount`);
});

console.log('\n📈 Testing Remaining Amount Calculations:');

// Test remaining amount calculations
const remainingTests = [
  { amount: 500, level: 0 },
  { amount: 2000, level: 1 },
  { amount: 50000, level: null }, // We'll calculate the level
];

remainingTests.forEach(({ amount, level }) => {
  const actualLevel = level === null ? levelTable.calculateLevelFromAmount(amount) : level;
  const remaining = levelTable.getRemainingAmountToNextLevel(amount, actualLevel);
  console.log(`   Amount: ${amount.toLocaleString()}, Level: ${actualLevel}`);
  console.log(`     → Remaining: ${remaining.remainingAmount.toLocaleString()}`);
  console.log(`     → Current Points: ${remaining.currentPoints.toLocaleString()}`);
  console.log(`     → Points for Level: ${remaining.minPointsNextLevel.toLocaleString()}`);
});

console.log('\n🚀 Performance Test:');

// Simple performance test
const startTime = Date.now();
const iterations = 10000;

for (let i = 0; i < iterations; i++) {
  const randomAmount = Math.floor(Math.random() * 100000000);
  levelTable.calculateLevelFromAmount(randomAmount);
}

const endTime = Date.now();
const avgTime = (endTime - startTime) / iterations;

console.log(`   ${iterations} level calculations in ${endTime - startTime}ms`);
console.log(`   Average: ${avgTime.toFixed(4)}ms per calculation`);

console.log('\n✅ Level Table Test Complete!');
