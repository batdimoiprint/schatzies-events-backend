import express from 'express';
import { nowPH } from '../utils/timezone.js';
import authRoutes from './auth.routes.js';
import eventRoutes from './event.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import calendarRoutes from './calendar.routes.js';
import vendorRoutes from './vendor.routes.js';
import attendeeRoutes from './attendee.routes.js';
import organizerRoutes from './organizer.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import rsvpRoutes from './rsvp.routes.js';
import usersRoutes from './users.routes.js';
import scannerRoutes from './scanner.routes.js';
import messageRoutes from './message.routes.js';
import emailVerificationRoutes from './emailVerification.routes.js';
import pushRoutes from './push.routes.js';
import backupRoutes from './backup.routes.js';
import packageRoutes from './package.routes.js';
import contactRoutes from './contact.routes.js';
import contentRoutes from './content.routes.js';

import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import { authLimiter } from '../configs/rate-limit.js';

const router = express.Router();

// Example route
router.get('/health', (req, res) => {
  res.json({ message: 'API is healthy', timestamp: nowPH() });
});

//Public routes
router.use('/inquiries', inquiryRoutes);
router.use('/rsvp', rsvpRoutes);
// Protected routes
router.use('/events', validateTokenMiddleware, eventRoutes);
router.use('/dashboard', validateTokenMiddleware, dashboardRoutes);
router.use('/calendar', validateTokenMiddleware, calendarRoutes);
router.use('/vendors', validateTokenMiddleware, vendorRoutes);
router.use('/attendees', validateTokenMiddleware, attendeeRoutes);
router.use('/organizers', validateTokenMiddleware, organizerRoutes);
router.use('/scanner', validateTokenMiddleware, scannerRoutes);
router.use('/users', validateTokenMiddleware, usersRoutes);
router.use('/messages', messageRoutes);
router.use('/push', pushRoutes);
router.use('/backups', validateTokenMiddleware, backupRoutes);
router.use('/packages', packageRoutes);
router.use('/contacts', contactRoutes);
router.use('/contents', contentRoutes);

router.use('/auth', authLimiter, authRoutes);
router.use('/auth', emailVerificationRoutes);

export default router;
