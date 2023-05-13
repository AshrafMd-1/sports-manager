/* eslint-disable no-undef */

const request = require("supertest");

const db = require("../models/index");
const app = require("../app");

let server, agent;

describe("Todo Application", function () {
    beforeAll(async () => {
        await db.sequelize.sync({force: true});
        server = app.listen(3000, () => {
        });
        agent = request.agent(server);
    });

    afterAll(async () => {
        try {
            await db.sequelize.close();
            await server.close();
        } catch (error) {
            console.log(error);
        }
    });

    test("Get homepage on '/' endpoint", async () => {
        const response = await agent.get("/");
        expect(response.statusCode).toBe(200);
    });
});
