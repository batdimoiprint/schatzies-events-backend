import express from 'express';
import authRoutes from './auth.routes.js';
import eventRoutes from './event.routes.js';
import vendorRoutes from './vendor.routes.js';
import attendeeRoutes from './attendee.routes.js';
import organizerRoutes from './organizer.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import workerRsvpRoutes from './worker-rsvp.routes.js';
import usersRoutes from './users.routes.js';

import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import { authLimiter } from '../configs/rate-limit.js';

const router = express.Router();

// Example route
router.get('/health', (req, res) => {
  res.json({ message: 'API is healthy', timestamp: new Date().toISOString() });
});

//Public routes
router.use('/inquiries', inquiryRoutes);router.use('/rsvp', workerRsvpRoutes);
// Protected routes
router.use('/events', validateTokenMiddleware, eventRoutes);
router.use('/vendors', validateTokenMiddleware, vendorRoutes);
router.use('/attendees', validateTokenMiddleware, attendeeRoutes);
router.use('/organizers', validateTokenMiddleware, organizerRoutes);
router.use('/users', validateTokenMiddleware, usersRoutes);

router.use('/auth', authLimiter, authRoutes);

export default router;
