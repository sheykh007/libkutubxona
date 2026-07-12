import React, { useEffect, useState } from 'react';
import { DollarSign, Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export function FinancePage() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFines = () => {
    setLoading(true);
    api.get('/finance/fines')
      .then(res => setFines(res.data))
      .catch(err => {
        console.error("Failed to load fines:", err);
        toast.error("Jarimalarni yuklashda xato");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const handlePay = async (id: string) => {
    try {
      await api.post(`/finance/pay/${id}`);
      toast.success("To'lov muvaffaqiyatli qabul qilindi!");
      fetchFines();
    } catch (err) {
      toast.error("To'lovda xatolik yuz berdi");
    }
  };

  const totalUnpaid = fines.filter(f => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fines.filter(f => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="pb-8 anim-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Moliya va Jarimalar</h1>
        <p className="text-slate-400 mt-1">Kechikkan kitoblar uchun jarimalar va to'lovlar tarixi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-400">To'lanmagan Jarimalar</p>
              <h3 className="text-3xl font-bold text-white mt-1">{totalUnpaid.toLocaleString()} <span className="text-lg text-slate-500">UZS</span></h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="flex items-center text-sm">
             <span className="text-red-400 font-medium">Jami {fines.filter(f => f.status === 'UNPAID').length} ta qarzdorlik</span>
          </div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-400">Undirilgan Jarimalar</p>
              <h3 className="text-3xl font-bold text-white mt-1">{totalPaid.toLocaleString()} <span className="text-lg text-slate-500">UZS</span></h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="flex items-center text-sm">
             <span className="text-emerald-400 font-medium">Kassa daromadi</span>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Kitobxon yoki ID bo'yicha qidiruv..." 
            className="input-glass pl-10 w-full"
          />
        </div>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition flex items-center gap-2">
          <Filter size={20} />
          Filtr
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-slate-300 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Tranzaksiya ID</th>
                <th className="p-4 font-medium">Kitobxon</th>
                <th className="p-4 font-medium">Sabab (Kitob)</th>
                <th className="p-4 font-medium">Summa</th>
                <th className="p-4 font-medium">Sana</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Yuklanmoqda...</td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Hozircha jarimalar yo'q</td>
                </tr>
              ) : fines.map((f, i) => (
                <tr key={f.id} className="hover:bg-white/5 transition duration-200">
                  <td className="p-4 text-slate-400 font-mono text-sm">{f.id.substring(0,8)}</td>
                  <td className="p-4 text-white font-medium">
                    {f.user?.lastName} {f.user?.firstName}
                    <div className="text-xs text-blue-400">{f.user?.siglaNumber}</div>
                  </td>
                  <td className="p-4 text-slate-300">
                    <div>{f.reason}</div>
                    <div className="text-xs text-slate-500">Kitob: {f.loan?.bookCopy?.book?.title}</div>
                  </td>
                  <td className="p-4 text-white font-bold">{f.amount.toLocaleString()} UZS</td>
                  <td className="p-4 text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${f.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {f.status === 'PAID' ? 'To\'landi' : 'To\'lanmagan'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {f.status === 'UNPAID' ? (
                      <button 
                        onClick={() => handlePay(f.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-lg"
                      >
                        Qabul Qilish
                      </button>
                    ) : (
                      <CheckCircle className="text-emerald-500 inline-block" size={20} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
