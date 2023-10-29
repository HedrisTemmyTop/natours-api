/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const res = await axios.get(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + chanre credit card
    if (res.data.data) {
      location.assign(res.data.data.authorizationURL);
    }
  } catch (err) {
    showAlert('error', err);
  }
};
