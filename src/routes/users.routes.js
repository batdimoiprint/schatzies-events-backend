import express from 'express';
import {
  getUsers,
  getUserById,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from '../controllers/users.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */
router.get('/', getUsers);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               birthDate:
 *                 type: string
 *               houseNumber:
 *                 type: string
 *               street:
 *                 type: string
 *               barangay:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               gender:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 default: CLIENT
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', createUserHandler);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               birthDate:
 *                 type: string
 *               houseNumber:
 *                 type: string
 *               street:
 *                 type: string
 *               barangay:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               gender:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               role:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:userId', updateUserHandler);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId', deleteUserHandler);

export default router;
