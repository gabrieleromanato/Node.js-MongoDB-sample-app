'use strict';

const mongoose  = require('mongoose');

let Schema  = mongoose.Schema;

let RestaurantSchema = new Schema({
  address: Object,
  borough: String,
  cuisine: String,
  grades: Array,
  name: String,
  restaurant_id: String,
  image: String

},{collection: 'restaurants'});

module.exports = mongoose.model('Restaurants', RestaurantSchema);
