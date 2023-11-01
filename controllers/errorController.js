const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;

  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate fields value  (${err.keyValue.name}) please use another value`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(
    (errorItem) => errorItem.message,
  );

  const message = `Invalid input data ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const sendErrorDev = (error, req, res) => {
  ///////
  if (req.originalUrl.startsWith('/api')) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      error,
      stack: error.stack,
    });
  } else {
    res.status(error.statusCode).render('error', {
      title: 'something went wrong',
      msg: error.message,
    });
  }
};

const handleJWTError = (err) =>
  new AppError('Invalid token pls login again', 401);

const handleJWTExpireToken = (err) =>
  new AppError('Your token has expired pls login again', 401);

const sendErrorProd = (error, res, req) => {
  if (req.originalUrl.startsWith('/api')) {
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    } else {
      console.error('Error ✨ IZ NOT OPERATIONAL', error);

      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
      });
    }
  }
  res.status(error.statusCode).render('error', {
    title: 'something went wrong',
    msg: error.message,
  });
};
module.exports = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  console.log(process.env.NODE_ENV);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let err;

    if (error.name === 'CastError') {
      err = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      err = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      err = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      err = handleJWTError(error);
    }
    if (error.name === 'TokenExpiredError') {
      err = handleJWTExpireToken(error);
    }

    sendErrorProd(err || error, res, req);
  }
  next();
};
