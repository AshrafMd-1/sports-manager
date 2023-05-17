const express = require("express");
const bodyParser = require("body-parser");

const path = require("path");
const { User, Sport, Session } = require("./models");
const {
  sessionGenerator,
  capitalizeString,
  capitalizeName,
  sportGenerator,
  sportSessions,
} = require("./functions");

const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const csurf = require("tiny-csrf");
const session = require("express-session");
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "views"));
app.use(express.static(path.resolve(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser("cookie-parser-secret"));
app.use(csurf("bxMNjNqSnWZvWE8f6oxTBykN71PoXmHz"));

app.use(
  session({
    saveUninitialized: true,
    resave: true,
    secret: "keyboard cat",
    cookie: {
      maxAge: 3600000,
    },
  })
);

app.use(flash());
app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (email, password, done) => {
      User.findOne({
        where: {
          email,
        },
      })
        .then(async (user) => {
          if (!user) {
            return done(null, false, { message: "User Not Found" });
          }
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect Password" });
          }
        })
        .catch((err) => {
          console.log(err);
          return done(err);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null, { message: "Error occurred, please try again" });
    });
});

// Used only during auth to identify if a user is already logged in
const alreadyLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.messages = req.flash("info", "You are already logged in");
    res.redirect("/dashboard");
  } else {
    return next();
  }
};

// Used to check if a user is logged in, if not redirect to login page
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

// Used to check if a user is an admin, if not redirect to dashboard
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.admin) {
      return next();
    } else {
      res.locals.messages = req.flash(
        "info",
        "User does not have required authorization"
      );
      res.redirect("/dashboard");
    }
  } else {
    res.redirect("/login");
  }
};

// Get Home Page
app.get("/", alreadyLoggedIn, async (req, res) => {
  res.render("homepage", {
    csrfToken: req.csrfToken(),
    title: "Homepage",
  });
});

// Get Sign-Up Page
app.get("/signup", alreadyLoggedIn, (req, res) => {
  res.render("signup", {
    csrfToken: req.csrfToken(),
    title: "Signup",
  });
});

// Post Sign-Up Page
app.post("/signup", async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const role = req.body.role.toLowerCase() === "admin";
  try {
    await User.createNewUser(req.body, role, hashedPassword);
    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect("/signup");
  }
});

// Get Login Page
app.get("/login", alreadyLoggedIn, (req, res) => {
  res.render("login", {
    csrfToken: req.csrfToken(),
    title: "Login",
  });
});

// Post Login Page
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

// Get Dashboard Page
app.get("/dashboard", isLoggedIn, async (req, res) => {
  const user = capitalizeName(req.user);
  const joinedSessions = await sessionGenerator(
    await Session.getJoinedSessions(req.user.email)
  );
  const createdSessions = await sessionGenerator(
    await Session.getCreatedSessions(req.user.id)
  );
  const canceledSessions = await sessionGenerator(
    await Session.getCanceledSessions(req.user.email)
  );
  const admin = req.user.admin;
  res.render("dashboard", {
    csrfToken: req.csrfToken(),
    title: "Dashboard",
    createdSessions: createdSessions,
    joinedSessions: joinedSessions,
    canceledSessions: canceledSessions,
    user: user,
    admin: admin,
    displayPrompt: false,
  });
});

// Get Sports Page
app.get("/sports", isLoggedIn, async (req, res) => {
  const sports = await sportGenerator(await Sport.getAllSports());
  const admin = req.user.admin;
  res.render("sports", {
    csrfToken: req.csrfToken(),
    title: "Sports",
    sports: sports,
    admin: admin,
  });
});

// Get Create Sport Page
app.get("/sports/new-sport", isAdmin, (req, res) => {
  const admin = req.user.admin;
  res.render("new-sport", {
    csrfToken: req.csrfToken(),
    title: "New Sport",
    admin: admin,
  });
});

// Post Create Sport Page
app.post("/sports/new-sport", isAdmin, async (req, res) => {
  try {
    await Sport.createNewSport(req.user.id, capitalizeString(req.body.sport));
    res.locals.messages = req.flash("success", "Sport successfully created");
    res.redirect("/sports");
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect("/sports");
  }
});

// Get Edit Sport Page
app.get("/sports/:sport/edit-sport", isAdmin, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    let admin = req.user.admin;
    res.render("edit-sport", {
      csrfToken: req.csrfToken(),
      title: `Update Sport`,
      currentSport: req.params.sport,
      admin: admin,
    });
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport does not exist`);
    res.redirect("/sports/" + req.params.sport);
  }
});

// Post Edit Sport Page
app.post("/sports/:sport/edit-sport", isAdmin, async (req, res) => {
  try {
    const sportId = await Sport.getSportId(req.params.sport);
    if (req.body.sport === req.params.sport) {
      res.locals.messages = req.flash("error", `Sport name cannot be the same`);
      res.redirect("/sports/" + req.params.sport + "/edit-sport");
      return;
    }
    await Sport.updateSport(sportId, capitalizeString(req.body.sport));
    res.locals.messages = req.flash("success", "Sport successfully updated");
    res.redirect("/sports/" + capitalizeString(req.body.sport));
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport does not exist`);
    res.redirect("/sports/" + req.params.sport);
  }
});

