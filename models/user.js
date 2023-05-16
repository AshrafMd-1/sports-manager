"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    static associate(models) {
      // define association here
      User.hasMany(models.Sport, {
        foreignKey: "userId",
      });
      User.hasMany(models.Session, {
        foreignKey: "userId",
      });
    }

    static createNewUser(body, role, hashPassword) {
      return this.create({
        admin: role,
        firstName:
          body.firstName.charAt(0).toUpperCase() + body.firstName.slice(1),
        lastName:
          body.lastName.charAt(0).toUpperCase() + body.lastName.slice(1),
        email: body.email,
        password: hashPassword,
      });
    }

    static updateUser(id, body) {
      return this.update(
        {
          firstName:
            body.firstName.charAt(0).toUpperCase() + body.firstName.slice(1),
          lastName:
            body.lastName.charAt(0).toUpperCase() + body.lastName.slice(1),
          email: body.email,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static async updatePassword(id, hashPassword) {
      return this.update(
        {
          password: hashPassword,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static async getUserDetailsById(id) {
      const user = await this.findOne({
        where: {
          id: id,
        },
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "admin",
          "createdAt",
          "updatedAt",
        ],
      });
      return user.dataValues;
    }

    static async getUserDetailsByEmail(email) {
      const user = await this.findOne({
        where: {
          email: email,
        },
        attributes: ["id", "firstName", "lastName", "email"],
      });
      return user.dataValues;
    }
  }

  User.init(
    {
      admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Role is required",
          },
          notEmpty: {
            msg: "Role is left empty",
          },
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "First name is required",
          },
          notEmpty: {
            msg: "First name is left empty",
          },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Last name is required",
          },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          args: true,
          msg: "Email address already in use",
        },
        validate: {
          notNull: {
            msg: "Email is required",
          },
          notEmpty: {
            msg: "Email is left empty",
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Password is required",
          },
          notEmpty: {
            msg: "Password is left empty",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
