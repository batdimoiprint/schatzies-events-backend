import Joi from 'joi';

/**
 * Validates the request body for sending a message.
 */
const sendMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Message body cannot be empty',
    'string.max': 'Message body cannot exceed 5000 characters',
    'any.required': 'Message body is required',
  }),
});

export function validateSendMessage(req, res, next) {
  const { error } = sendMessageSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  return next();
}

/**
 * Validates the conversationId path parameter.
 */
const conversationIdSchema = Joi.object({
  conversationId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid conversation ID format',
    'any.required': 'Conversation ID is required',
  }),
});

export function validateConversationId(req, res, next) {
  const { error } = conversationIdSchema.validate(
    { conversationId: req.params.conversationId },
    { abortEarly: false }
  );
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  return next();
}
