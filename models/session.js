'use strict';
const moment = require('moment');
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

        static  createNewSession(userId,body) {
            const dateBody= body.date.split('-').map((item) => parseInt(item));
            const timeBody= body.time.split(':').map((item) => parseInt(item));
            body.date = moment().set({
                year: dateBody[0],
                month: dateBody[1] - 1,
                date: dateBody[2],
                hour: timeBody[0],
                minute: timeBody[1],
                second: 0,
            })
            return this.create({
                userId: userId,
                sportId: Number(body.sport),
                location: body.location,
                date: body.date,
                members: body.members.split(','),
                required: body.required
            })
        }
    }

    Session.init({
        location: DataTypes.STRING,
        date: DataTypes.DATE,
        members: DataTypes.ARRAY(DataTypes.STRING),
        required: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Session',
    });
    return Session;
};