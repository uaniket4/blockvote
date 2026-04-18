const normalizeIp = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  // Express can return IPv4 as ::ffff:127.0.0.1 when behind certain proxies.
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  if (trimmed === '::1') {
    return '127.0.0.1';
  }

  return trimmed;
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const trustProxy = Boolean(req.app?.get('trust proxy'));

  if (trustProxy && typeof forwarded === 'string' && forwarded.length > 0) {
    return normalizeIp(forwarded.split(',')[0]);
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
};

export const getClientUserAgent = (req) => {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value.trim() : '';
};

export const getClientPublicIp = (req) => {
  const value = req.headers['x-client-public-ip'];
  return normalizeIp(typeof value === 'string' ? value : '');
};

export const getClientDeviceId = (req) => {
  const value = req.headers['x-client-device-id'];
  return typeof value === 'string' ? value.trim() : '';
};
