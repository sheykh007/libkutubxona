import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, Book, Edit, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  copiesCount?: number;
}

export function CatalogPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', publishYear: '' });

  const fetchBooks = () => {
    setLoading(true);
    api.get('/books')
      .then(res => {
        setBooks(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch books:", err);
        toast.error("Kitoblarni yuklashda xatolik");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/books', {
        title: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn,
        publishYear: parseInt(newBook.publishYear)
      });
      toast.success("Yangi kitob muvaffaqiyatli qo'shildi!");
      setIsModalOpen(false);
      setNewBook({ title: '', author: '', isbn: '', publishYear: '' });
      fetchBooks();
    } catch (error) {
      toast.error("Kitob qo'shishda xatolik yuz berdi");
    }
  };

  return (
    <div className="pb-8 anim-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Katalog</h1>
          <p className="text-slate-400 mt-1">Kutubxona fondidagi barcha asarlar va nashrlar boshqaruvi</p>
        </div>
        
        <button 
          className="btn-primary flex items-center gap-2 w-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          Yangi Kitob Qo'shish
        </button>
      </div>

      {/* Filters and Search */}
      <div className="glass-panel p-4 mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Kitob nomi, muallif yoki ISBN bo'yicha qidiruv..." 
            className="input-glass pl-10 w-full"
          />
        </div>
        <div className="flex gap-4">
           <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition flex items-center gap-2">
             <Filter size={20} />
             Filtr
           </button>
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
           <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
             <Book size={40} className="text-blue-400" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Hozircha kitoblar yo'q</h3>
           <p className="text-slate-400 max-w-md">Katalog hozircha bo'sh. O'ng tomon yuqoridagi "Yangi Kitob Qo'shish" tugmasi orqali kitoblarni ro'yxatga oling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book, i) => (
            <div key={book.id} className={`glass-panel border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group anim-enter delay-${(i % 5)*100}`}>
              <div className="h-48 bg-gradient-to-br from-blue-900/40 to-slate-900 flex items-center justify-center relative">
                <Book size={48} className="text-blue-400/50" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition shadow-lg">
                    <Edit size={18} />
                  </button>
                  <button className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500 transition shadow-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">{book.title}</h3>
                </div>
                <p className="text-sm text-blue-400 mb-4">{book.author}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                   <span className="bg-white/5 px-2 py-1 rounded">ISBN: {book.isbn || 'Yo\'q'}</span>
                   <span>Yil: {book.publishYear}</span>
                </div>
                
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <span className="text-sm text-slate-300">Nusxalar: <strong className="text-white">{book.copiesCount || 0} ta</strong></span>
                   <button className="text-sm text-blue-400 font-medium hover:text-blue-300 transition">Batafsil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 anim-enter border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Yangi Kitob</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Kitob nomi *</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={newBook.title}
                  onChange={e => setNewBook({...newBook, title: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Muallif</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={newBook.author}
                  onChange={e => setNewBook({...newBook, author: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ISBN</label>
                  <input 
                    type="text" 
                    className="input-glass" 
                    value={newBook.isbn}
                    onChange={e => setNewBook({...newBook, isbn: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nashr yili</label>
                  <input 
                    type="number" 
                    className="input-glass" 
                    value={newBook.publishYear}
                    onChange={e => setNewBook({...newBook, publishYear: e.target.value})}
                  />
                </div>
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
