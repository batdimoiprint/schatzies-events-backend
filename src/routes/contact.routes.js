import express from 'express';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  addAddress,
  updateAddress,
  deleteAddress,
  addPhone,
  updatePhone,
  deletePhone,
  addLink,
  updateLink,
  deleteLink,
  addEmail,
  updateEmail,
  deleteEmail,
} from '../controllers/contact.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: Main Office
 *         description:
 *           type: string
 *         addresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContactAddress'
 *         phones:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContactPhone'
 *         links:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContactLink'
 *         emails:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContactEmail'
 *     ContactAddress:
 *       type: object
 *       required:
 *         - label
 *       properties:
 *         label:
 *           type: string
 *           example: Head Office
 *         street:
 *           type: string
 *         barangay:
 *           type: string
 *         city:
 *           type: string
 *         province:
 *           type: string
 *         country:
 *           type: string
 *         zipCode:
 *           type: string
 *     ContactPhone:
 *       type: object
 *       required:
 *         - label
 *         - number
 *       properties:
 *         label:
 *           type: string
 *           example: Main Line
 *         number:
 *           type: string
 *           example: "+63 912 345 6789"
 *         type:
 *           type: string
 *           example: mobile
 *     ContactLink:
 *       type: object
 *       required:
 *         - label
 *         - url
 *       properties:
 *         label:
 *           type: string
 *           example: Facebook
 *         url:
 *           type: string
 *           example: https://facebook.com/schatzies
 *         platform:
 *           type: string
 *           example: Facebook
 *     ContactEmail:
 *       type: object
 *       required:
 *         - label
 *         - email
 *       properties:
 *         label:
 *           type: string
 *           example: General Inquiries
 *         email:
 *           type: string
 *           example: hello@schatzies.com
 */

// ---- Contact ----

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     tags:
 *       - Contacts
 *     summary: Create a new contact
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', validateTokenMiddleware, createContact);

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     tags:
 *       - Contacts
 *     summary: List all contacts
 *     responses:
 *       200:
 *         description: List of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 */
router.get('/', getContacts);

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     tags:
 *       - Contacts
 *     summary: Get a single contact with all addresses, phones, links, and emails
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact with all sub-items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contact:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 */
router.get('/:id', getContactById);

/**
 * @swagger
 * /api/contacts/{id}:
 *   patch:
 *     tags:
 *       - Contacts
 *     summary: Update a contact
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *       404:
 *         description: Contact not found
 */
router.patch('/:id', validateTokenMiddleware, updateContact);

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     tags:
 *       - Contacts
 *     summary: Delete a contact and all its addresses, phones, links, and emails
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       404:
 *         description: Contact not found
 */
router.delete('/:id', validateTokenMiddleware, deleteContact);

// ---- Addresses ----

/**
 * @swagger
 * /api/contacts/{id}/addresses:
 *   post:
 *     tags:
 *       - Contact Addresses
 *     summary: Add an address to a contact
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactAddress'
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Contact not found
 */
router.post('/:id/addresses', validateTokenMiddleware, addAddress);

/**
 * @swagger
 * /api/contacts/{id}/addresses/{addressId}:
 *   patch:
 *     tags:
 *       - Contact Addresses
 *     summary: Update an address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: Contact or address not found
 */
router.patch('/:id/addresses/:addressId', validateTokenMiddleware, updateAddress);

/**
 * @swagger
 * /api/contacts/{id}/addresses/{addressId}:
 *   delete:
 *     tags:
 *       - Contact Addresses
 *     summary: Delete an address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: Contact or address not found
 */
router.delete('/:id/addresses/:addressId', validateTokenMiddleware, deleteAddress);

// ---- Phones ----

/**
 * @swagger
 * /api/contacts/{id}/phones:
 *   post:
 *     tags:
 *       - Contact Phones
 *     summary: Add a contact number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactPhone'
 *     responses:
 *       201:
 *         description: Phone number added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Contact not found
 */
router.post('/:id/phones', validateTokenMiddleware, addPhone);

/**
 * @swagger
 * /api/contacts/{id}/phones/{phoneId}:
 *   patch:
 *     tags:
 *       - Contact Phones
 *     summary: Update a contact number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: phoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phone number updated successfully
 *       404:
 *         description: Contact or phone not found
 */
router.patch('/:id/phones/:phoneId', validateTokenMiddleware, updatePhone);

/**
 * @swagger
 * /api/contacts/{id}/phones/{phoneId}:
 *   delete:
 *     tags:
 *       - Contact Phones
 *     summary: Delete a contact number
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: phoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phone number deleted successfully
 *       404:
 *         description: Contact or phone not found
 */
router.delete('/:id/phones/:phoneId', validateTokenMiddleware, deletePhone);

// ---- Links ----

/**
 * @swagger
 * /api/contacts/{id}/links:
 *   post:
 *     tags:
 *       - Contact Links
 *     summary: Add an access link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactLink'
 *     responses:
 *       201:
 *         description: Link added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Contact not found
 */
router.post('/:id/links', validateTokenMiddleware, addLink);

/**
 * @swagger
 * /api/contacts/{id}/links/{linkId}:
 *   patch:
 *     tags:
 *       - Contact Links
 *     summary: Update an access link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link updated successfully
 *       404:
 *         description: Contact or link not found
 */
router.patch('/:id/links/:linkId', validateTokenMiddleware, updateLink);

/**
 * @swagger
 * /api/contacts/{id}/links/{linkId}:
 *   delete:
 *     tags:
 *       - Contact Links
 *     summary: Delete an access link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link deleted successfully
 *       404:
 *         description: Contact or link not found
 */
router.delete('/:id/links/:linkId', validateTokenMiddleware, deleteLink);

// ---- Emails ----

/**
 * @swagger
 * /api/contacts/{id}/emails:
 *   post:
 *     tags:
 *       - Contact Emails
 *     summary: Add an email address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactEmail'
 *     responses:
 *       201:
 *         description: Email added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Contact not found
 */
router.post('/:id/emails', validateTokenMiddleware, addEmail);

/**
 * @swagger
 * /api/contacts/{id}/emails/{emailId}:
 *   patch:
 *     tags:
 *       - Contact Emails
 *     summary: Update an email address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       404:
 *         description: Contact or email not found
 */
router.patch('/:id/emails/:emailId', validateTokenMiddleware, updateEmail);

/**
 * @swagger
 * /api/contacts/{id}/emails/{emailId}:
 *   delete:
 *     tags:
 *       - Contact Emails
 *     summary: Delete an email address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *       - in: path
 *         name: emailId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email deleted successfully
 *       404:
 *         description: Contact or email not found
 */
router.delete('/:id/emails/:emailId', validateTokenMiddleware, deleteEmail);

export default router;
