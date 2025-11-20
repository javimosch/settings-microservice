const AuditEvent = require('../models/AuditEvent');
const logger = require('../utils/logger');

exports.listAuditEvents = async (req, res) => {
  try {
    const { entityType, action, user, organizationId, page = 1, limit = 50 } = req.query;

    const query = {};

    if (entityType) query.entityType = entityType;
    if (action) query.action = action;
    if (user) query.performedBy = user;
    if (organizationId) query.organizationId = organizationId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      AuditEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditEvent.countDocuments(query)
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    logger.error('Error listing audit events:', error);
    res.status(500).json({ error: 'Failed to list audit events' });
  }
};
