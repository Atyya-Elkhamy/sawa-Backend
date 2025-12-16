const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const agencyValidation = require('../../validations/agency.validation');
const agencyController = require('../../controllers/agency.controller');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');

const router = express.Router();

// Agency routes
// get all agencies
router.get('/', auth(), agencyController.getAgencies);
router.get('/:agencyId', auth(), validate(agencyValidation.getAgency), agencyController.getAgency);
router.post('/:agencyId/hosts', auth(), validate(agencyValidation.addHost), agencyController.addHost);

router.get(
  '/:agencyId/statistics',
  auth(),
  validate(agencyValidation.getAgencyStatistics),
  agencyController.getAgencyStatistics
);
router.get('/agencies/search/', auth(), validate(agencyValidation.searchAgencies), agencyController.searchAgencies);
router.get(
  '/agencies/data/:agencyId',
  auth(),
  validate(agencyValidation.getPublicAgencyData),
  agencyController.getPublicAgencyData
);
router.get('/host/me', auth(), agencyController.getHostData);
router.get('/host/salary-info', auth(), agencyController.getSalaryData);
router.post('/host/transfer-cash', auth(), validate(agencyValidation.transferCash), agencyController.transferCash);
router.get('/host/history', auth(), agencyController.getHostHistory);
router.get('/admin/agency', auth(), agencyController.getAgencyData);
router.get('/admin/agency/analytics', auth(), agencyController.getAgencyAnalytics);
router.get('/admin/agency/hosts', auth(), agencyController.manageHosts);
router.get('/admin/agency/rank', auth(), agencyController.getAgencyRank);
router.get('/admin/history', auth(), agencyController.getAgencyHistory);
router.post('/admin/transfer-cash', auth(), validate(agencyValidation.transferCash), agencyController.agencyTransferCash);

// invite & request routes

// Agency-based routes
router.post(
  '/relations/agency/invitations/pending',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyPendingInvitations
);
router.post(
  '/relations/agency/invitations/rejected',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyRejectedInvitations
);
router.post(
  '/relations/agency/invitations/',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyInvitations
);
router.post(
  '/relations/agency/requests/pending',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyPendingRequests
);
router.post(
  '/relations/agency/requests/rejected',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyRejectedRequests
);
router.post(
  '/relations/agency/requests/accepted',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,

  agencyController.getAgencyAcceptedRequests
);
router.post(
  '/relations/agency/invitations/accepted',
  auth(),
  validate(agencyValidation.paginationValidation),
  parsePaginationParams,
  agencyController.getAgencyAcceptedInvites
);

// User-based routes

router.get('/relations/user/invitations/pending', auth(), parsePaginationParams, agencyController.getUserPendingInvitations);
router.get(
  '/relations/user/invitations/rejected',
  auth(),
  parsePaginationParams,
  agencyController.getUserRejectedInvitations
);
router.get('/relations/user/requests/pending', auth(), parsePaginationParams, agencyController.getUserPendingRequests);
router.get('/relations/user/requests/', auth(), parsePaginationParams, agencyController.getUserRequests);
router.get('/relations/user/requests/rejected', auth(), parsePaginationParams, agencyController.getUserRejectedRequests);

// Invite and Request Actions
router.post(
  '/relations/agency/invite',
  auth(),
  validate(agencyValidation.inviteUserValidation),
  agencyController.inviteUser
);
router.post(
  '/relations/user/join_request',
  auth(),
  validate(agencyValidation.userRequestValidation),
  agencyController.joinAgencyRequest
);
router.post(
  '/relations/user/request/cancel',
  auth(),
  validate(agencyValidation.userRequestValidation),
  agencyController.cancelJoinRequest
);
router.post(
  '/relations/agency/request/accept',
  auth(),
  validate(agencyValidation.agencyRequestValidation),
  agencyController.acceptJoinRequest
);
router.post(
  '/relations/agency/request/deny',
  auth(),
  validate(agencyValidation.agencyRequestValidation),
  agencyController.denyJoinRequest
);
router.post(
  '/relations/agency/invite/remove',
  auth(),
  validate(agencyValidation.agencyInviteValidation),
  agencyController.removeInvite
);
router.post(
  '/relations/user/invite/deny',
  auth(),
  validate(agencyValidation.userRequestValidation),
  agencyController.denyInvite
);
router.post(
  '/relations/user/invite/accept',
  auth(),
  validate(agencyValidation.userRequestValidation),
  agencyController.acceptInvite
);
router.post('/relations/agency/host/remove', auth(), agencyController.removeHost);

module.exports = router;
