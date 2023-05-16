/* eslint-disable no-undef */

const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
const moment = require("moment");
const date = moment().add(2, "days");

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

  describe("Test Login", function () {
    describe("Check Endpoints", function () {
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
    });

    describe("Create Users", function () {
      test("Sign up as admin 1", async () => {
        let res = await agent.get("/signup");
        const csrfToken = extractCSRFToken(res);
        res = await agent.post("/signup").send({
          role: "Admin",
          firstName: "Tony",
          lastName: "Stark",
          email: "tonystark@gmail.com",
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
          email: "tonystark@gmail.com",
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
          role: "Player",
          firstName: "John",
          lastName: "Wick",
          email: "johnwick@gmail.com",
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
          email: "johnwick@gmail.com",
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

    describe("Check Admin Functionality", function () {
      describe("Creation and editing of sports", function () {
        describe("Creation of sport", function () {
          test("Check the availability of '/sports' endpoint", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports");
            expect(res.statusCode).toBe(200);
          });

          test("Get new sport page", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/new-sport");
            expect(res.statusCode).toBe(200);
          });

          test("Create a new sport", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
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
        describe("Edition of sports", function () {
          test("Check if the created sport is present", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports");
            const $ = cheerio.load(res.text);
            const sports = $(".sport").find("h2").text();
            const created = $(".detail").find(".value").text();
            expect(sports).toBe("Cricket");
            expect(created).toBe("Tony Stark");
            const res2 = await agent.get("/sports/Cricket");
            expect(res2.statusCode).toBe(200);
          });
          test("Reject when edit sport with same name", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Cricket/edit-sport");
            expect(res.statusCode).toBe(200);
            const csrf = extractCSRFToken(res);
            const res2 = await agent.post("/sports/Cricket/edit-sport").send({
              _csrf: csrf,
              sport: "Cricket",
            });
            expect(res2.statusCode).toBe(302);
            expect(res2.header.location).toBe("/sports/Cricket/edit-sport");
          });
          test("Edit Sport", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Cricket/edit-sport");
            expect(res.statusCode).toBe(200);
            const csrf = extractCSRFToken(res);
            const res2 = await agent.post("/sports/Cricket/edit-sport").send({
              _csrf: csrf,
              sport: "Hockey",
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey");
            expect(res3.statusCode).toBe(200);
          });
          test("Player should not be able to edit sport", async () => {
            const agent = request.agent(server);
            await login(agent, "johnwick@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/edit-sport");
            expect(res.statusCode).toBe(302);
          });
        });
      });
      describe("Get report", function () {
        test("Check report endpoint", async () => {
          const agent = request.agent(server);
          await login(agent, "tonystark@gmail.com", "password");
          const res = await agent.get("/report");
          expect(res.statusCode).toBe(200);
        });
        test("player should not be able to access report", async () => {
          const agent = request.agent(server);
          await login(agent, "johnwick@gmail.com", "password");
          const res = await agent.get("/report");
          expect(res.statusCode).toBe(302);
        });
      });
    });
    describe("Other functions", function () {
      describe("Session Functions", function () {
        describe("Creation of session", function () {
          test("check sport endpoint", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey");
            expect(res.statusCode).toBe(200);
          });
          test("Create a new session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/new-session");
            expect(res.statusCode).toBe(200);
            const csrf = extractCSRFToken(res);
            const date = moment().add(2, "days");
            const res2 = await agent.post("/sports/Hockey/new-session").send({
              location: "Sugrane Cricket Stadium",
              date: `${date.format("YYYY-MM-DD")}`,
              time: `18:23`,
              membersList: "Ashraf,ashraf,john",
              remaining: "3",
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
          });
        });
        describe("Edition of session", function () {
          test("Check session endpoint", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
          });
          test("Edit session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1/edit-session");
            expect(res.statusCode).toBe(200);
            const csrf = extractCSRFToken(res);
            const $ = cheerio.load(res.text);
            const location = $("#location").val();
            expect(location).toBe("Sugrane Cricket Stadium");
            const res2 = await agent
              .post("/sports/Hockey/1/edit-session")
              .send({
                location: "Highway Cricket Stadium",
                date: `${date.format("YYYY-MM-DD")}`,
                time: `18:23`,
                membersList: "Ashraf,mohan,john",
                remaining: "3",
                _csrf: csrf,
              });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const location1 = $1(".info-part:first").find(".info-value").text();
            const members = $1(".member").length;
            expect(members).toBe(3);
            expect(location1).toBe("Highway Cricket Stadium");
          });
        });
        describe("Joining of session", function () {
          test("Check if the created Session is present", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
          });
          test("Join Session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const $ = cheerio.load(res.text);
            const members = $(".member").length;
            expect(members).toBe(3);
            const res2 = await agent.get("/sports/Hockey/1/join").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const members1 = $1(".member").length;
            expect(members1).toBe(4);
          });

          test("Leave Session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const $ = cheerio.load(res.text);
            const members = $(".member").length;
            expect(members).toBe(4);
            const res2 = await agent.get("/sports/Hockey/1/3/leave").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const members1 = $1(".member").length;
            expect(members1).toBe(3);
          });

          test("remove people from session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const $ = cheerio.load(res.text);
            const members = $(".member").length;
            expect(members).toBe(3);
            const res2 = await agent.get("/sports/Hockey/1/0/leave").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const members1 = $1(".member").length;
            expect(members1).toBe(2);
          });
          test("disallow other users to remove people from session", async () => {
            const agent = request.agent(server);
            await login(agent, "johnwick@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const $ = cheerio.load(res.text);
            const members = $(".member").length;
            expect(members).toBe(2);
            const res2 = await agent.get("/sports/Hockey/1/0/leave").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const members1 = $1(".member").length;
            expect(members1).toBe(2);
          });
          test("Allow other users for joining session", async () => {
            const agent = request.agent(server);
            await login(agent, "johnwick@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const $ = cheerio.load(res.text);
            const members = $(".member").length;
            expect(members).toBe(2);
            const res2 = await agent.get("/sports/Hockey/1/join").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $1 = cheerio.load(res3.text);
            const members1 = $1(".member").length;
            expect(members1).toBe(3);
          });
        });
        describe("Cancel Session", function () {
          test("Check if the session is present", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
          });
          test("Cancel Session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1/cancel-session");
            expect(res.statusCode).toBe(200);
            const csrf = extractCSRFToken(res);
            const res2 = await agent
              .post("/sports/Hockey/1/cancel-session")
              .send({
                _csrf: csrf,
                reason: "I am not feeling well",
              });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $ = cheerio.load(res3.text);
            const reason = $(".cancellation").find(".cancel-value").text();
            expect(reason).toBe("I am not feeling well");
          });
          test("Disallow users to join cancelled session", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/sports/Hockey/1");
            expect(res.statusCode).toBe(200);
            const $csrf = cheerio.load(res.text);
            const csrf = $csrf('meta[name="_csrf"]').attr("content");
            const res2 = await agent.get("/sports/Hockey/1/join").send({
              _csrf: csrf,
            });
            expect(res2.statusCode).toBe(302);
            const res3 = await agent.get("/sports/Hockey/1");
            expect(res3.statusCode).toBe(200);
            const $ = cheerio.load(res3.text);
            const members = $(".member").length;
            expect(members).toBe(3);
          });
        });
      });
      describe("Change user details", function () {
        describe("Go to user Profile", function () {
          test("Check if the user profile is present", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/profile");
            expect(res.statusCode).toBe(200);
          });
        });
        describe("Change user details", function () {
          test("Check if the profile is present", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/profile");
            expect(res.statusCode).toBe(200);
          });
          test("Change user details", async () => {
            const agent = request.agent(server);
            await login(agent, "tonystark@gmail.com", "password");
            const res = await agent.get("/profile");
            expect(res.statusCode).toBe(200);
            const $ = cheerio.load(res.text);
            const firstName = $(".detail:eq(1)").find(".value").text();
            expect(firstName).toBe("Tony");
            const lastName = $(".detail:eq(2)").find(".value").text();
            expect(lastName).toBe("Stark");
            const email = $(".detail:eq(3)").find(".value").text();
            expect(email).toBe("tonystark@gmail.com");
            const res2 = await agent.get("/profile/edit");
            expect(res2.statusCode).toBe(200);
            const csrf2 = extractCSRFToken(res2);
            const res3 = await agent.post("/profile/edit").send({
              _csrf: csrf2,
              firstName: "Albert",
              lastName: "Einstein",
              email: "alberteinstien@gmail.com",
            });
            expect(res3.statusCode).toBe(302);
            const res4 = await agent.get("/profile");
            expect(res4.statusCode).toBe(200);
            const $1 = cheerio.load(res4.text);
            const firstName1 = $1(".detail:eq(1)").find(".value").text();
            expect(firstName1).toBe("Albert");
            const lastName1 = $1(".detail:eq(2)").find(".value").text();
            expect(lastName1).toBe("Einstein");
            const email1 = $1(".detail:eq(3)").find(".value").text();
            expect(email1).toBe("alberteinstien@gmail.com");
          });
          test("Change user password", async () => {
            const agent = request.agent(server);
            await login(agent, "johnwick@gmail.com", "password");
            const res = await agent.get("/profile");
            expect(res.statusCode).toBe(200);
            const res2 = await agent.get("/profile/change-password");
            expect(res2.statusCode).toBe(200);
            const csrf2 = extractCSRFToken(res2);
            const res3 = await agent.post("/profile/change-password").send({
              _csrf: csrf2,
              oldPassword: "password",
              newPassword: "password123",
            });
            expect(res3.statusCode).toBe(302);
            const res4 = await agent.get("/logout");
            expect(res4.statusCode).toBe(302);
            await login(agent, "johnwick@gmail.com", "password123");
            const res5 = await agent.get("/dashboard");
            expect(res5.statusCode).toBe(200);
          });
        });
      });
    });
  });
});
