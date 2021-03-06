import express from 'express';
import path from 'path';

import hbs from 'express-hbs';
import morgan from 'morgan';
import session from 'express-session';
import flash from 'express-flash';
import statusMonitor from 'express-status-monitor';
import bodyParser from 'body-parser';
import lusca from 'lusca';
import expressValidator from 'express-validator';
import errorhandler from 'errorhandler';
import passport from 'passport';
import cookieParser from 'cookie-parser';

import mongoose from 'mongoose';
import connectMongo from 'connect-mongo';

import chalk from 'chalk';
import migrate from 'migrate';
import logger from './logger';

/**
 * Import all the routes from ./routes
 */
import homeRoute from './home';
import apiRoute from './api';
import adminRoute from './admin';
import ajaxRoute from './ajax';

import { hbsHelpers } from './hbs/helpers';

import { localStrategy } from './auth/passport';

/**
 * Create an Express app
 */

const app = express();

/**
 * Then configurating and connecting to the MongoDB with Mongoose
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_CONNECT_URI, {
    useMongoClient: true,
});
mongoose.connection.on('error', (err) => {
    logger.error(err);
    logger.info('%s - MongoDB connection error. Please make sure MongoDB is running.', chalk.red('Error'));
    process.exit(1);
});

/**
 * Running the migrations
 */
if (process.env.AUTO_MIGRATE === 'true') {
    migrate.load({
        stateStore: path.resolve(__dirname, '../migrations/.migrate'),
    }, (err, set) => {
        if (err) {
            return logger.error(err);
        }
        set.up((upErr) => {
            if (upErr) {
                return logger.error(upErr);
            }
            return logger.info(chalk.green('Migration process successfully!'));
        });
    });
}

/**
 * Setting the default configurations for express application
 */
app.engine('hbs', hbs.express4({
    partialsDir: path.resolve(__dirname, '../views', 'partials'),
    layoutsDir: path.resolve(__dirname, '../views', 'layouts'),
}));
app.set('host', process.env.HOST || 'localhost');
app.set('port', parseInt(process.env.PORT, 10) || 3000);
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');

app.set('uploadsDir', path.resolve(__dirname, '../static/uploads'));

/**
 * Registering all custom Handlebars helpers
 */
hbs.registerHelpers(hbsHelpers);

// Setting up passport
passport.use(localStrategy);

/**
 * Registering global middlewares goes here
 */

// Morgan for logging requests and responses
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(statusMonitor());

// Express session
const MongoStore = connectMongo(session);
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGODB_CONNECT_URI,
    }),
    name: 'boilerplate.sid',
}));

// Express cookies parser
app.use(cookieParser());

// Flashing messages
app.use(flash());

// Parsing data
app.use(bodyParser.urlencoded({extended: true}));
// and validating data
app.use(expressValidator());

// Initializing passport
app.use(passport.initialize());
app.use(passport.session());

// Securing Cross Site Request Forgery (CSRF)
app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        next();
    } else {
        if (process.env.NODE_ENV === 'development' && req.method.toLowerCase() === 'post') {
            logger.info('%j', req.body);
        }
        lusca.csrf()(req, res, next);
    }
});
// Enabling X-FRAME-OPTIONS headers to help prevent Clickjacking.
app.use(lusca.xframe('SAMEORIGIN'));
// Enabling X-XSS-Protection headers to help prevent
// cross site scripting (XSS) attacks in older IE browsers (IE8)
app.use(lusca.xssProtection(true));

// Serve static files
app.use('/static', express.static(path.resolve(__dirname, '../static')));

/**
 * Registering routes goes here
 */
app.use('/admin', adminRoute);
app.use('/ajax', ajaxRoute);
app.use('/api', apiRoute);
app.use('/', homeRoute);


/**
 * Handling errors
 */
// Handling 404 - Not Found
app.use((req, res, next) => {
    // Send Not Found response to AJAX requests
    if (req.xhr || req.is('application/json')) {
        return res.status(404).send({
            name: 'Error 404',
            message: 'Route Not Found.',
        });
    }
    // Send Not Found status
    return res.status(404).send('Error 404: Page Not Found.');
});
if (process.env.NODE_ENV === 'development') {
    // only use errorhandler in development
    app.use((err, req, res, next) => {
        logger.error('errorhandler');
        errorhandler()(err, req, res, next);
    });
} else {
    /**
     * Production error handlers middlewares
     */
    // print error stack to logger
    // then delete the stack
    app.use((err, req, res, next) => {
        logger.error(err.stack);
        delete err.stack;
        return next(err);
    });

    // Set statusCode default to 500 - Internal Server Error
    app.use((err, req, res, next) => {
        if (res.statusCode < 400) {
            // respect err.statusCode
            res.statusCode = err.statusCode || 500;
        }
        next(err);
    });

    // Server default error handler
    app.use((err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        // Send a JSON error response to AJAX requests
        if (req.xhr || req.is('application/json')) {
            return res.send({
                name: err.message,
                message: err.message,
            });
        }
        return res.send(`${err.name}: ${err.message}`);
    });
}

export default app;
