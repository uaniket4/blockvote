export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const trustProxy = Boolean(req.app?.get('trust proxy'));

  if (trustProxy && typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

export const getClientUserAgent = (req) => {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value.trim() : '';
};

export const getClientPublicIp = (req) => {
  const value = req.headers['x-client-public-ip'];
  return typeof value === 'string' ? value.trim() : '';
};
