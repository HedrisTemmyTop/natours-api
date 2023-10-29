const fs = require('fs');
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const APIFeatures = require('./../utils/APIFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const axios = require('axios');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Get currently booked tour

  const tour = await Tour.findById(req.params.tourId);

  // create checkout session

  // Set up the Paystack API base URL and headers
  const paystackAPI = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRETE_KEY}`,
    },
  });

  const response = await paystackAPI.post('/transaction/initialize', {
    email: req.user.email,
    amount: tour.price * 100, // Amount in kobo (100 kobo = 1 Naira)
  });

  const data = response.data;
  const accessCode = data.data.access_code;
  const authorizationURL = data.data.authorization_url;

  // Redirect the customer to the authorization URL for payment
 
  res.status(200).json({
    status: 'success',
    message: 'proceed with your payment',
    data: {
      authorizationURL,
      accessCode,
    },
  });

  // send to client
});

exports.paymentMade = catchAsync(async (req, res, next) => {
  const reference = req.body.reference;

  // Verify the payment with Paystack using the reference
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRETE_KEY}`,
      },
    },
  );
  //   const data = JSON.parse(response);
  //   const verificationData = response.data;
  const { status } = response.data.data;
  const { createdAt } = response.data.data;
  const { paidAt } = response.data.data;
  const { amount } = response.data.data;
  const { transactionDate } = response.data.data;
  const { ip_address } = response.data.data;
  const { currency } = response.data.data;
  const { channel } = response.data.data;
  const { id } = response.data.data;

  if (status === 'success') {
    const { tour } = req.body;
    const booking = await Booking.create({
      tour,
      user: req.user.id,
      price: amount,
      paid: true,
      createdAt,
    });
    res.status(200).json({
      status: 'success',
      message: 'payment successful',
      data: {
        status,
        createdAt,
        booking,
      },
      // data: {
      //   // verificationData,
      //   response,
      // },
    });
  } else {
    return next(new AppError('payment not found', 400));
  }

  // Payment is successful
  // You can update your database or take other actions

  //   } else {
  //     return next(new AppError('Payment not successful, pls visit', 400));
  //   }
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).json({
    title: 'My Tours',
    tours,
  });
});
