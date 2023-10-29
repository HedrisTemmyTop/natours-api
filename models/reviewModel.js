const Tour = require('./tourModel');

// review text
// rating
// createdAt

// ref to tour

// user who wrote the review

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'User must add a review'],
    minLength: [3, 'User must input at least 3 character'],
    maxLength: [50000, 'User must input at most 5000 character'],
  },
  rating: {
    type: Number,
    required: [true, 'A review must have a rating'],
    min: 1,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  user: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  ],
  tour: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
  ],
});

reviewSchema.index(
  { tour: 1, user: 1 },
  {
    unique: true,
  },
);

// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'user',
//     select: 'name photo',
//   }).populate({
//     path: 'tour',
//     select: 'name',
//   });

//   next();
// });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $num: 1 },
        avgRating: { $avg: 'rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();

  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  // this points to current review
  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// POST tour/123456ffd/reviews     post review on a tour route
// GET tour/123456ffd/reviews get reviews on tours route
// GET tour/123456ffd/reviews/98dauah get tour
