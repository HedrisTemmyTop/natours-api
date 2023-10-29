const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const URL = require('./url');
const userRouter = require('./routes/userRoutes');
const path = require('path');
const tourRouter = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoute');
const bookingsRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const helmet = require('helmet');
const globalErrorHandler = require('./controllers/errorController');
const monogoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
// ...

/// app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// GLOBAL MIDDLEWARE

// Security http headers

app.use(helmet());

/// body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "connect-src 'self' http://127.0.0.1:8000",
  );
  next();
});

// data sanitization against NoSQL query injection
app.use(monogoSanitize());

// Data sanitization against XSS
app.use(xss());
// prevents parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'difficulty',
      'maxGroupSize',
      'price',
    ],
  }),
);

app.use(compression());
// development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour',
});

// limit req fom same api from a single IP address
app.use('/api', limiter);

// serving static files

// testing middlewares
app.use((req, res, next) => {
  next();
});

// adding request time to the req

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// app.get('/', (req, res) => {
//   res.status(404).json({
//     message: "Hello world! it's live server here",
//     app: 'natours',
//   });
// });

// app.post('/', (req, res) => {
//   res.status(200).send('You can post to this endpoint');
// });

// DEFAULT ROUTE

/////////////

////////////////

// app.get(URL, getAllTours);
// app.get(`${URL}/:id`, getTour);
// app.post(URL, createTour);
// app.patch(`${URL}/:id`, updateTour);
// app.delete(`${URL}/:id`, deleteTour);

// router middlewares
app.use('/', viewRouter);

app.use(`${URL}users`, userRouter);
app.use(`${URL}tours`, tourRouter);
app.use(`${URL}reviews`, reviewRouter);
app.use(`${URL}bookings`, bookingsRouter);

//not found middlewares
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on the server`,
  // });
  // const err =
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
