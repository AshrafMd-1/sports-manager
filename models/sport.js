"use strict";
const { Model } = require("sequelize");
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
        foreignKey: "userId",
      });
      Sport.hasMany(models.Session, {
        foreignKey: "sportId",
      });
    }

    static createNewSport(userId, sport) {
      return this.create({
        sport,
        userId,
      });
    }

    static async updateSport(id, sport) {
      return await this.update(
        {
          sport: sport,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static async getAllSports() {
      const sports = await this.findAll({
        attributes: ["sport", "userId"],
      });
      return sports.map((item) => item.dataValues);
    }

    static async getSport(id) {
      const sport = await this.findOne({
        where: {
          id: id,
        },
        attributes: ["sport"],
      });
      return sport.dataValues.sport;
    }

    static async getSportId(sport) {
      const sportId = await this.findOne({
        where: {
          sport: sport,
        },
        attributes: ["id"],
      });
      if (!sportId) {
        throw new Error("Sport not found");
      }
      return sportId.dataValues.id;
    }
  }

  Sport.init(
    {
      sport: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          args: true,
          msg: "Sport already exists",
        },
        validate: {
          notNull: {
            msg: "Sport is required",
          },
          notEmpty: {
            msg: "Sport is left empty",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Sport",
    }
  );
  return Sport;
};
