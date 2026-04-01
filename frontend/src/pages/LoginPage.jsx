import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const fetchPublicIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    if (data?.ip) {
      return String(data.ip).trim();
    }

    return '';
  } catch (_error) {
    return '';
  }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('voter');
  const [form, setForm] = useState({ email: '', password: '' });
  const [faceImage, setFaceImage] = useState('');
  const [cameraError, setCameraError] = useState('');
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
    if (mode !== 'voter') {
      return;
    }

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Failed to capture camera frame.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    if (!imageData) {
      setCameraError('Failed to capture face image.');
      setFaceImage('');
      return;
    }

    setFaceImage(imageData);
    setCameraError('');
  };

  useEffect(() => {
    if (mode === 'voter') {
      startCamera();
    } else {
      stopCamera();
      setFaceImage('');
      setCameraError('');
    }

    return () => {
      stopCamera();
    };
  }, [mode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const publicIp = await fetchPublicIp();

      if (publicIp) {
        localStorage.setItem('clientPublicIp', publicIp);
      } else {
        localStorage.removeItem('clientPublicIp');
      }

      let data;

      if (mode === 'admin') {
        const response = await api.post('/auth/login', form, {
          headers: {
            ...(publicIp ? { 'x-client-public-ip': publicIp } : {}),
          },
        });
        data = response.data;
      } else {
        if (!faceImage) {
          throw new Error('Capture your face from live camera before login');
        }

        const imagePayload = faceImage.split(',')[1] || '';
        if (imagePayload.length < 12000) {
          throw new Error('Captured frame is too small. Move closer, keep one face visible, and capture again.');
        }

        const response = await api.post('/auth/login/biometric-face', {
          email: form.email,
          faceImage,
        });
        data = response.data;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-grid bg-[length:18px_18px] opacity-40" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <section className="panel hidden animate-fade-up border-none bg-slate-950 p-8 text-slate-100 lg:block">
          <p className="inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Decentralized Governance
          </p>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight">
            Secure elections,
            <br />
            transparent outcomes.
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            BlockVote gives organizations a dependable voting workflow with verifiable blockchain records and clear operational control.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="text-slate-400">Verification</p>
              <p className="mt-1 text-lg font-semibold text-white">100% on-chain</p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="text-slate-400">Fraud resistance</p>
              <p className="mt-1 text-lg font-semibold text-white">Single-wallet vote</p>
            </div>
          </div>
        </section>

        <section className="panel animate-fade-up p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Welcome back</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-slate-950">Sign in to BlockVote</h2>
          <p className="mt-2 text-sm text-slate-500">Voters sign in with live face biometric verification. Admin uses email/password.</p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'voter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setMode('voter')}
            >
              Voter Login
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setMode('admin')}
            >
              Admin Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</label>
              <input id="email" className="input" name="email" type="email" placeholder="you@organization.com" onChange={handleChange} required />
            </div>
            {mode === 'voter' ? (
              <div>
                <label htmlFor="faceImage" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live Biometric Capture</label>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline autoPlay />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="mt-2 flex gap-2">
                  <button className="btn-secondary" type="button" onClick={startCamera}>Restart Camera</button>
                  <button className="btn-primary" type="button" onClick={captureFace}>Capture Face</button>
                </div>
                {faceImage ? <p className="mt-1 text-xs text-emerald-700">Face captured successfully.</p> : null}
                {cameraError ? <p className="mt-1 text-xs text-rose-600">{cameraError}</p> : null}
              </div>
            ) : null}
            {mode === 'admin' ? (
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</label>
                <input id="password" className="input" name="password" type="password" placeholder="Enter password" onChange={handleChange} required />
              </div>
            ) : null}
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : mode === 'voter' ? 'Login with Biometrics' : 'Login'}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            No account?{' '}
            <Link className="font-semibold text-brand-700 hover:text-brand-900" to="/register">
              Register as voter
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
