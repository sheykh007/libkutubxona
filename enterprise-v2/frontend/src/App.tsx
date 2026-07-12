import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogPage } from './pages/CatalogPage';
import { CirculationPage } from './pages/CirculationPage';
import { MembersPage } from './pages/MembersPage';
import { FinancePage } from './pages/FinancePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api from './api/axios';

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.access_token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login xatosi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url('/bg-auth.png')` }}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px]"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass-panel anim-enter border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight text-glow">LMS Enterprise</h2>
          <p className="text-slate-300 mt-2 text-sm">Axborot-kutubxona tizimiga kirish</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="anim-enter delay-100">
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email yoki ID</label>
            <input 
              type="text" 
              className="input-glass" 
              placeholder="admin@library.uz" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="anim-enter delay-200">
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Parol</label>
            <input 
              type="password" 
              className="input-glass" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`btn-primary mt-6 anim-enter delay-300 text-lg shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginScreen />
        } 
      />
      
      {isAuthenticated ? (
        <Route path="/dashboard" element={<DashboardLayout onLogout={logout} />}>
          <Route index element={<DashboardPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="circulation" element={<CirculationPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="finance" element={<FinancePage />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/" replace />} />
      )}
    </Routes>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ className: 'glass-panel text-white border-white/10 bg-[#0f172a]' }} />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
