'use strict';
const {
    Model
} = require('sequelize');
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
                foreignKey: 'userId',
            });
            User.hasMany(models.Session, {
                foreignKey: 'userId',
            });
        }

        static createNewUser(body,role,hashPassword) {
            return this.create({
                admin: role,
                firstName: body.firstName.charAt(0).toUpperCase() + body.firstName.slice(1),
                lastName: body.lastName.charAt(0).toUpperCase() + body.lastName.slice(1),
                email: body.email,
                password: hashPassword
            })
        }
    }

    User.init({
        admin: DataTypes.BOOLEAN,
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};