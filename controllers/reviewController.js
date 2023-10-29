const Review = require('./../models/reviewModel');
// const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

exports.setTourUsersIds = (req, res, next) => {
  // NESTED ROUTES
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.createReview = factory.createOne(Review);

exports.deleteReview = factory.deleteOne(Review);

// getting all reviews or getting reviews for a particular tour
exports.getAllReviews = factory.getAll(Review);

exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);