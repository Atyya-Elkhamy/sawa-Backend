const Room = require('../../models/room/room.model');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const resetRoomMics = require('./room.mics.service').resetRoomMics;

class RoomServicePk {
    /**
     * Create PK Battle model for a room
     */

    static async createPkBattle(roomId, pkData) {
        console.log("the request data is  ", pkData);
        if (!mongoose.isValidObjectId(roomId)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid room ID');
        }
        const room = await Room.findById(roomId);
        if (!room) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
        }
        // 2. Reset mics for new PK battle
        await resetRoomMics(roomId);
        // 3. Set new PK battle
        room.pkBattleModel = pkData;
        room.isPkEnabled = true;
        await room.save();
        return room.pkBattleModel;
    }
    /**
     * Get PK Battle Data
     */
    // static async getPkBattle(roomId) {
    //     const room = await Room.findById(roomId)
    //         .select('pkBattleModel currentPkTime isPkEnabled')
    //         .lean();
    //     if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
    //     if (!room.pkBattleModel) throw new ApiError(httpStatus.NOT_FOUND, 'No PK battle found');
    //     return room;
    // }

    static async getPkBattle(roomId) {
        const room = await Room.findById(roomId)
            .select('pkBattleModel currentPkTime isPkEnabled');
        if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
        if (!room.pkBattleModel) throw new ApiError(httpStatus.NOT_FOUND, 'No PK battle found');
        const model = room.pkBattleModel;
        if (model.pkBattelIsStarted && model.startedAt) {
            const now = Date.now();
            const elapsed = Math.floor((now - model.startedAt.getTime()) / 1000);
            model.currentPkTime = Math.max(model.pkTime - elapsed, 0);
        }
        return room.toObject();
    }

    /**
     *Add/Update Team Member
     *   team: "blue" or "red"
     */
    static async addTeamMember(roomId, team, member) {
        if (!['blue', 'red'].includes(team)) {
            throw new Error('Invalid team. Must be blue or red.');
        }
        const path = team === 'blue'
            ? 'pkBattleModel.pkBlueTeam.teamMembersList'
            : 'pkBattleModel.pkRedTeam.teamMembersList';
        const room = await Room.findOneAndUpdate(
            {
                _id: roomId,
                isPkEnabled: true,
                pkBattleModel: { $exists: true }
            },
            {
                $push: {
                    [path]: {
                        pkMemberId: member.pkMemberId,
                        pkMemberCharsima: member.pkMemberCharsima
                    }
                }
            },
            { new: true }
        ).lean();
        if (!room) throw new Error('Room or PK battle not found');
        return room.pkBattleModel;
    }
    /**
     * Update PK state (Points, MVP, Timer, etc.)
     */

    static async updatePkBattle(roomId, updates) {
        const room = await Room.findById(roomId);
        if (!room) throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
        // INIT missing model to avoid MongoDB error
        if (!room.pkBattleModel) {
            room.pkBattleModel = {};   // safe default
        }
        // If PK is starting now and startedAt is not set → set to current time
        if (updates.pkBattelIsStarted === true && !room.pkBattleModel.startedAt) {
            updates.startedAt = new Date();
        }
        // Apply updates to pkBattleModel
        for (const key in updates) {
            if (Array.isArray(updates[key]) || updates[key] === null) continue;
            room.pkBattleModel[key] = updates[key];
        }
        await room.save();
        return room.pkBattleModel;
    }
    /**
     * Reset PK Battle
     */
    static async resetPkBattle(roomId) {
        const room = await Room.findById(roomId);
        if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
        room.pkBattleModel = null;
        room.currentPkTime = 0;
        room.isPkEnabled = false;
        await room.save();
        return { message: 'PK battle reset successfully' };
    }
}

module.exports = RoomServicePk;
