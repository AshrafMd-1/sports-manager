'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Sport extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            Sport.belongsTo(models.User, {
                foreignKey: 'userId',
            });
            Sport.hasMany(models.Session, {
                foreignKey: 'sportId',
            });

        }


        static createNewSport(userId, sport) {
            return this.create({
                sport,
                userId
            })
        }
    }

    Sport.init({
        sport: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'Sport',
    });
    return Sport;
};