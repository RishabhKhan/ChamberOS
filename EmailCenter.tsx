import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, googleProvider, signInWithPopup } from './ecourtApiService';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1f3d 100%)' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm w-full relative z-10"
      >
        {/* Card */}
        <div className="rounded-[32px] p-10 text-center"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.16,1,0.3,1] }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(180,83,9,0.3) 0%, rgba(180,83,9,0.1) 100%)',
                  border: '1px solid rgba(180,83,9,0.4)',
                  boxShadow: '0 8px 32px rgba(180,83,9,0.2)'
                }}>
                <Scale className="w-9 h-9 text-legal-gold" />
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
                style={{ background: 'rgba(180,83,9,0.3)', animationDuration: '3s' }} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <h1 className="font-serif text-4xl font-bold text-white mb-2 tracking-tight">
              Achilles
            </h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
              Chamber OS
            </p>
            <p className="text-sm text-white/50 font-medium mt-4 mb-10 leading-relaxed">
              The professional operating system<br/>for modern legal chambers.
            </p>
          </motion.div>

          {/* Sign in button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(255,255,255,0.7)' : 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                    referrerPolicy="no-referrer"
                  />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-xs text-rose-400 font-medium"
              >
                {error}
              </motion.p>
            )}
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]"
          >
            Secure · Private · Professional
          </motion.p>
        </div>
      </motion.div>

      {/* Bottom version */}
      <div className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-[10px] text-white/15 font-medium uppercase tracking-[0.2em]">
          Achilles Chamber OS • v1.0.0
        </p>
      </div>
    </div>
  );
}
