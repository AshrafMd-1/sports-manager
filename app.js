const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const {User, Sport, Session} = require('./models');

const moment = require('moment');

const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const csurf = require("tiny-csrf");
const session = require("express-session");

const passport = require('passport');
const LocalStrategy = require('passport-local')

const app = express();

app.set('view engine', 'ejs');
app.set("views", path.resolve(__dirname, "views"));
app.use(express.static(path.resolve(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieParser("cookie-parser-secret"));
app.use(csurf("bxMNjNqSnWZvWE8f6oxTBykN71PoXmHz"));

app.use(session({
    saveUninitialized: true,
    resave: true,
    secret: "keyboard cat",
    cookie: {
        maxAge: 3600000
    }
}));

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
                        console.log("No User")
                        return done(null, false);
                    }
                    const result = await bcrypt.compare(password, user.password);
                    if (result) {
                        console.log("Matched")
                        return done(null, user);
                    } else {
                        console.log("Not Matched")
                        return done(null, false);
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
            done(err, null);
        });
});

const alreadyLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard')
    } else {
        return next()
    }
}
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
};

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.admin) {
            return next();
        }
        res.redirect('/logout')
    }
    res.redirect('/login')
}

app.get('/', alreadyLoggedIn, async (req, res) => {
    console.log("Get Homepage")
    res.render('homepage', {
        csrfToken: req.csrfToken(),
        title: 'Homepage'
    });
});

app.get('/signup', alreadyLoggedIn, (req, res) => {
    console.log("Get Signup")
    res.render('signup', {
        csrfToken: req.csrfToken(),
        title: 'Signup'
    });

});

app.post('/signup', async (req, res) => {
    console.log("Post Signup")
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const role = (req.body.role.toLowerCase() === "admin");
    try {
        const user = await User.createNewUser(req.body, role, hashedPassword)
        res.redirect('/login')
    } catch (error) {
        console.log(error)
    }
});

app.get('/login', alreadyLoggedIn, (req, res) => {
    console.log("Get Login")
    res.render('login', {
        csrfToken: req.csrfToken(),
        title: 'Login'
    });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
}));

app.get('/dashboard', isLoggedIn, async (req, res) => {
    console.log("Get Dashboard")
    if (req.user.admin) {
        const createdSessions = await Session.getCreatedSessions(req.user.id)
        const createdSports=[]
        for (let i = 0; i < createdSessions.length; i++) {
            const sport= await Sport.getSport(createdSessions[i].sportId)
            createdSports.push(sport.dataValues.sport)
        }
        const joinedSessions = await Session.joinedSessions(req.user.id)
        const joinedSports=[]
        for (let i = 0; i < joinedSessions.length; i++) {
            const sport= await Sport.getSport(joinedSessions[i].sportId)
            joinedSports.push(sport.dataValues.sport)
        }
        res.render('dashboard', {
            csrfToken: req.csrfToken(),
            title: 'Dashboard',
            createdSessions: createdSessions.map(session => session.dataValues),
            createdSports: createdSports,
            joinedSessions: joinedSessions.map(session => session.dataValues),
            joinedSports: joinedSports,
            dashboard: true

        })
    } else {
        res.render('dashboard', {
            csrfToken: req.csrfToken(),
            title: 'Dashboard'
        });
    }
});

app.get('/sports', isLoggedIn, async (req, res) => {
    console.log("Get Sports")
    const sports = await Sport.findAll();
    res.render('sports', {
        csrfToken: req.csrfToken(),
        title: 'Sports',
        sports: sports.map(sport => sport.dataValues.sport)
    });
});

app.get('/sports/new-sport', isAdmin, (req, res) => {
    console.log("Get New Sport")
    res.render('new-sport', {
        csrfToken: req.csrfToken(),
        title: 'New Sport'
    });
});

