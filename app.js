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

app.get('/', async (req, res) => {
    console.log("Get Homepage")
    res.render('homepage', {
        csrfToken: req.csrfToken(),
        title: 'Homepage'
    });
});

app.get('/signup', (req, res) => {
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
        res.redirect('/dashboard')
    } catch (error) {
        console.log(error)
    }
});

app.get('/login', (req, res) => {
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
    if (req.user.admin) {
        let sessions = await Session.findAll();
        const sports = await Sport.findAll();
        sessions.forEach(session => {
            session.dataValues.date = moment(session.dataValues.date).format('MMMM Do YYYY, h:mm a');
        })
        res.render('admin', {
            csrfToken: req.csrfToken(),
            title: 'Dashboard',
            sports: sports,
            sessions: sessions
        })
    } else {
        res.render('player', {
            csrfToken: req.csrfToken(),
            title: 'Dashboard'
        });
    }
});

app.get('/new-sport', isAdmin, (req, res) => {
    res.render('new-sport', {
        csrfToken: req.csrfToken(),
        title: 'New Sport'
    });
});

app.post('/new-sport', isAdmin, async (req, res) => {
    try {
        const sport = await Sport.createNewSport(req.user.id, req.body.sport)
        res.redirect('/dashboard')
    } catch (error) {
        console.log(error)
    }
});

app.get('/new-session', isLoggedIn, async (req, res) => {
    const sports = await Sport.findAll();
    if (sports.length === 0) {
        res.redirect('/dashboard')
    }

    res.render('new-session', {
        csrfToken: req.csrfToken(),
        title: 'New Session',
        sports: sports
    });
});

app.post('/new-session', isLoggedIn, async (req, res) => {
    try {
        await Session.createNewSession(req.user.id, req.body)
        res.redirect('/dashboard')
    } catch (error) {
        console.log(error)
    }
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
        return res.redirect("/");
    });
});


module.exports = app