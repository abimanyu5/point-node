const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesVisitationDetail extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.SalesVisitation, { onDelete: 'CASCADE' });

      this.belongsTo(models.Item, { as: 'item', onDelete: 'RESTRICT' });
    }

    static getMorphType() {
      return 'SalesVisitationDetail';
    }
  }
  SalesVisitationDetail.init(
    {
      salesVisitationId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      quantity: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantity'));
        },
      },
      unit: {
        type: DataTypes.STRING,
      },
      converter: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('converter'));
        },
      },
      price: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('price'));
        },
      },
      expiryDate: {
        type: DataTypes.DATE,
      },
      productionNumber: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesVisitationDetail',
      tableName: 'pin_point_sales_visitation_details',
      underscored: true,
      timestamps: false,
    }
  );
  return SalesVisitationDetail;
};
