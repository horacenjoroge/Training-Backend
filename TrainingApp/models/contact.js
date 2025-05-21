const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        const { PhoneNumberUtil } = require('google-libphonenumber');
        const phoneUtil = PhoneNumberUtil.getInstance();
        try {
          const number = phoneUtil.parseAndKeepRawInput(v, 'KE'); // Default to Kenya
          return phoneUtil.isValidNumber(number);
        } catch (e) {
          return false;
        }
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);