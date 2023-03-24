const express = require('express');
const csurf = require("tiny-csrf");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser("cookie-parser-secret"));
app.use(session({
    secret: "keyboard cat",
    cookie: {
        maxAge: 3600000
    }
}));
app.use(csurf("bxMNjNqSnWZvWE8f6oxTBykN71PoXmHz"));
app.set('view engine', 'ejs');
app.use(express.static(path.resolve(__dirname, 'public')));
app.set("views", path.resolve(__dirname, "views"));


app.get('/', (req, res) => {
    res.render('homepage', {
        csrfToken: req.csrfToken()
    });
});

module.exports = app;