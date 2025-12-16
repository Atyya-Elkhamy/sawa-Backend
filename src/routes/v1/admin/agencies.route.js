const express = require('express');
const { creditAgencyController, agencyController } = require('../../../controllers');
const agencyValidation = require('../../../validations/agency.validation');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');

const router = express.Router();

router.post(
  '/credit-agency/create/:userId',
  auth('adminRole'),
  validate(agencyValidation.createCreditAgency),
  creditAgencyController.addCreditAgency
);
router.post(
  '/host-agency/create/:userId',
  auth('adminRole'),
  validate(agencyValidation.createAgency),
  agencyController.createAgency
);

module.exports = router;
