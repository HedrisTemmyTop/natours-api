const express = require('express');

const {
  protect,
  restrictTo,
  isLoggedIn,
} = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');
//

////
const router = express.Router();

router.get('/paystack/callback', protect, bookingController.paymentMade);
router.get(
  '/checkout-session/:tourId',
  protect,
  bookingController.getCheckoutSession,
);

router.get('/my-tours', protect, bookingController.getMyTours);
module.exports = router;
