const fs = require('fs');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

///

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    //user-78898-333333.jpeg

    const ext = file.mimetype.split('/')[1];

    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

// const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({
  dest: 'public/img/users',
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

// exports.resizePhoto = catchAsync(async (req, res, next) => {
// console.log(req.body);
// console.log('user details');
// if (!req.body.photo) {
//   console.log('user details 2');
//   return next();
// }
// console.log('user details 3');

// console.log(req.user.id);
// req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
// await sharp(req.file.buffer)
//   .resize(500, 500)
//   .toFormat('jpeg')
//   .jpeg({ quality: 90 })
//   .toFile(`public/images/users/${req.file.filename}`);

// next();
// });

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/users.json`),
  'utf-8',
);
////

//

//
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //  Create error if user tries to update password

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('You are not able to update password using this route', 400),
    );
  }

  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // Update the user document
  res.status(200).json({
    status: 'success',
    message: 'Profile has been updated successfuly',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    {
      active: false,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  // Update the user document
  res.status(204).json({
    status: 'success',

    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined',
  });
};

exports.getAllUsers = factory.getAll(User);

exports.updateUser = factory.updateOne(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;

  next();
};
