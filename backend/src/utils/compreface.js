const getConfig = () => {
  const baseUrl = (process.env.COMPRE_FACE_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
  const apiKey = process.env.COMPRE_FACE_API_KEY;
  const threshold = Number(process.env.COMPRE_FACE_SIMILARITY_THRESHOLD || 0.8);

  if (!apiKey) {
    throw new Error('CompreFace is not configured. Set COMPRE_FACE_API_KEY.');
  }

  return { baseUrl, apiKey, threshold };
};

const toImageBuffer = (input) => {
  if (!input || typeof input !== 'string') {
    throw new Error('faceImage is required');
  }

  const base64 = input.startsWith('data:') ? input.split(',')[1] : input;
  const buffer = Buffer.from(base64, 'base64');

  // Tiny payloads are usually invalid camera frames or malformed base64.
  if (buffer.length < 10_000) {
    throw new Error('Captured image is too small. Capture a clear face frame from live camera.');
  }

  return buffer;
};

const recognize = async (faceImage) => {
  const { baseUrl, apiKey } = getConfig();
  const imageBuffer = toImageBuffer(faceImage);

  const form = new FormData();
  form.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'face.jpg');
  form.append('limit', '3');

  const response = await fetch(`${baseUrl}/api/v1/recognition/recognize`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CompreFace recognize failed (${response.status}): ${text}`);
  }

  return response.json();
};

export const ensureRecognizerReady = async () => {
  // Config validation is enough here; CompreFace resources are created lazily.
  getConfig();
};

export const findBestMatch = async (faceImage) => {
  const result = await recognize(faceImage);
  const first = Array.isArray(result?.result) ? result.result[0] : null;
  const bestSubject = Array.isArray(first?.subjects) ? first.subjects[0] : null;

  if (!bestSubject?.subject) {
    return null;
  }

  return {
    subject: bestSubject.subject,
    similarity: Number(bestSubject.similarity || 0),
  };
};

export const enrollSubjectFace = async (subject, faceImage) => {
  const { baseUrl, apiKey } = getConfig();
  const imageBuffer = toImageBuffer(faceImage);

  const form = new FormData();
  form.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'face.jpg');
  form.append('subject', subject);

  const response = await fetch(`${baseUrl}/api/v1/recognition/faces`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CompreFace enroll failed (${response.status}): ${text}`);
  }
};

export const isFaceMatchForSubject = async (faceImage, expectedSubject) => {
  const { threshold } = getConfig();
  const best = await findBestMatch(faceImage);

  if (!best) {
    return false;
  }

  return best.subject === expectedSubject && best.similarity >= threshold;
};

export const getSimilarityThreshold = () => getConfig().threshold;
