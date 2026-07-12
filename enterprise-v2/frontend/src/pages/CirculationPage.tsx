import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Search, CheckCircle, AlertCircle, Scan, User, Book } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export function CirculationPage() {
  const [activeTab, setActiveTab] = useState<'issue' | 'return'>('issue');
  const [barcode, setBarcode] = useState('');
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [memberPreview, setMemberPreview] = useState<any>(null);
  const [bookPreview, setBookPreview] = useState<any>(null);

  // Live preview for member
  useEffect(() => {
    if (memberId.length >= 4) {
      const delay = setTimeout(() => {
        api.get(`/users/members/${memberId}`)
          .then(res => setMemberPreview(res.data))
          .catch(() => setMemberPreview(null));
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setMemberPreview(null);
    }
  }, [memberId]);

  // Live preview for book
  useEffect(() => {
    if (barcode.length >= 4) {
      const delay = setTimeout(() => {
        api.get(`/books/copy/${barcode}`)
          .then(res => setBookPreview(res.data))
          .catch(() => setBookPreview(null));
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setBookPreview(null);
    }
  }, [barcode]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) {
      toast.error("Kitob shtrix kodini kiriting!");
      return;
    }
    
    setLoading(true);
    try {
      if (activeTab === 'issue') {
        if (!memberId) {
          toast.error("Kitobxon ID sini kiriting!");
          setLoading(false);
          return;
        }
        if (memberPreview && memberPreview.fines?.length > 0) {
          toast.error("Kitobxonda to'lanmagan jarima bor! Berish taqiqlanadi.");
          setLoading(false);
          return;
        }

        const res = await api.post('/circulation/issue', {
          siglaNumber: memberId,
          barcode: barcode
        });
        toast.success("Kitob muvaffaqiyatli berildi!");
        setHistory([{ type: 'ISSUE', data: res.data }, ...history]);
      } else {
        const res = await api.post('/circulation/return', {
          barcode: barcode
        });
        if (res.data.fineCreated) {
           toast.error(`Kitob kechikib qaytarildi. Jarima: ${res.data.fineAmount} so'm`, { duration: 5000 });
        } else {
           toast.success("Kitob muvaffaqiyatli qabul qilindi!");
        }
        setHistory([{ type: 'RETURN', data: res.data }, ...history]);
      }
      setBarcode('');
      if (activeTab === 'issue') setMemberId('');
      setMemberPreview(null);
      setBookPreview(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-8 anim-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Cirkulyatsiya</h1>
        <p className="text-slate-400 mt-1">Kitob berish (Issue) va qaytarish (Return) amaliyotlari</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actions Panel */}
        <div className="glass-panel p-6">
          <div className="flex bg-white/5 p-1 rounded-xl mb-8">
            <button 
              type="button"
              onClick={() => setActiveTab('issue')}
              className={`flex-1 py-2 text-center rounded-lg font-medium transition-all ${activeTab === 'issue' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Kitob Berish
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('return')}
              className={`flex-1 py-2 text-center rounded-lg font-medium transition-all ${activeTab === 'return' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Kitob Qaytarish
            </button>
          </div>

          <form onSubmit={handleAction} className="space-y-6">
            {activeTab === 'issue' && (
              <div className="anim-enter">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">A'zo ID si (Shtrix)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="input-glass pl-10" 
                      placeholder="M_0001" 
                    />
                  </div>
                </div>
                {memberPreview && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${memberPreview.fines?.length > 0 ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-white/5 border-white/10 text-white'}`}>
                    <User size={20} className={memberPreview.fines?.length > 0 ? 'text-red-400' : 'text-blue-400'} />
                    <div>
                      <p className="font-bold text-sm">{memberPreview.lastName} {memberPreview.firstName}</p>
                      {memberPreview.fines?.length > 0 && (
                        <p className="text-xs text-red-400 font-bold mt-0.5">⚠️ Diqqat: To'lanmagan jarima bor!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="anim-enter delay-100">
              <label className="block text-sm font-medium text-slate-300 mb-2">Kitob Shtrix kodi (Barcode)</label>
              <div className="relative flex gap-3 mb-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="input-glass pl-10 font-mono text-lg" 
                    placeholder="B_123456" 
                    autoFocus
                  />
                </div>
              </div>
              {bookPreview && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 text-white">
                    <Book size={20} className="text-blue-400" />
                    <div>
                      <p className="font-bold text-sm">{bookPreview.book.title}</p>
                      <p className="text-xs text-slate-400">Holati: {bookPreview.status === 'AVAILABLE' ? <span className="text-emerald-400">Ochiq</span> : <span className="text-red-400">Band ({bookPreview.status})</span>}</p>
                    </div>
                  </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || (activeTab === 'issue' && memberPreview?.fines?.length > 0)}
              className={`w-full py-3 rounded-xl text-white font-bold text-lg transition shadow-lg ${activeTab === 'issue' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30'} ${(loading || (activeTab === 'issue' && memberPreview?.fines?.length > 0)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Kutib turing...' : activeTab === 'issue' ? 'Kitobni Berish' : 'Kitobni Qabul Qilish'}
            </button>
          </form>
        </div>

        {/* Scan Results / History Panel */}
        <div className="glass-panel p-6 bg-slate-900/50 flex flex-col h-full max-h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Amaliyotlar Tarixi</h3>
            <ArrowRightLeft className="text-slate-500" size={24} />
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
             {history.length === 0 ? (
               <div className="text-center text-slate-500 mt-10">Hali hech qanday tranzaksiya bajarilmadi.</div>
             ) : history.map((item, i) => (
               <div key={i} className={`p-4 rounded-xl border flex items-start gap-4 ${item.type === 'RETURN' ? (item.data.fineCreated ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5') : 'border-blue-500/20 bg-blue-500/5'}`}>
                 {item.type === 'RETURN' ? (
                   item.data.fineCreated ? <AlertCircle className="text-red-500 mt-1 shrink-0" size={24} /> : <CheckCircle className="text-emerald-500 mt-1 shrink-0" size={24} />
                 ) : (
                   <ArrowRightLeft className="text-blue-500 mt-1 shrink-0" size={24} />
                 )}
                 
                 <div>
                   <h4 className={`font-bold ${item.type === 'RETURN' ? (item.data.fineCreated ? 'text-red-400' : 'text-emerald-400') : 'text-blue-400'}`}>
                     {item.type === 'RETURN' ? (item.data.fineCreated ? 'Xatolik: Muddati O\'tgan Jarima' : 'Muvaffaqiyatli Qaytarildi') : 'Muvaffaqiyatli Berildi'}
                   </h4>
                   <p className="text-white font-medium mt-1">{item.data.bookCopy?.book?.title}</p>
                   <p className="text-slate-400 text-sm mt-1">Shtrix: {item.data.bookCopy?.barcode} • Kitobxon: {item.data.user?.firstName} {item.data.user?.lastName}</p>
                   
                   {item.data.fineCreated && (
                     <button className="mt-2 text-sm bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30 transition">
                       {item.data.fineAmount} so'm Jarimani to'lash
                     </button>
                   )}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
