// FILE: app/(auth)/login/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X, Zap, Shield, BarChart3 } from 'lucide-react';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidationState {
  email: {
    touched: boolean;
    valid: boolean;
    message: string;
  };
  password: {
    touched: boolean;
    valid: boolean;
    message: string;
  };
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  
  const [validation, setValidation] = useState<ValidationState>({
    email: { touched: false, valid: false, message: '' },
    password: { touched: false, valid: false, message: '' },
  });

  // Validate email on blur
  const validateEmail = useCallback((value: string) => {
    const isValid = EMAIL_REGEX.test(value);
    setValidation(prev => ({
      ...prev,
      email: {
        touched: true,
        valid: isValid,
        message: isValid ? '' : 'Enter a valid email address',
      },
    }));
    return isValid;
  }, []);

  // Validate password on blur
  const validatePassword = useCallback((value: string) => {
    const isValid = value.length >= 8;
    setValidation(prev => ({
      ...prev,
      password: {
        touched: true,
        valid: isValid,
        message: isValid ? '' : 'Password must be at least 8 characters',
      },
    }));
    return isValid;
  }, []);

  const handleEmailBlur = () => validateEmail(email);
  const handlePasswordBlur = () => validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    
    // Validate both fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      
      // Map specific error messages
      if (message.includes('429') || message.includes('Too many attempts')) {
        setServerError('Too many attempts. Please wait 15 minutes.');
      } else if (message.includes('401') || message.includes('Invalid')) {
        setServerError('Incorrect email or password');
      } else {
        setServerError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: 'Automated outreach at scale' },
    { icon: Shield, text: 'Secure session management' },
    { icon: BarChart3, text: 'Real-time analytics & insights' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Brand (60% on desktop) */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full md:w-[60%] min-h-[200px] md:min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-8 md:py-0 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0A66C2 60%, #1d4ed8 100%)',
        }}
      >
        {/* Animated gradient mesh overlay */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(10,102,194,0.3) 0%, transparent 70%)
              `,
            }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#0A66C2] text-xl font-bold">
              in
            </div>
            <span className="text-white/60 text-sm font-medium">Integration</span>
          </motion.div>
          
          {/* Product Name */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}
          >
            Hyper-V
          </motion.h1>
          
          {/* Tagline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg md:text-xl text-white/80 mb-8 max-w-md"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            LinkedIn Automation at Scale
          </motion.p>
          
          {/* Feature bullets */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-4 hidden md:block"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 text-white/70"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon size={16} className="text-white" />
                </div>
                <span style={{ fontFamily: 'DM Sans, sans-serif' }}>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form (40% on desktop) */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="w-full md:w-[40%] min-h-[calc(100vh-200px)] md:min-h-screen flex items-center justify-center px-6 md:px-12 py-8 md:py-0 bg-gray-50"
      >
        <div className="w-full max-w-md">
          {/* Mobile header - only visible on small screens */}
          <div className="md:hidden mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
              Hyper-V
            </h2>
            <p className="text-gray-500 text-sm mt-1">LinkedIn Automation at Scale</p>
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 
              className="text-2xl font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to your dashboard
            </p>
            
            {/* Server Error Banner */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div 
                    role="alert"
                    aria-live="polite"
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                  >
                    {serverError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <label 
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    className="w-full px-4 py-2.5 rounded-lg border transition-all duration-200 focus:outline-none"
                    style={{
                      borderColor: validation.email.touched && !validation.email.valid 
                        ? '#ef4444' 
                        : validation.email.valid 
                          ? '#22c55e' 
                          : '#e5e7eb',
                      outline: 'none',
                    }}
                    placeholder="you@company.com"
                    disabled={isLoading}
                    autoFocus
                  />
                  {/* Validation indicator */}
                  {validation.email.touched && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validation.email.valid ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <X size={18} className="text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {validation.email.touched && !validation.email.valid && (
                  <p className="text-xs text-red-500 mt-1">{validation.email.message}</p>
                )}
              </motion.div>
              
              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <label 
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={handlePasswordBlur}
                    className="w-full px-4 py-2.5 pr-20 rounded-lg border transition-all duration-200 focus:outline-none"
                    style={{
                      borderColor: validation.password.touched && !validation.password.valid 
                        ? '#ef4444' 
                        : validation.password.valid 
                          ? '#22c55e' 
                          : '#e5e7eb',
                      outline: 'none',
                    }}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Validation indicator */}
                    {validation.password.touched && (
                      validation.password.valid ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <X size={18} className="text-red-500" />
                      )
                    )}
                    {/* Show/hide toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {validation.password.touched && !validation.password.valid && (
                  <p className="text-xs text-red-500 mt-1">{validation.password.message}</p>
                )}
              </motion.div>
              
              {/* Remember Me */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="flex items-center"
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#0A66C2] focus:ring-[#0A66C2]"
                  disabled={isLoading}
                />
                <label 
                  htmlFor="remember-me"
                  className="ml-2 text-sm text-gray-600"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Remember me
                </label>
              </motion.div>
              
              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ 
                  background: '#0A66C2',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>
            
            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="text-center text-xs text-gray-400 mt-6"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Protected by industry-standard encryption
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