app.post('/sports/new-sport', isAdmin, async (req, res) => {
    try {
        const sport = await Sport.createNewSport(req.user.id, req.body.sport.charAt(0).toUpperCase() + req.body.sport.slice(1))
        res.redirect('/sports')
    } catch (error) {
        console.log(error)
    }
});

app.get('/sports/:sport', isLoggedIn, async (req, res) => {
    console.log(`Get ${req.params.sport} Sport`)
    const sportId = await Sport.getSportId(req.params.sport)
    const oldSessions = await Session.getOlderSessions(sportId.dataValues.id)
    const newSessions = await Session.getNewerSessions(sportId.dataValues.id)
    res.render('session', {
        csrfToken: req.csrfToken(),
        title: `${req.params.sport} Sessions`,
        sport: req.params.sport,
        oldSessions: oldSessions.map(session => session.dataValues),
        newSessions: newSessions.map(session => session.dataValues),
        dashboard: false
    })
});

app.get('/sports/:sport/new-session', isLoggedIn, async (req, res) => {
    console.log(`Get New ${req.params.sport} Session`)
    res.render('new-session', {
        csrfToken: req.csrfToken(),
        title: `New ${req.params.sport} Session`,
        sport: req.params.sport
    });
});

app.post('/sports/:sport/new-session', isLoggedIn, async (req, res) => {
    console.log("Post New Session")
    try {
        let sportId = await Sport.getSportId(req.params.sport)
        sportId = sportId.dataValues.id
        await Session.createNewSession(req.user.id, req.body, sportId)
        res.redirect('/sports/' + req.params.sport)
    } catch (error) {
        console.log(error)
    }
});

app.get('/sports/:sport/:id', isLoggedIn, async (req, res) => {
    console.log(`Get ${req.params.sport} #${req.params.id} Session Info`)
    const info = await Session.getSessionById(req.params.id)
    const membersId = await Session.getAllMembersId(req.params.id)
    let members = []
    for (let i = 0; i < membersId.length; i++) {
        const member = await User.getUserDetailsById(membersId[i])
        members.push(member.dataValues)
    }
    res.render('session-info', {
        csrfToken: req.csrfToken(),
        title: `${req.params.sport} #${req.params.id} Session`,
        sport: req.params.sport,
        id: req.params.id,
        session: info.dataValues,
        members: members,
        userId: req.user.id,
        old: (info.dataValues.date < new Date())
    })
});

app.get('/sports/:sport/:id/:job', isLoggedIn, async (req, res) => {
    if (await Session.getSessionDate(req.params.id) < new Date()) {
        res.redirect('/sports/' + req.params.sport + '/' + req.params.id)
        return
    }
    let membersId = await Session.getAllMembersId(req.params.id)
    let required = await Session.getRequired(req.params.id)
    if (req.params.job === "join-session") {
        if (membersId.includes(req.user.id)) {
            res.redirect('/sports/' + req.params.sport + '/' + req.params.id)
            return
        }
        membersId.push(req.user.id)
        membersId.sort()
        required = required - membersId.length
        await Session.joinSession(req.params.id, membersId, required)
    } else if (req.params.job === "leave") {
        if (!membersId.includes(req.user.id)) {
            res.redirect('/sports/' + req.params.sport + '/' + req.params.id)
            return
        }
        const index = membersId.indexOf(req.user.id);
        membersId.splice(index, 1);
        membersId.sort()
        required = required + 1
        await Session.joinSession(req.params.id, membersId, required)
    } else {
        res.redirect('/sports/' + req.params.sport + '/' + req.params.id)
        return
    }
    res.redirect('/sports/' + req.params.sport + '/' + req.params.id)
});


app.get('/admin', isAdmin, (req, res) => {
    res.send("Admin")

});

app.get("/logout", (req, res, next) => {
    req.logout((error) => {
        if (error) {
            console.log(error);
            return next(error);
        }
        res.redirect("/");
    });
});


module.exports = app