'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Sessions', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            location: {
                type: Sequelize.STRING,
                allowNull: false
            },
            date: {
                type: Sequelize.DATE,
                allowNull: false
            },
            members: {
                type: Sequelize.ARRAY(Sequelize.STRING),
                allowNull: false
            },
            required: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Sessions');
    }
};