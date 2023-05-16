"use strict";
const moment = require("moment");
const Op = require("sequelize").Op;
const { Model } = require("sequelize");
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
        foreignKey: "userId",
      });
      Session.belongsTo(models.Sport, {
        foreignKey: "sportId",
      });
    }

    static createNewSession(userId, body, sportId) {
      const dateBody = body.date.split("-").map((item) => parseInt(item));
      const timeBody = body.time.split(":").map((item) => parseInt(item));
      body.date = moment().set({
        year: dateBody[0],
        month: dateBody[1] - 1,
        date: dateBody[2],
        hour: timeBody[0],
        minute: timeBody[1],
        second: 0,
      });
      const filteredMembersList = body.membersList
        .split(",")
        .filter((item) => item);
      const membersList = filteredMembersList.map((items) =>
        items
          .split(" ")
          .map(
            (item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
          )
          .join(" ")
      );
      return this.create({
        userId: userId,
        sportId: Number(sportId),
        location: body.location,
        date: body.date,
        membersList: Array.from(new Set(membersList)),
        remaining: body.remaining,
        cancel: false,
        reason: "",
      });
    }

    static updateSession(id, body) {
      const dateBody = body.date.split("-").map((item) => parseInt(item));
      const timeBody = body.time.split(":").map((item) => parseInt(item));
      body.date = moment().set({
        year: dateBody[0],
        month: dateBody[1] - 1,
        date: dateBody[2],
        hour: timeBody[0],
        minute: timeBody[1],
        second: 0,
      });
      let filteredMembersList = body.membersList
        .split(",")
        .filter((item) => item);
      const membersList = filteredMembersList.map((items) =>
        items
          .split(" ")
          .map(
            (item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
          )
          .join(" ")
      );
      return this.update(
        {
          location: body.location,
          date: body.date,
          membersList: Array.from(new Set(membersList)),
          remaining: body.remaining,
          cancel: false,
          reason: "",
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static async getSessionById(id) {
      const session = await this.findOne({
        where: {
          id: id,
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "membersList",
          "sportId",
          "userId",
          "cancel",
          "reason",
        ],
      });
      if (!session) {
        throw new Error("Session not found");
      }
      return session.dataValues;
    }

    static async getSessionByDate(body) {
      const offset = 24 * 60;
      let session = await this.findAll({
        where: {
          createdAt: {
            [Op.between]: [
              moment(body.start)
                .add(offset - 1110, "minutes")
                .toDate(),
              moment(body.end)
                .add(offset + 329, "minutes")
                .toDate(),
            ],
          },
        },
        attributes: [
          "id",
          "location",
          "date",
          "membersList",
          "remaining",
          "sportId",
          "userId",
          "cancel",
        ],
      });
      if (!session) {
        throw new Error("No session found");
      }
      return session.map((item) => item.dataValues);
    }

    static async getCreatedSessions(userId) {
      const sessions = await this.findAll({
        where: {
          userId: userId,
          cancel: false,
          date: {
            [Op.gte]: new Date(),
          },
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "sportId",
          "userId",
        ],
      });
      return sessions.map((item) => item.dataValues);
    }

    static async getJoinedSessions(email) {
      const sessions = await this.findAll({
        where: {
          membersList: {
            [Op.contains]: [email],
          },
          date: {
            [Op.gte]: new Date(),
          },
          cancel: false,
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "sportId",
          "userId",
        ],
      });
      return sessions.map((item) => item.dataValues);
    }

    static async getCanceledSessions(email) {
      const sessions = await this.findAll({
        where: {
          membersList: {
            [Op.contains]: [email],
          },
          date: {
            [Op.gte]: new Date(),
          },
          cancel: true,
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "sportId",
          "userId",
        ],
      });
      return sessions.map((item) => item.dataValues);
    }

    static async getOlderSessions(sportId) {
      const oldSession = await this.findAll({
        where: {
          date: {
            [Op.lt]: moment().toDate(),
          },
          sportId: sportId,
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "membersList",
          "sportId",
          "userId",
          "cancel",
        ],
      });
      return oldSession.map((item) => item.dataValues);
    }

    static async getNewerSessions(sportId) {
      const newSession = await this.findAll({
        where: {
          date: {
            [Op.gt]: moment().toDate(),
          },
          sportId: sportId,
        },
        attributes: [
          "id",
          "location",
          "date",
          "remaining",
          "membersList",
          "sportId",
          "userId",
          "cancel",
        ],
      });
      return newSession.map((item) => item.dataValues);
    }

    static async joinSession(email, sessionId) {
      const session = await this.getSessionById(sessionId);
      session.membersList.push(email);
      return this.update(
        {
          membersList: session.membersList,
          remaining: session.remaining - 1,
        },
        {
          where: {
            id: sessionId,
          },
        }
      );
    }

    static async leaveSession(index, sessionId) {
      const session = await this.getSessionById(sessionId);
      session.membersList.splice(index, 1);
      return this.update(
        {
          membersList: session.membersList,
          remaining: session.remaining + 1,
        },
        {
          where: {
            id: sessionId,
          },
        }
      );
    }

    static async cancelSession(id, reason) {
      const session = await this.findOne({
        where: {
          id: id,
        },
      });
      if (!session) {
        throw new Error("Session not found");
      }
      return this.update(
        {
          cancel: true,
          reason: reason,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
  }

  Session.init(
    {
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Location is required",
          },
          notEmpty: {
            msg: "Location is left empty",
          },
        },
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: {
            msg: "Date must be a date",
          },
          notNull: {
            msg: "Date is required",
          },
          notEmpty: {
            msg: "Date is left empty",
          },
        },
      },
      membersList: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
      },
      remaining: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isNumeric: {
            msg: "remaining must be a number",
          },
          notNull: {
            msg: "remaining is required",
          },
          notEmpty: {
            msg: "remaining is left empty",
          },
        },
      },
      cancel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        validate: {
          notNull: {
            msg: "cancel is required",
          },
        },
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "reason is required",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Session",
    }
  );
  return Session;
};
