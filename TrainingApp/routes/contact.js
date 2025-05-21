const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Your auth middleware
const contactsController = require('../controllers/contactsContoller'); // Your contacts controller

// Routes for managing emergency contacts
router.get('/', auth, contactsController.getContacts); // Get all contacts for the user
router.post('/', auth, contactsController.addContact); // Add a new contact
router.put('/:id', auth, contactsController.updateContact); // Update a contact
router.delete('/:id', auth, contactsController.deleteContact); // Delete a contact

// Route for sending SOS
router.post('/send-sos', auth, contactsController.sendSOS); // Send SOS to all contacts

module.exports = router;