const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
  shopName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
    unique: true,
    match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
  },
  password: {
    type: String,
    required: true,
  }
}
,{ 
    timestamps: true,
  });

module.exports = mongoose.model('Shop', shopSchema);
