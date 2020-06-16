/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const logger = require('pino')(config.logger.pino);
const pinoEx = require('express-pino-logger')({ logger });

const path = require('path');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const expressStatusMonitor = require('express-status-monitor');
const passport = require('passport');
const errorHandler = require('errorHandler');
const flash = require('express-flash');
const bodyParser = require('body-parser');

const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');

const express = require('express');
const passportConfig = require('./auth/passport');

const app = express();

app.set('host', process.env.OPENSHIFT_NODEJS_IP || config.host ||'0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || config.port || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
if (process.env.NODE_ENV === "development") app.use(expressStatusMonitor());
app.use(helmet());
app.use(cors());
app.use(compress());
if (process.env.NODE_ENV === "development") app.use(pinoEx); // logger
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session(Object.assign({}, {
	resave: false,
	saveUninitialized: false,
	secret: process.env.SESSION_SECRET || (Math.random() * Date.now()).toString("36"),
	cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
	// store: new MongoStore({})
}, config.session)));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Host the public folder
app.use('/', express.static(path.resolve(__dirname, './public'), { maxAge: 31557600000 }));	// 1 year maxAge

app.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});
app.use((req, res, next) => {
	// After successful login, redirect back to the intended page
	if (!req.user
		&& req.path !== '/login'
		&& req.path !== '/signup'
		&& !req.path.match(/^\/auth/)
		&& !req.path.match(/\./)) {
		req.session.returnTo = req.originalUrl;
	} else if (req.user
		&& (req.path === '/account' || req.path.match(/^\/api/))) {
		req.session.returnTo = req.originalUrl;
	}
	next();
});

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account/verify', passportConfig.isAuthenticated, userController.getVerifyEmail);
app.get('/account/verify/:token', passportConfig.isAuthenticated, userController.getVerifyEmailToken);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);


/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/instagram', passport.authenticate('instagram', { scope: ['basic', 'public_content'] }));
app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/snapchat', passport.authenticate('snapchat'));
app.get('/auth/snapchat/callback', passport.authenticate('snapchat', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email' /*, 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly' */], accessType: 'offline', prompt: 'consent' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitch', passport.authenticate('twitch', {}));
app.get('/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo || '/');
});

/**
 * OAuth authorization routes. (API examples)
 */
app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), (req, res) => {
	res.redirect('/api/foursquare');
});
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), (req, res) => {
	res.redirect('/api/tumblr');
});
app.get('/auth/steam', passport.authorize('openid', { state: 'SOME STATE' }));
app.get('/auth/steam/callback', passport.authorize('openid', { failureRedirect: '/api' }), (req, res) => {
	res.redirect(req.session.returnTo);
});
app.get('/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
app.get('/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/login' }), (req, res) => {
	res.redirect('/api/pinterest');
});
app.get('/auth/quickbooks', passport.authorize('quickbooks', { scope: ['com.intuit.quickbooks.accounting'], state: 'SOME STATE' }));
app.get('/auth/quickbooks/callback', passport.authorize('quickbooks', { failureRedirect: '/login' }), (req, res) => {
	res.redirect(req.session.returnTo);
});


/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
	// only use in development
	app.use(errorHandler({logger}));
} else {
	app.use((err, req, res, next) => {
		logger.error(err);
		res.status(500).send('Server Error');
	});
}

module.exports = app;