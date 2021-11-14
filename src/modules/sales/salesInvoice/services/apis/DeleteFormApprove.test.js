const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const DeleteFormApprove = require('./DeleteFormApprove');

describe('Sales Invoice - DeleteFormApprove', () => {
  describe('validations', () => {
    it('throw error when sales invoice is not exist', async () => {
      const approver = await factory.user.create();

      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver, salesInvoiceId: 'invalid-id' }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist'));
    });

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { salesInvoice, formSalesInvoice, approver } = await generateRecordFactories();
      await formSalesInvoice.update({ cancellationStatus: 0, requestCancellationTo: approver.id });

      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver: hacker, salesInvoiceId: salesInvoice.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden -  You are not the selected approver'));
    });

    it('throw error when sales invoice not requested to be delete', async () => {
      const { salesInvoice, formSalesInvoice, approver } = await generateRecordFactories();

      expect(formSalesInvoice.cancellationStatus).toBeUndefined();
      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver, salesInvoiceId: salesInvoice.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice is not requested to be delete'));
    });

    it('throw error when sales invoice is already done', async () => {
      const { approver, salesInvoice, formSalesInvoice } = await generateRecordFactories();
      await formSalesInvoice.update({
        cancellationStatus: 0,
        requestCancellationTo: approver.id,
        done: true,
      });

      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver, salesInvoiceId: salesInvoice.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced sales invoice'));
    });
  });

  describe('success approve', () => {
    let salesInvoice, approver, formSalesInvoice;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, approver, formSalesInvoice } = recordFactories);

      const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
        name: 'cash',
        alias: 'kas',
        isDebit: true,
      });
      const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
        typeId: chartOfAccountType.id,
        position: '',
        name: 'kas besar',
        alias: 'kas besar',
      });
      await tenantDatabase.SettingJournal.create({
        feature: 'sales',
        name: 'account receivable',
        description: 'account receivable',
        chartOfAccountId: chartOfAccount.id,
      });
      await tenantDatabase.SettingJournal.create({
        feature: 'sales',
        name: 'sales income',
        description: 'sales income',
        chartOfAccountId: chartOfAccount.id,
      });
      await tenantDatabase.SettingJournal.create({
        feature: 'sales',
        name: 'income tax payable',
        description: 'income tax payable',
        chartOfAccountId: chartOfAccount.id,
      });
      await formSalesInvoice.update({ cancellationStatus: 0, requestCancellationTo: approver.id });

      ({ salesInvoice } = await new DeleteFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call());

      done();
    });

    it('update form cancellation status to approved', async () => {
      expect(salesInvoice.form.cancellationStatus).toEqual(1);
    });

    it('delete the journals', async () => {
      const journals = await tenantDatabase.Journal.findAll({ where: { formId: formSalesInvoice.id } });
      expect(journals.length).toEqual(0);
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  customer,
  warehouse,
  userWarehouse,
  deliveryOrder,
  item,
  itemUnit,
  deliveryNote,
  allocation,
  deliveryNoteItem,
  formDeliveryNote,
  salesInvoice,
  formSalesInvoice,
} = {}) => {
  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  customer = customer || (await factory.customer.create({ branch }));
  warehouse = warehouse || (await factory.warehouse.create({ branch }));
  // create relation between maker and warehouse for authorization
  userWarehouse = userWarehouse || (await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true }));
  deliveryOrder = deliveryOrder || (await factory.deliveryOrder.create({ customer, warehouse }));
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  deliveryNote = deliveryNote || (await factory.deliveryNote.create({ customer, warehouse, deliveryOrder }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  deliveryNoteItem = deliveryNoteItem || (await factory.deliveryNoteItem.create({ deliveryNote, item, allocation }));
  formDeliveryNote =
    formDeliveryNote ||
    (await factory.form.create({
      branch,
      formable: deliveryNote,
      formableType: 'SalesDeliveryNote',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  salesInvoice =
    salesInvoice ||
    (await factory.salesInvoice.create({
      customer,
      referenceable: deliveryNote,
      referenceableType: 'SalesDeliveryNote',
    }));
  formSalesInvoice =
    formSalesInvoice ||
    (await factory.form.create({
      branch,
      reference: salesInvoice,
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      formable: salesInvoice,
      formableType: 'SalesInvoice',
      number: 'SI2109001',
    }));

  return {
    maker,
    approver,
    branch,
    branchUser,
    customer,
    warehouse,
    userWarehouse,
    deliveryOrder,
    item,
    itemUnit,
    deliveryNote,
    allocation,
    deliveryNoteItem,
    formDeliveryNote,
    salesInvoice,
    formSalesInvoice,
  };
};
