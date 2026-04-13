import { getClientIp, getClientPublicIp, getClientUserAgent } from '../utils/requestClient.js';

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const requestIp = getClientIp(req);
  const requestUserAgent = getClientUserAgent(req);
  const requestPublicIp = getClientPublicIp(req);

  if (!req.user.adminIp || !req.user.adminUa || !req.user.adminPublicIp) {
    return res.status(401).json({ message: 'Admin token is missing client binding' });
  }

  if (
    req.user.adminUa !== requestUserAgent
    || (req.user.adminIp !== requestIp && req.user.adminPublicIp !== requestPublicIp)
  ) {
    return res.status(403).json({ message: 'Admin access denied for this IP/device' });
  }

  next();
};
