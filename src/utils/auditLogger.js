const AuditEvent = require('../models/AuditEvent');
const logger = require('./logger');

async function logEvent({ req, organizationId, entityType, entityId, action, before, after, meta }) {
  try {
    let performedBy = req.session?.username || req.user?.username || null;
    let performedById = req.session?.userId || null;

    // If no session user, try to derive identity from Dynamic Auth subject (external API calls)
    if (!performedBy && req.authResult?.subject) {
      const subject = req.authResult.subject;
      if (typeof subject === 'string') {
        performedBy = subject;
      } else if (typeof subject === 'object' && subject !== null) {
        performedBy = subject.username || subject.user || subject.id || JSON.stringify(subject);
      }
    }

    if (!performedBy) {
      performedBy = 'system';
    }

    const event = new AuditEvent({
      organizationId,
      entityType,
      entityId,
      action,
      performedBy,
      performedById,
      before,
      after,
      meta
    });

    await event.save();
  } catch (error) {
    logger.error('Error saving audit event:', error);
  }
}

module.exports = { logEvent };
