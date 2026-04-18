import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [faceImage, setFaceImage] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const stopCamera = () => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Realtime camera is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (_err) {
      setCameraError('Unable to access camera. Allow camera permission and try again.');
    }
  };

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet.');
      return;
    }

    const maxWidth = 480;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;

    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Failed to capture camera frame.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.75);
    if (!imageData) {
      setCameraError('Failed to capture face image.');
      setFaceImage('');
      return;
    }

    setFaceImage(imageData);
    setCameraError('');
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      if (!normalizedEmail) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      if (!faceImage) {
        setError('Capture your face from the live camera before registering.');
        setLoading(false);
        return;
      }

      const imagePayload = faceImage.split(',')[1] || '';
      if (imagePayload.length < 12000) {
        setError('Captured frame is too small. Move closer, keep one face visible, and capture again.');
        setLoading(false);
        return;
      }

      await api.post('/auth/register', {
        ...form,
        email: normalizedEmail,
        faceImage,
      });

      setMessage('Registration completed with face biometric enrollment. You can login now.');
      setTimeout(() => navigate('/login'), 700);
    } catch (err) {
      setError(
        err.response?.data?.message
        || err.response?.data?.error
        || err.message
        || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-grid bg-[length:18px_18px] opacity-40" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <section className="panel animate-fade-up p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">New voter setup</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-slate-950">Create your account</h2>
          <p className="mt-2 text-sm text-slate-500">Capture a live face image to create your biometric identity for future login verification.</p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Full name</label>
              <input id="fullName" className="input" name="fullName" type="text" placeholder="Your full name" onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</label>
              <input id="email" className="input" name="email" type="email" placeholder="you@organization.com" onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</label>
              <input id="password" className="input" name="password" type="password" placeholder="Set a strong password" onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="faceImage" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live Biometric Capture</label>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <video ref={videoRef} className="h-52 w-full object-cover" muted playsInline autoPlay />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-2 flex gap-2">
                <button className="btn-secondary" type="button" onClick={startCamera}>Restart Camera</button>
                <button className="btn-primary" type="button" onClick={captureFace}>Capture Face</button>
              </div>
              {faceImage ? <p className="mt-1 text-xs text-emerald-700">Face captured successfully.</p> : null}
              {cameraError ? <p className="mt-1 text-xs text-rose-600">{cameraError}</p> : null}
              <p className="mt-1 text-xs text-slate-500">Live camera capture only. Photo uploads are not allowed.</p>
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p>}
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Creating account with biometric capture...' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Already registered?{' '}
            <Link className="font-semibold text-brand-700 hover:text-brand-900" to="/login">
              Go to login
            </Link>
          </p>
        </section>

        <section className="panel hidden animate-fade-up border-none bg-gradient-to-br from-brand-900 via-slate-900 to-cyan-900 p-8 text-slate-100 lg:block">
          <h1 className="font-display text-4xl font-semibold leading-tight">Professional voting operations for modern organizations.</h1>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            <li className="rounded-xl border border-cyan-100/20 bg-white/5 p-4">Role-based dashboards for voters and administrators.</li>
            <li className="rounded-xl border border-cyan-100/20 bg-white/5 p-4">On-chain recording for transparent and auditable final counts.</li>
            <li className="rounded-xl border border-cyan-100/20 bg-white/5 p-4">Live election status across setup, active, and closed phases.</li>
          </ul>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
