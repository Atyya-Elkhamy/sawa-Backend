const mongoose = require('mongoose');

const { checkAndAwardLevelItem } = require('../../src/services/extra/level.service');
const Item = require('../../src/models/item.model');

// Mock the models and logger
jest.mock('../../src/models/boughtItem.model');
jest.mock('../../src/models/item.model');
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Level Rewards System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should award item when user reaches a new tier level', async () => {
    // Mock data
    const userId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: userId,
      level: 55, // Level in tier 2 (51-80)
    };
    const mockItem = {
      _id: itemId,
      name: 'level-frame-2',
    };

    // Setup mocks
    Item.findOne.mockResolvedValue(mockItem);
    BoughtItem.findOne.mockResolvedValue(null); // User doesn't have the item yet
    BoughtItem.prototype.save = jest.fn().mockResolvedValue({});

    // Call the function with a user who just leveled up from 50 to 55
    const oldLevel = 50;
    const result = await checkAndAwardLevelItem(mockUser, oldLevel);

    // Expectations
    expect(Item.findOne).toHaveBeenCalledWith({ name: 'level-frame-2' });
    expect(BoughtItem.findOne).toHaveBeenCalledWith({
      user: userId,
      item: itemId,
    });
    expect(BoughtItem.prototype.save).toHaveBeenCalled();
    expect(result).toEqual(mockItem);
  });

  test('Should not award item if user already has it', async () => {
    // Mock data
    const userId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: userId,
      level: 85, // Level in tier 3 (81-110)
    };
    const mockItem = {
      _id: itemId,
      name: 'level-frame-3',
    };

    // Setup mocks
    Item.findOne.mockResolvedValue(mockItem);
    BoughtItem.findOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId() }); // User already has the item

    // Call the function with a user who just leveled up from 80 to 85
    const oldLevel = 80;
    const result = await checkAndAwardLevelItem(mockUser, oldLevel);

    // Expectations
    expect(Item.findOne).toHaveBeenCalledWith({ name: 'level-frame-3' });
    expect(BoughtItem.findOne).toHaveBeenCalledWith({
      user: userId,
      item: itemId,
    });
    expect(BoughtItem.prototype.save).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('Should not award item when level change is within same tier', async () => {
    // Mock data
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      level: 60, // Level still in tier 2 (51-80)
    };

    // Call the function with a user who leveled up within the same tier (55 to 60)
    const oldLevel = 55;
    const result = await checkAndAwardLevelItem(mockUser, oldLevel);

    // Expectations
    expect(Item.findOne).not.toHaveBeenCalled();
    expect(BoughtItem.findOne).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('Should handle missing item gracefully', async () => {
    // Mock data
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      level: 145, // Level in tier 4 (111-150)
    };

    // Setup mocks
    Item.findOne.mockResolvedValue(null); // Item doesn't exist in database

    // Call the function
    const oldLevel = 110;
    const result = await checkAndAwardLevelItem(mockUser, oldLevel);

    // Expectations
    expect(Item.findOne).toHaveBeenCalledWith({ name: 'level-frame-4' });
    expect(BoughtItem.findOne).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
