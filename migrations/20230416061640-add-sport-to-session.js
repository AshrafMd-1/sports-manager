'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn('Sessions', 'sportId', {
            type: Sequelize.INTEGER,
        });

        await queryInterface.addConstraint('Sessions', {
            fields: ['sportId'],
            type: 'foreign key',
            references: {
                table: 'Sports',
                field: 'id'
            }
        });


    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('Sessions', 'sportId');
    }
};
