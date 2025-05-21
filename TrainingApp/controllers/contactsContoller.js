const Contact = require('../models/contact');
const { PhoneNumberUtil } = require('google-libphonenumber');
const twilio = require('twilio');
require('dotenv').config();

const phoneUtil = PhoneNumberUtil.getInstance();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Get all contacts for a user
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await Contact.find({ userId }).select('-__v'); // Exclude version key
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new contact
exports.addContact = async (req, res) => {
  const { name, phoneNumber } = req.body;

  if (!name || !phoneNumber) {
    return res.status(400).json({ message: 'Name and phone number are required' });
  }

  try {
    const userId = req.user.id;
    const existingContact = await Contact.findOne({ phoneNumber, userId });
    if (existingContact) {
      return res.status(400).json({ message: 'Phone number already exists for this user' });
    }

    const contact = new Contact({ name, phoneNumber, userId });
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error adding contact:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a contact
exports.updateContact = async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber } = req.body;

  if (!name || !phoneNumber) {
    return res.status(400).json({ message: 'Name and phone number are required' });
  }

  try {
    const userId = req.user.id;
    const contact = await Contact.findOne({ _id: id, userId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const existingContact = await Contact.findOne({
      phoneNumber,
      userId,
      _id: { $ne: id },
    });
    if (existingContact) {
      return res.status(400).json({ message: 'Phone number already exists for this user' });
    }

    contact.name = name;
    contact.phoneNumber = phoneNumber;
    await contact.save();
    res.status(200).json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a contact
exports.deleteContact = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user.id;
    const contact = await Contact.findOneAndDelete({ _id: id, userId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send SOS message
exports.sendSOS = async (req, res) => {
  const { locationUrl } = req.body;

  if (!locationUrl) {
    return res.status(400).json({ message: 'Location URL is required' });
  }

  try {
    const userId = req.user.id;
    const contacts = await Contact.find({ userId });
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No emergency contacts found' });
    }

    const message = `EMERGENCY ALERT! I need help. My location: ${locationUrl}`;
    const results = {};

    for (const contact of contacts) {
      try {
        const sms = await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact.phoneNumber,
        });
        results[contact.phoneNumber] = `Sent (SID: ${sms.sid})`;
      } catch (error) {
        console.error(`Failed to send SOS to ${contact.phoneNumber}:`, error);
        results[contact.phoneNumber] = `Failed: ${error.message}`;
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error sending SOS:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send SOS message
exports.sendSOS = async (req, res) => {
    const { locationUrl } = req.body;
    if (!locationUrl) {
      return res.status(400).json({ message: 'Location URL is required' });
    }
    try {
      console.log('Received POST /send-sos request with location:', locationUrl);
      const userId = req.user.id;
      const contacts = await Contact.find({ userId });
      if (contacts.length === 0) {
        return res.status(400).json({ message: 'No emergency contacts found' });
      }
      const message = `EMERGENCY ALERT! I need help. My location: ${locationUrl}`;
      const results = {};
      for (const contact of contacts) {
        try {
          const sms = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phoneNumber,
          });
          results[contact.phoneNumber] = `Sent (SID: ${sms.sid})`;
        } catch (error) {
          console.error(`Failed to send SOS to ${contact.phoneNumber}:`, error);
          results[contact.phoneNumber] = `Failed: ${error.message}`;
        }
      }
      console.log('Sending response for POST /send-sos:', results);
      res.status(200).json(results);
    } catch (error) {
      console.error('Error sending SOS:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };