import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Filter, Search, MoreVertical, X } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

interface MemberItem {
  id: string;
  siglaNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  memberType: string;
  status: string;
  createdAt: string;
}

export function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', phone: '', memberType: 'STUDENT' });

  const fetchMembers = () => {
    setLoading(true);
    api.get('/users/members')
      .then(res => setMembers(res.data))
      .catch(err => {
        console.error("Failed to fetch members:", err);
        toast.error("A'zolarni yuklashda xatolik");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/members', newMember);
      toast.success("Yangi kitobxon muvaffaqiyatli qo'shildi!");
      setIsModalOpen(false);
      setNewMember({ firstName: '', lastName: '', phone: '', memberType: 'STUDENT' });
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Kitobxon qo'shishda xatolik yuz berdi");
    }
  };

  return (
    <div className="pb-8 anim-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">A'zolar</h1>
          <p className="text-slate-400 mt-1">Kutubxona foydalanuvchilari va kitobxonlar boshqaruvi</p>
        </div>
        
        <button 
          className="btn-primary flex items-center gap-2 w-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus size={20} />
          A'zo Qo'shish
        </button>
      </div>

      <div className="glass-panel p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="A'zo F.I.O yoki ID bo'yicha qidiruv..." 
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
                <th className="p-4 font-medium">Shtrix (ID)</th>
                <th className="p-4 font-medium">F.I.O</th>
                <th className="p-4 font-medium">Turi</th>
                <th className="p-4 font-medium">A'zo bo'lgan sana</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Harakat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Yuklanmoqda...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Hozircha a'zolar yo'q.</td>
                </tr>
              ) : members.map((m, i) => (
                <tr key={m.id} className={`hover:bg-white/5 transition duration-200 anim-enter delay-${(i % 5)*100}`}>
                  <td className="p-4 text-blue-400 font-mono">{m.siglaNumber}</td>
                  <td className="p-4 text-white font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600 uppercase">
                        {m.firstName.charAt(0)}
                      </div>
                      {m.lastName} {m.firstName}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{m.memberType}</td>
                  <td className="p-4 text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${m.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {m.status === 'ACTIVE' ? 'Faol' : m.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 anim-enter border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Yangi A'zo Qo'shish</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ism *</label>
                  <input 
                    type="text" 
                    className="input-glass" 
                    value={newMember.firstName}
                    onChange={e => setNewMember({...newMember, firstName: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Familiya *</label>
                  <input 
                    type="text" 
                    className="input-glass" 
                    value={newMember.lastName}
                    onChange={e => setNewMember({...newMember, lastName: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Telefon Raqam *</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  placeholder="+998901234567"
                  value={newMember.phone}
                  onChange={e => setNewMember({...newMember, phone: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">A'zolik Turi</label>
                <select 
                  className="input-glass text-white bg-[#0f172a] appearance-none"
                  value={newMember.memberType}
                  onChange={e => setNewMember({...newMember, memberType: e.target.value})}
                >
                  <option value="STUDENT">Talaba</option>
                  <option value="TEACHER">O'qituvchi</option>
                  <option value="REGULAR">Oddiy kitobxon</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-white/5 transition border border-transparent"
                >
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary w-auto">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
