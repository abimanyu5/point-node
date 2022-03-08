const httpStatus = require('http-status');
const { JsonWebTokenError } = require('jsonwebtoken');
const { Project } = require('@src/models').main;
const ApiError = require('@src/utils/ApiError');
const tokenService = require('@src/modules/auth/services/token.service');
const CreateFormReject = require('./CreateFormReject');

class CreateFormRejectByToken {
  constructor(tenantDatabase, token) {
    this.tenantDatabase = tenantDatabase;
    this.token = token;
  }

  async call() {
    try {
      const payload = await tokenService.verifyToken(this.token);
      if (!payload) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
      }
      const { stockCorrectionId, userId } = payload;
      const approver = await this.tenantDatabase.User.findOne({ where: { id: userId } });
      const createFormRejectDto = {
        reason: 'Reject from email',
      };
      const { stockCorrection } = await new CreateFormReject(this.tenantDatabase, {
        approver,
        stockCorrectionId,
        createFormRejectDto,
      }).call();

      const form = await stockCorrection.getForm();
      stockCorrection.dataValues.form = form;

      const tenantCode = this.tenantDatabase.sequelize.config.database.replace('point_', '');
      const project = await Project.findOne({ where: { code: tenantCode } });

      return { stockCorrection, project };
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'invalid token');
      }

      throw error;
    }
  }
}

module.exports = CreateFormRejectByToken;
