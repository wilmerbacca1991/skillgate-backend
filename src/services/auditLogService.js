const AuditLog = require('../models/AuditLog');

const writeAuditLog = async ({ req, action, resourceType, resourceId = '', details = {} }) => {
  try {
    await AuditLog.create({
      actor: req?.user?._id,
      actorRole: req?.user?.role || '',
      action,
      resourceType,
      resourceId: String(resourceId || ''),
      details,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || ''
    });
  } catch {
    // Do not block user flows when audit logging fails.
  }
};

module.exports = {
  writeAuditLog
};
