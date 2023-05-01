'use strict';
const moment = require('moment');
const Op = require('sequelize').Op;
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

        static getOlderSessions(sportId) {
            return this.findAll({
                where: {
                    date: {
                        [Op.lt]: moment().toDate()
                    },
                    sportId: sportId
                }
            });
        }

        static getNewerSessions(sportId) {
            return this.findAll({
                where: {
                    date: {
                        [Op.gt]: moment().toDate()
                    },
                    sportId: sportId
                }
            });
        }


        static getSessionById(id) {
            return this.findByPk(id)
        }

        static createNewSession(userId, body, sportId) {
            const dateBody = body.date.split('-').map((item) => parseInt(item));
            const timeBody = body.time.split(':').map((item) => parseInt(item));
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
                sportId: Number(sportId),
                location: body.location,
                date: body.date,
                required: body.required
            })
        }


        static async getCreatedSessions(userId) {
            const session = await this.findAll({
                where: {
                    userId: userId
                },
            })
            return session.filter((item) => new Date(item.dataValues.date) > new Date())
        }

        static async joinedSessions(userId) {
            const session = await this.findAll({
                where: {
                    membersId: {
                        [Op.contains]: [userId]
                    }
                },
            })
            return session.filter((item) => new Date(item.dataValues.date) > new Date())
        }

        static async getAllMembersId(sessionId) {
            const session = await this.getSessionById(sessionId)
            return session.membersId
        }

        static async getSessionDate(sessionId) {
            const session = await this.getSessionById(sessionId)
            return session.date
        }

        static async getRequired(sessionId) {
            const session = await this.getSessionById(sessionId)
            return session.required
        }

        static async joinSession(sessionId, membersId, required) {
            const session = await this.getSessionById(sessionId)
            return session.update({
                membersId: membersId,
                required: required
            })
        }
    }

    Session.init({
        location: DataTypes.STRING,
        date: DataTypes.DATE,
        membersId: DataTypes.ARRAY(DataTypes.INTEGER),
        required: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'Session',
    });
    return Session;
};