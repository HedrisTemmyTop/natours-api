const express = require('express');
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateMe,
  uploadUserPhoto,
  deleteMe,
  resizePhoto,
  getMe,
} = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.patch(
  '/update-user',
  authController.protect,
  uploadUserPhoto,
  // resizePhoto,
  updateMe,
);

router.use(authController.protect);

router.get('/me', getMe, getUser);

router.patch(
  '/update-password',

  authController.updatePassword,
);
router.delete('/delete-account', deleteMe);

////////

router.use(authController.restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
