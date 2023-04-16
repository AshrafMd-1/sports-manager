'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Session extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            Session.belongsTo(models.User, {
                foreignKey: 'userId',
            });
            Session.belongsTo(models.Sport, {
                foreignKey: 'sportId',
            });
        }
    }

    Session.init({
        name: DataTypes.STRING,
        location: DataTypes.STRING,
        date: DataTypes.DATE,
        members: DataTypes.JSON,
        memberCount: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Session',
    });
    return Session;
};