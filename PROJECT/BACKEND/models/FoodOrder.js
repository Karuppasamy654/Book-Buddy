const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const FoodOrder = sequelize.define('FoodOrder', {
    order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'order_id'
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'booking_id',
      references: {
        model: 'booking',
        key: 'booking_id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'user',
        key: 'user_id'
      }
    },
    order_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'order_date'
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In Progress', 'Delivered', 'Cancelled'),
      allowNull: false,
      validate: {
        isIn: [['Pending', 'In Progress', 'Delivered', 'Cancelled']]
      }
    }
  }, {
    tableName: 'food_order',
    timestamps: false,
    underscored: true
  });

  FoodOrder.prototype.updateStatus = function(newStatus) {
    return this.update({ status: newStatus });
  };

  FoodOrder.prototype.cancel = function() {
    return this.update({ status: 'Cancelled' });
  };

  FoodOrder.associate = function(models) {
    FoodOrder.belongsTo(models.Booking, {
      foreignKey: 'booking_id',
      as: 'booking'
    });

    FoodOrder.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    FoodOrder.hasMany(models.OrderDetail, {
      foreignKey: 'order_id',
      as: 'orderDetails'
    });
  };

  return FoodOrder;
};
