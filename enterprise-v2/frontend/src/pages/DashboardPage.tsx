import React, { useEffect, useState } from 'react';
import { Book, Users, ArrowRightLeft, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import api from '../api/axios';

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeMembers: 0,
    booksLoaned: 0,
    overdueReturns: 0,
    recentActivity: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error("Failed to load dashboard stats", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-8">
      <div className="mb-8 anim-enter">
        <h1 className="text-3xl font-bold text-white tracking-tight">Bosh sahifa</h1>
        <p className="text-slate-400 mt-1">Kutubxona tizimining umumiy holati va so'nggi jarayonlar</p>
      </div>

      {loading ? (
         <div className="flex justify-center items-center h-32">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      ) : (
      <>
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel p-6 border-l-4 border-blue-500 anim-enter delay-100 hover:-translate-y-1 transition duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-400">Jami Kitoblar</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stats.totalBooks}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Book size={24} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp size={16} className="text-emerald-400 mr-1" />
              <span className="text-emerald-400 font-medium">Faol fond</span>
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-indigo-500 anim-enter delay-200 hover:-translate-y-1 transition duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-400">Aktiv A'zolar</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stats.activeMembers}</h3>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Users size={24} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp size={16} className="text-emerald-400 mr-1" />
              <span className="text-emerald-400 font-medium">Barcha kitobxonlar</span>
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-emerald-500 anim-enter delay-300 hover:-translate-y-1 transition duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-400">Ijaradagi Kitoblar</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stats.booksLoaned}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <ArrowRightLeft size={24} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-slate-400">Hozirda berilgan</span>
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-red-500 anim-enter delay-400 hover:-translate-y-1 transition duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-400">Kechikkanlar</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stats.overdueReturns}</h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                <AlertCircle size={24} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-red-400 font-medium">Qaytarilishi kerak</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <div className="lg:col-span-2 glass-panel p-6 anim-enter delay-500 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">So'nggi Amaliyotlar</h2>
              <button className="text-sm text-blue-400 hover:text-blue-300 font-medium transition">Barchasi</button>
            </div>
            
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {stats.recentActivity.length === 0 ? (
                 <div className="text-center text-slate-500 mt-10">Hali amaliyotlar yo'q</div>
              ) : stats.recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10 group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.action === 'Berildi' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-blue-300 transition">{activity.bookTitle}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{activity.userName} ga {activity.action.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xs font-bold px-2 py-1 rounded mb-1 ${
                      activity.action === 'Berildi' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {activity.action}
                    </span>
                    <div className="flex items-center text-xs text-slate-500">
                      <Clock size={12} className="mr-1" />
                      {new Date(activity.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banner / Promotion Component */}
          <div className="glass-panel p-1 rounded-2xl overflow-hidden relative anim-enter delay-600 h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-indigo-900/40 to-slate-900 z-0"></div>
            
            {/* The Image is fetched from our artifacts which we generated via standard prompt */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
               <img src="file:///C:/Users/User/.gemini/antigravity/brain/afa6f562-1b0b-4751-99e8-3d5c22289c77/library_dashboard_hero_1777357465890.png" alt="Library Background" className="w-full h-full object-cover" />
            </div>

            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl">
                <div className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full mb-3 shadow-lg shadow-blue-500/30">Tizim Yangilandi</div>
                <h3 className="text-xl font-bold text-white leading-tight mb-2">Haqiqiy Vaqtda Boshqaruv</h3>
                <p className="text-sm text-slate-300 mb-4">Dashborad endi barcha jarayonlarni haqiqiy raqamlar orqali ko'rsatmoqda.</p>
                <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition text-sm">
                  Batafsil o'qish
                </button>
              </div>
            </div>
          </div>

        </div>
      </>
      )}
    </div>
  );
}
