import {
  getClientIp,
  getClientPublicIp,
  getClientUserAgent,
  getClientDeviceId,
} from '../utils/requestClient.js';

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const requestIp = getClientIp(req);
  const requestUserAgent = getClientUserAgent(req);
  const requestPublicIp = getClientPublicIp(req);
  const requestDeviceId = getClientDeviceId(req);

  if (!req.user.adminIp || !req.user.adminUa || !req.user.adminPublicIp) {
    return res.status(401).json({ message: 'Admin token is missing client binding' });
  }

  const tokenHasDeviceId = typeof req.user.adminDeviceId === 'string' && req.user.adminDeviceId.length > 0;
  const hasDeviceIdMatch = tokenHasDeviceId && requestDeviceId && req.user.adminDeviceId === requestDeviceId;

  if (
    req.user.adminUa !== requestUserAgent
    || (!hasDeviceIdMatch && (req.user.adminIp !== requestIp && req.user.adminPublicIp !== requestPublicIp))
  ) {
    return res.status(403).json({ message: 'Admin access denied for this IP/device' });
  }

  next();
};
