const catchAsync = require('../../utils/catchAsync');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const pkService = require('../../services/room/room-pk.service');

/**
 * Create PK Battle
 */
const createPkBattle = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const pkData = req.body;
    const data = await pkService.createPkBattle(roomId, pkData);
    res
        .status(httpStatus.CREATED)
        .send({ success: true, message: 'PK battle created', data });
});

/**
 * Get PK Battle Data
 */
const getPkBattle = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const data = await pkService.getPkBattle(roomId);
    res
        .status(httpStatus.OK)
        .send({ success: true, data });
});

/**
 * Add PK Team Member
 */
const addTeamMember = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const { team, member } = req.body;
    if (!team || !member) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Team and member are required');
    }
    const data = await pkService.addTeamMember(roomId, team, member);
    res
        .status(httpStatus.OK)
        .send({ success: true, message: 'Team member added', data });
});

/**
 * Update PK Battle (Points, MVP, State…)
 */
const updatePkBattle = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const updates = req.body;
    const data = await pkService.updatePkBattle(roomId, updates);
    res
        .status(httpStatus.OK)
        .send({ success: true, message: 'PK battle updated', data });
});

/**
 * Reset PK Battle
 */
const resetPkBattle = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const data = await pkService.resetPkBattle(roomId);
    res
        .status(httpStatus.OK)
        .send({ success: true, message: 'PK battle reset', data });
});

module.exports = {
    createPkBattle,
    getPkBattle,
    addTeamMember,
    updatePkBattle,
    resetPkBattle,
};