// Get Sessions Page
app.get("/sports/:sport", isLoggedIn, async (req, res) => {
  try {
    const sportId = await Sport.getSportId(req.params.sport);
    const oldSessions = await sessionGenerator(
      await Session.getOlderSessions(sportId),
      true,
      true,
      req.user.id
    );
    const newSessions = await sessionGenerator(
      await Session.getNewerSessions(sportId),
      true,
      true,
      req.user.id
    );
    const admin = req.user.admin;
    res.render("session", {
      csrfToken: req.csrfToken(),
      title: `${req.params.sport} Sport`,
      sport: req.params.sport,
      oldSessions: oldSessions,
      newSessions: newSessions,
      admin: admin,
      displayPrompt: true,
    });
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport does not exist`);
    res.redirect("/sports");
  }
});

// Get Create Session Page
app.get("/sports/:sport/new-session", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    let admin = req.user.admin;
    res.render("new-session", {
      csrfToken: req.csrfToken(),
      title: `New ${req.params.sport} Session`,
      sport: req.params.sport,
      admin: admin,
    });
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport does not exist`);
    res.redirect("/sports");
  }
});

// Post Create Session Page
app.post("/sports/:sport/new-session", isLoggedIn, async (req, res) => {
  try {
    const sportId = await Sport.getSportId(req.params.sport);
    if (new Date(req.body.date) < new Date()) {
      res.locals.messages = req.flash("error", `Date cannot be in the past`);
      res.redirect("/sports/" + req.params.sport + "/new-session");
    } else if (req.body.remaining < 0) {
      res.locals.messages = req.flash(
        "error",
        `Remaining spots cannot be less than 0`
      );
      res.redirect("/sports/" + req.params.sport + "/new-session");
    } else {
      const session = await Session.createNewSession(
        req.user.id,
        req.body,
        sportId
      );
      res.locals.messages = req.flash(
        "success",
        "Session successfully created"
      );
      res.redirect("/sports/" + req.params.sport + "/" + session.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect("/sports/" + req.params.sport + "/new-session");
  }
});

// Get Edit Session Page
app.get("/sports/:sport/:id/edit-session", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    let session = await sessionGenerator(
      await Session.getSessionById(req.params.id),
      true
    );
    let admin = req.user.admin;
    if (session[0].date < new Date()) {
      res.locals.messages = req.flash("info", `Session already over`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session[0].cancel) {
      res.locals.messages = req.flash("info", `Session already cancelled`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session[0].userId === req.user.id) {
      res.render("edit-session", {
        csrfToken: req.csrfToken(),
        title: `Edit ${req.params.sport} #${req.params.id} Session`,
        session: session,
        admin: admin,
      });
    } else {
      res.locals.messages = req.flash("info", `User not authorized`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports");
  }
});

// Post Edit Session Page
app.post("/sports/:sport/:id/edit-session", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    if (req.body.date < new Date()) {
      res.locals.messages = req.flash("error", `Date cannot be in the past`);
      res.redirect(
        "/sports/" + req.params.sport + "/" + req.params.id + "/edit-session"
      );
    } else if (req.body.remaining < 0) {
      res.locals.messages = req.flash(
        "error",
        `Remaining spots cannot be less than 0`
      );
      res.redirect(
        "/sports/" + req.params.sport + "/" + req.params.id + "/edit-session"
      );
    } else {
      await Session.updateSession(req.params.id, req.body);
      res.locals.messages = req.flash(
        "success",
        "Session successfully updated"
      );
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect(
      "/sports/" + req.params.sport + "/" + req.params.id + "/edit-session"
    );
  }
});

// Get Session Info Page
app.get("/sports/:sport/:id", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    const session = await sessionGenerator(
      await Session.getSessionById(req.params.id),
      true,
      true,
      req.user.id
    );
    let admin = req.user.admin;
    res.render("session-info", {
      csrfToken: req.csrfToken(),
      title: `${req.params.sport} #${req.params.id} Session`,
      session: session,
      user: req.user.id,
      admin: admin,
    });
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports");
  }
});

// Get Join Session Info Page
app.get("/sports/:sport/:id/join", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    const session = await Session.getSessionById(req.params.id);
    if (session.date < new Date()) {
      res.locals.messages = req.flash("info", `Session already over`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session.cancel) {
      res.locals.messages = req.flash("info", `Session already cancelled`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session.membersList.includes(req.user.email)) {
      res.locals.messages = req.flash("info", `Already joined the Session`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session.remaining < 1) {
      res.locals.messages = req.flash("info", `All slots are booked`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else {
      await Session.joinSession(req.user.email, req.params.id);
      res.locals.messages = req.flash("success", `Joined the Session`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports");
  }
});

// Get Leave Session Info Page
app.get("/sports/:sport/:id/:index/leave", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    const session = await Session.getSessionById(req.params.id);
    if (session.date < new Date()) {
      res.locals.messages = req.flash("info", `Session already over`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session.cancel) {
      res.locals.messages = req.flash("info", `Session already cancelled`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session.membersList.length < req.params.index) {
      res.locals.messages = req.flash("info", `User not present in Session`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (
      session.userId === req.user.id ||
      session.membersList.indexOf(req.user.email) === Number(req.params.index)
    ) {
      await Session.leaveSession(req.params.index, req.params.id);
      res.locals.messages = req.flash("success", `Left the Session`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else {
      res.locals.messages = req.flash("info", `User not authorized`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports");
  }
});

// Get Cancel Session Info Page
app.get("/sports/:sport/:id/cancel-session", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    let session = await sessionGenerator(
      await Session.getSessionById(req.params.id),
      true
    );
    let admin = req.user.admin;
    if (session[0].date < new Date()) {
      res.locals.messages = req.flash("info", `Session already over`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session[0].cancel) {
      res.locals.messages = req.flash("info", `Session already cancelled`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    } else if (session[0].userId === req.user.id) {
      res.render("cancel", {
        csrfToken: req.csrfToken(),
        title: `Cancel ${req.params.sport} #${req.params.id} Session`,
        session: session,
        admin: admin,
      });
    } else {
      res.locals.messages = req.flash("info", `User not authorized`);
      res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports");
  }
});

// Post Cancel Session Info Page
app.post("/sports/:sport/:id/cancel-session", isLoggedIn, async (req, res) => {
  try {
    await Sport.getSportId(req.params.sport);
    await Session.cancelSession(
      req.params.id,
      capitalizeString(req.body.reason)
    );
    res.locals.messages = req.flash("success", "Session has been cancelled");
    res.redirect("/sports/" + req.params.sport + "/" + req.params.id);
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", `Sport or Session does not exist`);
    res.redirect("/sports/" + req.params.sport);
  }
});

// Get report Page
app.get("/report", isAdmin, async (req, res) => {
  const admin = req.user.admin;
  const user = capitalizeName(req.user);
  if (!(req.query.start && req.query.end)) {
    const year = new Date().getFullYear();
    req.query.start = `${year}-01-01`;
    req.query.end = `${year}-12-31`;
  }
  const sessions = await sessionGenerator(
    await Session.getSessionByDate(req.query),
    true,
    true,
    req.user.id
  );
  const sessionCount = sportSessions(sessions);
  res.render("report", {
    csrfToken: req.csrfToken(),
    title: "Report",
    admin: admin,
    user: user,
    date: [req.query.start, req.query.end],
    sessions: sessions,
    sessionCount: sessionCount,
    displayPrompt: true,
  });
});

// Get Profile Page
app.get("/profile", isLoggedIn, async (req, res) => {
  res.render("profile", {
    csrfToken: req.csrfToken(),
    title: "Profile",
    admin: req.user.admin,
    user: capitalizeName(req.user),
    userDetail: req.user,
  });
});

// Get Edit Profile Page
app.get("/profile/edit", isLoggedIn, async (req, res) => {
  let admin = req.user.admin;
  res.render("edit-user", {
    csrfToken: req.csrfToken(),
    title: "Edit Profile",
    admin: admin,
    user: req.user,
  });
});

// Post Edit Profile Page
app.post("/profile/edit", isLoggedIn, async (req, res) => {
  try {
    await User.updateUser(req.user.id, req.body);
    res.locals.messages = req.flash("success", "Profile Updated");
    res.redirect("/profile");
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect("/profile/edit");
  }
});

// Get Change Password Page
app.get("/profile/change-password", isLoggedIn, async (req, res) => {
  let admin = req.user.admin;
  res.render("edit-pass", {
    csrfToken: req.csrfToken(),
    title: "Change Password",
    admin: admin,
  });
});

// Post Change Password Page
app.post("/profile/change-password", isLoggedIn, async (req, res) => {
  try {
    if (!(await bcrypt.compare(req.body.oldPassword, req.user.password))) {
      res.locals.messages = req.flash("error", "Old Password is incorrect");
      res.redirect("/profile/change-password");
    } else if (await bcrypt.compare(req.body.newPassword, req.user.password)) {
      res.locals.messages = req.flash(
        "error",
        "Old and New Passwords are same"
      );
      res.redirect("/profile/change-password");
    } else {
      await User.updatePassword(
        req.user.id,
        await bcrypt.hash(req.body.newPassword, 10)
      );
      res.locals.messages = req.flash("success", "Password Updated");
      res.redirect("/profile");
    }
  } catch (error) {
    console.log(error);
    res.locals.messages = req.flash("error", error.errors[0].message);
    res.redirect("/profile/change-password");
  }
});

// Get Logout Page
app.get("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) {
      console.log(error);
      return next(error);
    }
    res.redirect("/");
  });
});

// Export app
module.exports = app;
