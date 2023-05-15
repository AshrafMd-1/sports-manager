/* eslint-disable no-undef */

const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

const extractCSRFToken = (html) => {
  const $ = cheerio.load(html.text);
  return $('input[type="hidden"]').val();
};

const login = async (agent, email, password) => {
  const res = await agent.get("/login");
  const csrfToken = extractCSRFToken(res);
  await agent.post("/login").send({
    email,
    password,
    _csrf: csrfToken,
  });
};

describe("Test Functionality of the sport scheduler app", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
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

  describe("Check Login and creation of user", function () {
    test("Get homepage on '/' endpoint", async () => {
      const response = await agent.get("/");
      expect(response.statusCode).toBe(200);
    });

    test("Get Sign Up page", async () => {
      const response = await agent.get("/signup");
      expect(response.statusCode).toBe(200);
    });

    test("Get Login page", async () => {
      const response = await agent.get("/login");
      expect(response.statusCode).toBe(200);
    });

    test("Sign up as admin 1", async () => {
      let res = await agent.get("/signup");
      const csrfToken = extractCSRFToken(res);
      res = await agent.post("/signup").send({
        role: "Admin",
        firstName: "Tony",
        lastName: "Stark",
        email: "tonystark@test.com",
        password: "password",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/login");
    });

    test("Login as admin 1", async () => {
      let res = await agent.get("/login");
      const csrfToken = extractCSRFToken(res);
      res = await agent.post("/login").send({
        email: "tonystark@test.com",
        password: "password",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/dashboard");
    });

    test("Sign out of admin 1", async () => {
      let res = await agent.get("/dashboard");
      expect(res.statusCode).toBe(200);
      res = await agent.get("/logout");
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/");
      res = await agent.get("/dashboard");
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/login");
    });

    test("Sign up as player 1", async () => {
      let res = await agent.get("/signup");
      const csrfToken = extractCSRFToken(res);
      res = await agent.post("/signup").send({
        role: "Admin",
        firstName: "John",
        lastName: "Wick",
        email: "johnwick@test.com",
        password: "password",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/login");
    });

    test("Login as player 1", async () => {
      let res = await agent.get("/login");
      const csrfToken = extractCSRFToken(res);
      res = await agent.post("/login").send({
        email: "johnwick@test.com",
        password: "password",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/dashboard");
    });

    test("Sign out of player 1", async () => {
      let res = await agent.get("/dashboard");
      expect(res.statusCode).toBe(200);
      res = await agent.get("/logout");
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/");
      res = await agent.get("/dashboard");
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/login");
    });
  });

  describe("Creation of sport", function () {
    test("Check the availability of '/sports' endpoint", async () => {
      const agent = request.agent(server);
      await login(agent, "tonystark@test.com", "password");
      const res = await agent.get("/sports");
      expect(res.statusCode).toBe(200);
    });

    test("Get new sport page", async () => {
      const agent = request.agent(server);
      await login(agent, "tonystark@test.com", "password");
      const res = await agent.get("/sports/new-sport");
      expect(res.statusCode).toBe(200);
    });

    test("Create a new sport", async () => {
      const agent = request.agent(server);
      await login(agent, "tonystark@test.com", "password");
      const res = await agent.get("/sports/new-sport");
      const csrfToken = extractCSRFToken(res);
      const resp = await agent.post("/sports/new-sport").send({
        _csrf: csrfToken,
        sport: "Cricket",
      });
      expect(resp.statusCode).toBe(302);
      expect(resp.header.location).toBe("/sports");
      const resp2 = await agent.get("/sports");
      const $ = cheerio.load(resp2.text);
      const sports = $(".sport").find("h2").text();
      const created = $(".detail").find(".value").text();
      expect(sports).toBe("Cricket");
      expect(created).toBe("Tony Stark");
    });
  });

  describe("Creation of session", function () {
    test("Check if the created sport is present", async () => {
      const agent = request.agent(server);
      await login(agent, "tonystark@test.com", "password");
      const res = await agent.get("/sports");
      const $ = cheerio.load(res.text);
      const sports = $(".sport").find("h2").text();
      const created = $(".detail").find(".value").text();
      expect(sports).toBe("Cricket");
      expect(created).toBe("Tony Stark");
    });
  });
});
