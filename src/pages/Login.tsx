import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center items-center p-4 font-sans text-white selection:bg-white/20 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(167,139,250,0.3)]">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-xl font-display font-medium text-white tracking-tight">Aurora</span>
        </div>
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-3xl font-display font-medium tracking-tight mb-2"
          >
            Welcome back
          </motion.h1>
          <p className="text-[#888888] text-sm">Sign in to your Aurora workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[#888888] font-medium ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#111111] border border-[#222222] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#444444] focus:bg-[#151515] transition-all duration-200"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-[#888888] font-medium ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111111] border border-[#222222] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#444444] focus:bg-[#151515] transition-all duration-200"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-red-400 text-xs px-2 py-1"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 0.99 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-medium rounded-2xl px-4 py-3.5 text-sm mt-4 hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-sm text-[#666666]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white hover:text-neutral-300 transition-colors">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
