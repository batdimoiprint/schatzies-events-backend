import express from 'express';
import { getPageContents, updateSectionContent } from '../controllers/content.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to fetch contents for website visitors
router.get('/:pageId', getPageContents);

// Protected route to update contents for admin only
router.put('/:pageId/:sectionId', validateTokenMiddleware, updateSectionContent);

export default router;
