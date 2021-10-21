const { Form } = require('@src/models').tenant;

async function create({
  branch,
  incrementNumber = 1,
  incrementGroup = 202109,
  createdBy,
  updatedBy,
  requestApprovalTo,
  formable,
  formableType,
  number = 'DN2101001',
}) {
  const form = await Form.create({
    branchId: branch.id,
    date: new Date(),
    number,
    incrementNumber,
    incrementGroup,
    formableId: formable.id,
    formableType,
    createdBy,
    updatedBy,
    requestApprovalTo,
  });

  return form;
}

module.exports = { create };
