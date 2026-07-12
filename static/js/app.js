const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;

// ─── API Helper ──────────────────────────────────────────────
const API_BASE = '/api';

async function api(method, path, body = null, isFile = false) {
  const opts = { method, headers: {} };
  opts.headers['X-Librarian-Name'] = localStorage.getItem('lib_user') || 'Tizim';
  
  if (body && !isFile) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body && isFile) {
    opts.body = body;
  }
  const response = await fetch(API_BASE + path, opts);
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || e.detail || `HTTP ${response.status}`);
  }
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  return response.blob();
}

// ─── Toast System ─────────────────────────────────────────────
const toasts = ref([]);
let toastId = 0;
function toast(msg, type = 'info') {
  const id = ++toastId;
  toasts.value.push({ id, msg, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 4000);
}

// ─── TOIFA labels ─────────────────────────────────────────────
const TOIFA_LABELS = {
  'gazeta': 'Gazeta',
  'jurnal': 'Jurnal',
  '0': '0 - Fan, Texno',
  '1': '1 - Falsafa',
  '2': '2 - Din',
  '3': '3 - Ijtimoiy',
  '5': '5 - Matematika',
  '6': '6 - Amaliy',
  '7': "7 - San'at",
  '8': '8 - Til, Adabiyot',
  '9': '9 - Geografiya',
};

const TOIFA_OPTIONS = Object.entries(TOIFA_LABELS).map(([v, l]) => ({ value: v, label: l }));

const BADGE_COLORS = {
  'gazeta': 'badge-blue', 'jurnal': 'badge-cyan',
  '0': 'badge-purple', '1': 'badge-purple', '2': 'badge-yellow',
  '3': 'badge-green', '5': 'badge-blue', '6': 'badge-cyan',
  '7': 'badge-yellow', '8': 'badge-green', '9': 'badge-purple',
};

// ─── Chart Instances ─────────────────────────────────────────
let monthlyChart = null;
let categoryChart = null;
let genderChart = null;

// ─── Main App ─────────────────────────────────────────────────
const app = createApp({
  setup() {
    // Auth & Navigation
    const isLoggedIn = ref(localStorage.getItem('lib_logged_in') === 'true');
    const auth = reactive({ username: localStorage.getItem('lib_user') || '', role: localStorage.getItem('lib_role') || 'admin' });
    const loginForm = reactive({ username: '', password: '', role: 'admin' });

    const currentPage = ref('dashboard');
    const sidebarOpen = ref(false);

    // Theme
    const theme = ref(localStorage.getItem('lib_theme') || 'dark');
    watch(theme, (newVal) => {
      document.documentElement.setAttribute('data-theme', newVal);
      localStorage.setItem('lib_theme', newVal);
    }, { immediate: true });
    
    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
    }

    // Dashboard
    const dashStats = ref(null);
    const dashLoading = ref(false);
    const dashDateFrom = ref('');
    const dashDateTo = ref('');
    const dashPeriod = ref('');

    function setDashPeriod() {
      const today = new Date();
      let from = new Date();
      if (!dashPeriod.value || dashPeriod.value === 'all') { 
        dashDateFrom.value = ''; 
        dashDateTo.value = ''; 
      }
      else if (dashPeriod.value === 'day') { 
        dashDateFrom.value = dashDateTo.value = today.toISOString().split('T')[0]; 
      }
      else if (dashPeriod.value === 'month') {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        dashDateFrom.value = from.toISOString().split('T')[0];
        dashDateTo.value = today.toISOString().split('T')[0];
      }
      else if (dashPeriod.value === 'quarter') {
        from = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        dashDateFrom.value = from.toISOString().split('T')[0];
        dashDateTo.value = today.toISOString().split('T')[0];
      }
      else if (dashPeriod.value === 'half_year') {
        from.setMonth(today.getMonth() - 6);
        dashDateFrom.value = from.toISOString().split('T')[0];
        dashDateTo.value = today.toISOString().split('T')[0];
      }
      loadDashboard();
    }

    // New V2 states
    const notifications = ref([]);
    const showNotifications = ref(false);
    const reservationsList = ref([]);
    const extensionsList = ref([]);
    const auditLogs = ref([]);
    const backupsList = ref([]);

    // Members
    const members = ref([]);
    const membersLoading = ref(false);
    const memberTotal = ref(0);
    const memberPage = ref(1);
    const pageSize = 20;
    const memberFilters = reactive({ q: '', toifa: '', holati: '', date_from: '', date_to: '' });
    const showMemberModal = ref(false);
    const showMemberDetail = ref(false);
    const selectedMember = ref(null);
    const memberIssues = ref([]);
    const editMode = ref(false);

    const memberForm = reactive({
      sigla: '', familiya: '', telegram_id: '', toifa: '', jinsi: 'erkak',
      tugilgan_sana: '', yangi_avo_sana: '', qayta_avo_sana: '',
      holati: 'faol', azolik_bosh: '', azolik_tug: '',
      tolov_summa: '', tolov_sana: '', tolov_turi: ''
    });

    // Book Issues
    const issues = ref([]);
    const issuesLoading = ref(false);
    const showIssueModal = ref(false);
    const issueFilter = reactive({ member: '', qaytarildi: '' });
    const issueForm = reactive({
      member: '', book_item: null, book_name: '', berilgan_sana: '', qaytarish_sana: '', jarima_kun_narxi: 500,
    });
    const memberSearchQ = ref('');
    const memberSearchResults = ref([]);
    
    // Books
    const booksList = ref([]);
    const booksLoading = ref(false);
    const bookPage = ref(1);
    const bookTotal = ref(0);
    const bookPageSize = ref(10);
    const totalBookPages = computed(() => Math.ceil(bookTotal.value / bookPageSize.value));
    const bookSearchFilter = ref('');
    const bookBranchFilter = ref('');
    const showBookModal = ref(false);
    const editBookMode = ref(false);
    const bookForm = reactive({
      id: null,
      title: '',
      author: '',
      published_year: '',
      barcode: '',
      total_count: 1,
      branch_id: '',
      items: []
    });
    const bookSearchQ = ref('');
    const bookSearchResults = ref([]);
    const branches = ref([]);

    async function loadBranches() {
      try {
        const data = await api('GET', '/branches/');
        branches.value = data.results ?? data;
      } catch(e) {}
    }

    // Import
    const importFile = ref(null);
    const importResult = ref(null);
    const importing = ref(false);
    const dragover = ref(false);
    const importTab = ref('upload');
    const importType = ref('members');

    // Finance
    const financeTab = ref('summary');
    const payments = ref([]);
    const debtors = ref([]);
    const financeLoading = ref(false);

    // Computed
    const totalPages = computed(() => Math.ceil(memberTotal.value / pageSize));
    const today = computed(() => new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }));

    const formatPrice = (val) => {
      if (!val) return '0';
      return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
    };

    // ─── Auth ────────────────────────────────────────────────
    function login() {
      if (!loginForm.username || !loginForm.password) {
        toast('Login va parolni kiriting', 'warning');
        return;
      }
      // Simple simulation
      isLoggedIn.value = true;
      auth.username = loginForm.username;
      auth.role = loginForm.role;
      localStorage.setItem('lib_logged_in', 'true');
      localStorage.setItem('lib_user', auth.username);
      localStorage.setItem('lib_role', auth.role);
      toast('Tizimga muvaffaqiyatli kirdingiz', 'success');
      loadDashboard();
    }

    function logout() {
      isLoggedIn.value = false;
      localStorage.removeItem('lib_logged_in');
      localStorage.removeItem('lib_user');
      localStorage.removeItem('lib_role');
      toast('Tizimdan chiqdingiz', 'info');
    }

    // ─── Navigation ───────────────────────────────────────────
    function navigate(page) {
      currentPage.value = page;
      sidebarOpen.value = false;
      if (page === 'dashboard') loadDashboard();
      if (page === 'members') loadMembers();
      if (page === 'books') loadBooks();
      if (page === 'issues') loadIssues();
      if (page === 'finance') loadFinanceData();
      if (page === 'reservations') loadReservations();
      if (page === 'extensions') loadExtensions();
      if (page === 'audit_log') loadAuditLogs();
      if (page === 'backup') loadBackups();
    }

    async function loadNotifications() {
      try {
        const data = await api('GET', '/dashboard/notifications/');
        notifications.value = data;
      } catch(e) {}
    }

    async function loadLeaderboard() {
      try {
        const data = await api('GET', '/dashboard/leaderboard/');
        if (dashStats.value) {
            dashStats.value.top_members = data; // use the V2 leaderboard
        }
      } catch(e) {}
    }

    // ─── Dashboard ────────────────────────────────────────────
    async function loadDashboard() {
      dashLoading.value = true;
      try {
        loadNotifications();
        let params = new URLSearchParams();
        if (dashDateFrom.value) params.append('date_from', dashDateFrom.value);
        if (dashDateTo.value) params.append('date_to', dashDateTo.value);
        let qs = params.toString() ? `?${params.toString()}` : '';
        dashStats.value = await api('GET', `/dashboard/${qs}`);
        await loadLeaderboard(); // fetch the real V2 leaderboard
        await nextTick();
        renderCharts();
      } catch (e) {
        toast('Dashboard ma\'lumotlarini yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        dashLoading.value = false;
      }
    }

    function renderCharts() {
      if (!dashStats.value) return;
      const s = dashStats.value;

      // Monthly chart
      const mc = document.getElementById('monthlyChart');
      if (mc) {
        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(mc, {
          type: 'line',
          data: {
            labels: s.monthly_growth.map(m => m.month),
            datasets: [{
              label: "A'zolar o'sishi",
              data: s.monthly_growth.map(m => m.count),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.1)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#6366f1',
              pointRadius: 4,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 11 } } },
              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
            }
          }
        });
      }

      // Category chart removed
      // Gender chart
      const gc = document.getElementById('genderChart');
      if (gc) {
        if (genderChart) genderChart.destroy();
        genderChart = new Chart(gc, {
          type: 'bar',
          data: {
            labels: ['Erkak', 'Ayol'],
            datasets: [{
              data: [s.gender_stats.erkak, s.gender_stats.ayol],
              backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(236,72,153,0.7)'],
              borderRadius: 6,
              borderWidth: 0,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#64748b' } },
              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', stepSize: 1 }, beginAtZero: true }
            }
          }
        });
      }
    }

    // ─── Members ──────────────────────────────────────────────
    async function loadMembers(page = 1) {
      membersLoading.value = true;
      memberPage.value = page;
      try {
        const params = new URLSearchParams({
          page,
          q: memberFilters.q,
          toifa: memberFilters.toifa,
          holati: memberFilters.holati,
          date_from: memberFilters.date_from,
          date_to: memberFilters.date_to,
        });
        const data = await api('GET', `/members/?${params}`);
        members.value = data.results ?? data;
        memberTotal.value = data.count ?? (data.results ? data.count : data.length);
      } catch (e) {
        toast('A\'zolarni yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        membersLoading.value = false;
      }
    }

    function resetMemberForm() {
      Object.keys(memberForm).forEach(k => {
        if (typeof memberForm[k] === 'number') memberForm[k] = 0;
        else memberForm[k] = '';
      });
      memberForm.holati = 'faol';
      memberForm.jinsi = 'erkak';
      memberForm.jarima_kun_narxi = 500;
    }

    function openAddMember() {
      resetMemberForm();
      editMode.value = false;
      showMemberModal.value = true;
    }

    function openEditMember(m) {
      Object.assign(memberForm, m);
      editMode.value = true;
      showMemberModal.value = true;
    }

    async function saveMember() {
      try {
        const payload = { ...memberForm };
        ['tugilgan_sana', 'yangi_avo_sana', 'qayta_avo_sana', 'azolik_bosh', 'azolik_tug', 'tolov_sana'].forEach(f => {
          if (!payload[f]) delete payload[f];
        });
        ['tolov_summa'].forEach(f => {
          if (!payload[f]) delete payload[f];
        });

        if (editMode.value) {
          await api('PUT', `/members/${memberForm.id}/`, payload);
          toast("A'zo muvaffaqiyatli yangilandi", 'success');
        } else {
          await api('POST', '/members/', payload);
          toast("Yangi a'zo qo'shildi", 'success');
        }
        showMemberModal.value = false;
        loadMembers(memberPage.value);
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    async function deleteMember(id) {
      if (!confirm("A'zoni o'chirishni istaysizmi?")) return;
      try {
        await api('DELETE', `/members/${id}/`);
        toast("A'zo o'chirildi", 'success');
        loadMembers(memberPage.value);
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    async function approveMember(m) {
      if (!confirm(m.familiya + " ni tasdiqlaysizmi?")) return;
      try {
        await api('PATCH', `/members/${m.id}/`, { holati: 'faol' });
        toast("A'zo tasdiqlandi", 'success');
        loadMembers(memberPage.value);
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    async function viewMember(m) {
      selectedMember.value = m;
      showMemberDetail.value = true;
      try {
        const data = await api('GET', `/issues/?member=${m.id}`);
        memberIssues.value = data.results ?? data;
      } catch (e) {
        memberIssues.value = [];
      }
    }

    function getAge(m) {
      if (m.tugilgan_sana) {
        const dob = new Date(m.tugilgan_sana);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const md = today.getMonth() - dob.getMonth();
        if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
        return age;
      }
      return m.yosh || '-';
    }

    // ─── Book Issues ──────────────────────────────────────────
    async function loadIssues() {
      issuesLoading.value = true;
      try {
        const params = new URLSearchParams(issueFilter);
        const data = await api('GET', `/issues/?${params}`);
        issues.value = data.results ?? data;
      } catch (e) {
        toast('Kitob jurnalini yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        issuesLoading.value = false;
      }
    }

    function openAddIssue() {
      Object.keys(issueForm).forEach(k => { issueForm[k] = ''; });
      issueForm.jarima_kun_narxi = 500;
      memberSearchQ.value = '';
      memberSearchResults.value = [];
      bookSearchQ.value = '';
      bookSearchResults.value = [];
      showIssueModal.value = true;
    }

    async function searchMembersForIssue() {
      if (memberSearchQ.value.length < 2) { memberSearchResults.value = []; return; }
      try {
        const data = await api('GET', `/members/?q=${encodeURIComponent(memberSearchQ.value)}`);
        memberSearchResults.value = (data.results ?? data).slice(0, 6);
      } catch (e) { memberSearchResults.value = []; }
    }

    function selectMemberForIssue(m) {
      issueForm.member = m.id;
      memberSearchQ.value = `${m.sigla} - ${m.familiya}`;
      memberSearchResults.value = [];
    }

    async function searchBooksForIssue() {
      if (bookSearchQ.value.length < 2) { bookSearchResults.value = []; return; }
      try {
        const data = await api('GET', `/book-items/search/?q=${encodeURIComponent(bookSearchQ.value)}`);
        bookSearchResults.value = data;
      } catch (e) { bookSearchResults.value = []; }
    }

    function selectBookForIssue(b) {
      if (b.status !== 'available') return;
      issueForm.book_item = b.id;
      issueForm.book_name = b.title;
      bookSearchQ.value = '';
      bookSearchResults.value = [];
    }

    async function loadBooks(page = 1) {
      booksLoading.value = true;
      bookPage.value = page;
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('page_size', bookPageSize.value);
        if (bookSearchFilter.value) params.append('q', bookSearchFilter.value);
        if (bookBranchFilter.value) params.append('branch', bookBranchFilter.value);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const data = await api('GET', `/books/${qs}`);
        booksList.value = data.results ?? data;
        bookTotal.value = data.count ?? (data.results ? data.count : data.length);
      } catch (e) {
        toast('Kitoblarni yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        booksLoading.value = false;
      }
    }

    function openAddBook() {
      editBookMode.value = false;
      Object.keys(bookForm).forEach(k => { if(Array.isArray(bookForm[k])) bookForm[k] = []; else bookForm[k] = ''; });
      bookForm.total_count = 1;
      bookForm.branch_id = branches.value.length > 0 ? branches.value[0].id : '';
      showBookModal.value = true;
    }
    
    function openEditBook(book) {
      editBookMode.value = true;
      bookForm.id = book.id;
      bookForm.title = book.title;
      bookForm.author = book.author;
      bookForm.published_year = book.published_year;
      bookForm.barcode = '';
      bookForm.items = JSON.parse(JSON.stringify(book.items || []));
      bookForm.total_count = book.items.length;
      bookForm.branch_id = book.items.length > 0 && book.items[0].branch ? book.items[0].branch : '';
      showBookModal.value = true;
    }

    async function saveBook() {
      try {
        let payload = { ...bookForm };
        if (!payload.published_year) payload.published_year = null;
        if (editBookMode.value) {
          await api('PUT', `/books/${payload.id}/`, payload);
          if (payload.items && payload.items.length > 0) {
            await api('PUT', '/book-items/bulk-update/', { items: payload.items });
          }
          toast('Kitob va nusxalari muvaffaqiyatli tahrirlandi', 'success');
        } else {
          await api('POST', '/books/', payload);
          toast('Kitob muvaffaqiyatli qo\'shildi', 'success');
        }
        showBookModal.value = false;
        loadBooks(bookPage.value);
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }
    
    async function deleteBook(id) {
      if (!confirm('Haqiqatan ham bu kitobni o\'chirmoqchimisiz? (Barcha nusxalari o\'chadi)')) return;
      try {
        await api('DELETE', `/books/${id}/`);
        toast('Kitob o\'chirildi', 'success');
        loadBooks();
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }
    
    async function bulkDeleteBooks() {
      if (!confirm('Barcha kitoblar ma\'lumotlarini o\'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo\'lmaydi!')) return;
      try {
        const res = await api('DELETE', '/books/bulk-delete/');
        toast(`Muvaffaqiyatli o'chirildi (${res.count} ta)`, 'success');
        loadBooks();
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }

    async function saveIssue() {
      try {
        const payload = { ...issueForm };
        if (!payload.member) throw new Error("Iltimos, a'zoni tanlang");
        if (!payload.book_item) throw new Error("Iltimos, kitobni tanlang");
        
        if (!payload.berilgan_sana) payload.berilgan_sana = new Date().toISOString().split('T')[0];
        if (!payload.qaytarish_sana) {
          const d = new Date(payload.berilgan_sana);
          d.setDate(d.getDate() + 10);
          payload.qaytarish_sana = d.toISOString().split('T')[0];
        }
        
        await api('POST', '/issues/', payload);
        toast('Kitob muvaffaqiyatli berildi', 'success');
        showIssueModal.value = false;
        loadIssues();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    async function returnBook(id) {
      if (!confirm('Kitob qaytarilganini tasdiqlaysizmi?')) return;
      try {
        await api('POST', `/issues/${id}/return/`);
        toast('Kitob qaytarildi', 'success');
        loadIssues();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function overdueClass(issue) {
      if (issue.qaytarildi) return '';
      const today = new Date();
      const ret = new Date(issue.qaytarish_sana);
      if (today > ret) return 'badge-red';
      return 'badge-green';
    }

    function overdueDays(issue) {
      if (issue.qaytarildi) return 0;
      const today = new Date();
      const ret = new Date(issue.qaytarish_sana);
      if (today > ret) return Math.floor((today - ret) / 86400000);
      return 0;
    }

    // ─── Import ───────────────────────────────────────────────
    function onDrop(e) {
      e.preventDefault(); dragover.value = false;
      const f = e.dataTransfer.files[0];
      if (f) { importFile.value = f; }
    }

    function onFileSelect(e) { importFile.value = e.target.files[0]; }

    async function doImport() {
      if (!importFile.value) { toast('Fayl tanlanmagan', 'warning'); return; }
      importing.value = true;
      importResult.value = null;
      try {
        const fd = new FormData();
        fd.append('file', importFile.value);
        const endpoint = importType.value === 'books' ? '/books/import/' : '/members/import/';
        importResult.value = await api('POST', endpoint, fd, true);
        const addedCount = importResult.value.created_count || importResult.value.created_books || 0;
        toast(`Import tugadi: ${addedCount} ta qo'shildi`, 'success');
        importTab.value = 'results';
        loadDashboard();
      } catch (e) {
        toast('Import xatoligi: ' + e.message, 'error');
      } finally {
        importing.value = false;
      }
    }

    async function bulkDeleteAll() {
      if (importType.value === 'books') {
        if (!confirm("DIQQAT! Barcha kitoblarni o'chirishni istaysizmi? Ushbu amalni qaytarib bo'lmaydi.")) return;
        try {
          const res = await api('DELETE', '/books/bulk-delete/');
          toast(`${res.count || "Barcha"} ta kitob o'chirildi`, 'info');
          loadDashboard();
        } catch (e) { toast(e.message, 'error'); }
      } else {
        if (!confirm("DIQQAT! Barcha a'zolar va ularga biriktirilgan kitoblar tarixini butunlay o'chirishni istaysizmi? Ushbu amalni qaytarib bo'lmaydi.")) return;
        try {
          const res = await api('DELETE', '/members/bulk-delete/');
          toast(`${res.count} ta ma'lumot o'chirildi`, 'info');
          loadDashboard();
        } catch (e) { toast(e.message, 'error'); }
      }
    }

    // Export
    async function exportMembers() {
      try {
        const params = new URLSearchParams({
          q: memberFilters.q, toifa: memberFilters.toifa, holati: memberFilters.holati
        });
        const blob = await api('GET', `/members/export/?${params}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "azolar.xlsx"; a.click();
        URL.revokeObjectURL(url);
        toast('Excel yuklab olindi', 'success');
      } catch (e) {
        toast('Eksport xatoligi: ' + e.message, 'error');
      }
    }

    // ─── Finance ──────────────────────────────────────────────
    async function loadFinanceData() {
      financeLoading.value = true;
      try {
        const [ps, ds] = await Promise.all([
          api('GET', '/payments/'),
          api('GET', '/members/debtors/')
        ]);
        payments.value = ps.results || ps;
        debtors.value = ds;
      } catch (e) {
        toast('Moliya ma\'lumotlarini yuklashda xato: ' + e.message, 'error');
      } finally {
        financeLoading.value = false;
      }
    }

    async function viewMemberById(id) {
       try {
         const m = await api('GET', `/members/${id}/`);
         viewMember(m);
       } catch (e) {
         toast('A\'zoni topib bo\'lmadi: ' + e.message, 'error');
       }
    }

    // ─── Watchers ─────────────────────────────────────────────
    let filterTimer = null;
    watch(memberFilters, () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => loadMembers(1), 450);
    });

    let bookFilterTimer = null;
    watch([bookSearchFilter, bookBranchFilter], () => {
      clearTimeout(bookFilterTimer);
      bookFilterTimer = setTimeout(() => loadBooks(), 450);
    });

    watch(currentPage, (newVal) => {
      if (newVal === 'members') loadMembers();
      else if (newVal === 'issues') loadIssues();
      else if (newVal === 'books') loadBooks();
    });

    watch(memberSearchQ, searchMembersForIssue);
    watch(bookSearchQ, searchBooksForIssue);

    // ─── Init ─────────────────────────────────────────────────
    onMounted(() => {
      loadBranches();
      if (isLoggedIn.value) loadDashboard();
    });

    // --- V2 API Functions ---
    async function loadReservations() {
      try {
        const data = await api('GET', '/reservations/');
        reservationsList.value = data.results ?? data;
      } catch(e) {}
    }
    async function updateReservation(id, status) {
      if(!confirm('Tasdiqlaysizmi?')) return;
      try {
        await api('PATCH', `/reservations/${id}/`, {status: status});
        toast('Holati o\'zgardi', 'success');
        loadReservations();
        loadNotifications();
      } catch(e) { toast(e.message, 'error'); }
    }
    
    async function loadExtensions() {
      try {
        const data = await api('GET', '/extensions/');
        extensionsList.value = data;
      } catch(e) {}
    }
    async function updateExtension(id, action) {
      if(!confirm('Tasdiqlaysizmi?')) return;
      try {
        await api('PATCH', `/extensions/${id}/`, {action: action});
        toast('So\'rov bajarildi', 'success');
        loadExtensions();
        loadNotifications();
      } catch(e) { toast(e.message, 'error'); }
    }
    
    async function loadAuditLogs() {
      try {
        const data = await api('GET', '/audit-logs/');
        auditLogs.value = data;
      } catch(e) {}
    }
    
    async function loadBackups() {
      try {
        const data = await api('GET', '/backups/');
        backupsList.value = data;
      } catch(e) {}
    }
    async function createBackup() {
      try {
        await api('POST', '/backups/');
        toast('Zaxira yaratildi!', 'success');
        loadBackups();
      } catch(e) { toast(e.message, 'error'); }
    }

    return {
      isLoggedIn, auth, loginForm, login, logout,
      currentPage, navigate, sidebarOpen,
      notifications, showNotifications,
      reservationsList, updateReservation,
      extensionsList, updateExtension,
      auditLogs, backupsList, createBackup,
      today, TOIFA_LABELS, TOIFA_OPTIONS, BADGE_COLORS,
      dashStats, dashLoading, dashDateFrom, dashDateTo, dashPeriod, setDashPeriod,
      members, membersLoading, memberTotal, memberPage, pageSize, totalPages,
      memberFilters, memberForm, editMode,
      showMemberModal, showMemberDetail, selectedMember, memberIssues,
      openAddMember, openEditMember, saveMember, deleteMember, viewMember, loadMembers, approveMember,
      getAge,
      booksList, booksLoading, bookPage, bookTotal, bookPageSize, totalBookPages, bookSearchFilter, bookBranchFilter, branches, showBookModal, bookForm, editBookMode, openAddBook, saveBook, openEditBook, deleteBook, bulkDeleteBooks,
      bookSearchQ, bookSearchResults, selectBookForIssue,
      issues, issuesLoading, issueFilter, issueForm, showIssueModal,
      memberSearchQ, memberSearchResults, selectMemberForIssue,
      openAddIssue, saveIssue, returnBook, loadIssues,
      overdueClass, overdueDays,
      importFile, importResult, importing, dragover, importTab, importType,
      financeTab, payments, debtors, financeLoading,
      onDrop, onFileSelect, doImport, exportMembers,
      bulkDeleteAll,
      formatPrice, viewMemberById,
      toasts, theme, toggleTheme,
    };
  }
});

app.mount('#app');
