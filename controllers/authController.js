const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('./../utils/email');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

const createSendToken = (user, message, statusCode, res) => {
  const token = signToken(user.id);
  const convert = process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000;
  const cookieOptions = {
    expires: new Date(Date.now() + convert),
    // secure: true,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // remove password

  user.password = undefined;

  // send response
  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  const message = 'User has been created successfully';
  createSendToken(newUser, message, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const { password } = req.body;

  // If e-mail and password is passed
  if (!email || !password) {
    const message = `Pls provide e-mail and password`;
    return next(new AppError(message, 400));
  }
  //  1.) Check if e mail and password exists
  const user = await User.findOne({ email }).select('+password');
  //) If password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    const message = `Incorrect email or password`;
    return next(new AppError(message, 401));
  }

  const message = 'user logged in successfuly';
  createSendToken(user, message, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'logged-out', {
    expires: new Date(Date.now() + 10 * 10000),
  });

  res.status(200).json({
    status: 'success',
    message: 'log out successful',
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // Get the token and check if it's passed

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in!, pls log in to get access', 401),
    );
  }
  // verify the token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // Check if user still exist
  const checkUser = await User.findById(decoded.id);
  if (!checkUser) {
    return next(new AppError('User with this token no longer exist', 401));
  }
  // check if user changed password after the token was issuec
  if (checkUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Password was recently changed pls log in again', 401),
    );
  }

  // Grant access to protected route

  req.user = checkUser;
  res.locals.user = checkUser;
  //   console.log(req.user);
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You are not allowed to perform action', 403));
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on posted email
  const { email } = req.body;

  //   if (!email) {
  //     return next(new AppError('Pls provide an e-mail address', 400));
  //   }

  const user = await User.findOne({ email });
  if (!user)
    return next(
      new AppError(
        "There's no user with this email address, kindly sign up",
        404,
      ),
    );

  // generate a reset token

  const resetToken = user.createPasswordResetToken();
  await user.save({
    validateBeforeSave: false,
  });
  // send the reset token to the user
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;
  // const message = `Forgot your password? sumbit a PATCH req with your new password and passwordConfirm to ${resetURL}.\n if you did not forget your password pls ignore this email`;
  try {
    // await sendEmail({
    //   message,
    //   email: user.email,
    //   subject: 'Your password reset token valid for 10mins',
    // });

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Your reset token is sent to your email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passowrdResetTokenExpires = undefined;
    await user.save({
      validateBeforeSave: false,
    });
    return next(new AppError('An error occured pls try again', 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // if token has not expired and the user exist set new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // update the changedpasswordAt property
  // log the user in and send JWT#
  const message = 'password has been updated successfully';
  createSendToken(user, message, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // check if user provided a confrimpassword
  if (!req.body.passwordConfirm) {
    return next(new AppError('Kindly confirm your password, try again', 400));
  }
  // GET user from the collection

  const user = await User.findOne({ _id: req.user._id }).select('+password');

  // check if the posted password is correct
  if (
    !user ||
    !(await user.correctPassword(req.body.passwordCurrent, user.password))
  ) {
    return next(new AppError('Incorrect password, try again', 400));
  }
  // if so update the password
  user.password = req.body.password;
  user.passwordChangedAt = Date.now();
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  // log the user in and send a token
  const message = 'password has been updated successfully';
  createSendToken(user, message, 200, res);
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies?.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  return next();
};
