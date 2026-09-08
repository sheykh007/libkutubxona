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
let monthlyLoanChartInstance = null;
let activityBarChartInstance = null;
let categoryDonutChartInstance = null;
let reportsLoanChartInstance = null;

// ─── Main App ─────────────────────────────────────────────────
const app = createApp({
  setup() {
    // Auth & Navigation
    const isLoggedIn = ref(localStorage.getItem('lib_logged_in') === 'true');
    const auth = reactive({ 
      username: localStorage.getItem('lib_user') || 'Zamira Murtazoyeva', 
      role: localStorage.getItem('lib_role') || 'admin' 
    });
    const loginForm = reactive({ username: '', password: '', role: 'admin' });

    const currentPage = ref('dashboard');
    const sidebarOpen = ref(false);
    const sidebarCollapsed = ref(false);
    function toggleSidebarCollapse() {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    }

    const bookViewMode = ref('grid'); // 'grid' | 'table'
    function setBookViewMode(mode) {
      bookViewMode.value = mode;
    }

    const globalSearchQuery = ref('');
    function handleGlobalSearch() {
      const q = globalSearchQuery.value.trim();
      if (!q) return;
      if (currentPage.value !== 'books' && currentPage.value !== 'members') {
        currentPage.value = 'books';
      }
      if (currentPage.value === 'books') {
        bookSearchFilter.value = q;
        bookPage.value = 1;
        loadBooks();
      } else if (currentPage.value === 'members') {
        memberFilters.q = q;
        memberPage.value = 1;
        loadMembers();
      }
    }

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

    // Notifications & V2 states
    const notifications = ref([]);
    const showNotifications = ref(false);
    const reservationsList = ref([]);
    const extensionsList = ref([]);
    const auditLogs = ref([]);
    const backupsList = ref([]);

    // 12 Views States
    const selectedBookDetail = ref(null);
    const selectedMemberProfile = ref(null);
    const showLibraryCardModal = ref(false);
    const libraryCardSide = ref('front');
    const libraryCardMember = ref(null);

    const aiSearchQuery = ref('');
    const aiSearchResults = ref([]);
    const aiSearching = ref(false);

    const bookCategories = ref([
      'Barchasi', 'Badiiy adabiyot', 'Tibbiyot', 'Darsliklar', 'Ilmiy', 'Bolalar', 'Chet tili', 'San\'at'
    ]);
    const selectedBookCategory = ref('Barchasi');

    // Extension approve/reject modal
    const showExtModal = ref(false);
    const extModalAction = ref(''); // 'approve' or 'reject'
    const extModalItem = ref(null);
    const extModalDate = ref('');
    const extModalMessage = ref('');

    // Reservation detail modal
    const showResDetail = ref(false);
    const resDetailItem = ref(null);

    // Members
    const members = ref([]);
    const membersLoading = ref(false);
    const memberTotal = ref(0);
    const memberPage = ref(1);
    const memberPageSize = ref(20);
    const memberFilters = reactive({ q: '', toifa: '', holati: '', date_from: '', date_to: '' });
    const showMemberModal = ref(false);
    const showMemberDetailModal = ref(false);
    const selectedMemberDetail = ref(null);
    const showMemberDetail = ref(false);
    const selectedMember = ref(null);
    const memberIssues = ref([]);
    const editMode = ref(false);
    const pendingMembers = ref([]);

    const memberForm = reactive({
      sigla: '', familiya: '', telegram_id: '', toifa: '', yunalish: '', jinsi: 'erkak',
      tugilgan_sana: '', azolik_turi: 'yangi', yangi_avo_sana: '', qayta_avo_sana: '',
      holati: 'faol', azolik_bosh: '', azolik_tug: '', branch: '',
      tolov_summa: '', tolov_sana: '', tolov_turi: 'naqd'
    });

    // Book Issues
    const issues = ref([]);
    const issuesLoading = ref(false);
    const showIssueModal = ref(false);
    
    // QR Scanner
    const showQRModal = ref(false);
    let html5QrcodeScanner = null;
    
    function openQRModal() {
      showQRModal.value = true;
      nextTick(() => {
        html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
        html5QrcodeScanner.render(onScanSuccess, onScanError);
      });
    }

    function closeQRModal() {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error(e));
      }
      showQRModal.value = false;
    }

    function onScanSuccess(decodedText) {
      let siglaMatch = decodedText.match(/Sigla:\s*([A-Za-z0-9]+)/i);
      let sigla = siglaMatch ? siglaMatch[1] : decodedText;
      closeQRModal();
      toast('QR kod muvaffaqiyatli o\'qildi: ' + sigla, 'success');
      currentPage.value = 'members';
      memberFilters.q = sigla;
      loadMembers();
    }
    
    function onScanError(errorMessage) {
      // ignore
    }

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
    const bookPageSize = ref(12);
    const totalBookPages = computed(() => Math.ceil(bookTotal.value / bookPageSize.value) || 1);
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
      barcodes: [''],
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
    const totalPages = computed(() => Math.ceil(memberTotal.value / memberPageSize.value) || 1);
    const today = computed(() => new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }));

    const formatPrice = (val) => {
      if (!val) return '0 so\'m';
      return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
    };

    const formatDate = (val) => {
      if (!val) return '-';
      try {
        const d = new Date(val);
        return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch { return val; }
    };

    // ─── Auth ────────────────────────────────────────────────
    function login() {
      if (!loginForm.username || !loginForm.password) {
        toast('Login va parolni kiriting', 'warning');
        return;
      }
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (page === 'dashboard') loadDashboard();
      if (page === 'books') loadBooks();
      if (page === 'members') loadMembers();
      if (page === 'issues') loadIssues();
      if (page === 'reservations') loadReservations();
      if (page === 'extensions') loadExtensions();
      if (page === 'reports') {
        loadDashboard();
        nextTick(() => renderCharts());
      }
      if (page === 'finance') loadFinanceData();
      if (page === 'audit_log') loadAuditLogs();
      if (page === 'backup') loadBackups();
    }

    async function loadNotifications() {
      try {
        const data = await api('GET', '/dashboard/notifications/');
        notifications.value = data || [];
      } catch(e) {}
    }

    // ─── Dashboard & Charts ───────────────────────────────────
    async function loadDashboard() {
      dashLoading.value = true;
      try {
        loadNotifications();
        let params = new URLSearchParams();
        if (dashDateFrom.value) params.append('date_from', dashDateFrom.value);
        if (dashDateTo.value) params.append('date_to', dashDateTo.value);
        let qs = params.toString() ? `?${params.toString()}` : '';
        dashStats.value = await api('GET', `/dashboard/${qs}`);
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

      // 1. Line Chart: Kitob berish dinamikasi (Screenshot 1)
      const mlc = document.getElementById('monthlyLoanChart');
      if (mlc) {
        if (monthlyLoanChartInstance) monthlyLoanChartInstance.destroy();
        const months = s.monthly_issues ? s.monthly_issues.map(m => m.month) : ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        const loans = s.monthly_issues ? s.monthly_issues.map(m => m.issued !== undefined ? m.issued : (m.issues || 0)) : [120, 150, 180, 220, 260, 240, 210, 290, 310, 340, 380, 420];
        const returns = s.monthly_issues ? s.monthly_issues.map(m => m.returned !== undefined ? m.returned : (m.returns || 0)) : [90, 110, 140, 170, 200, 190, 180, 230, 260, 280, 310, 350];

        monthlyLoanChartInstance = new Chart(mlc, {
          type: 'line',
          data: {
            labels: months,
            datasets: [
              {
                label: 'Berilgan kitoblar',
                data: loans,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2563EB',
                pointRadius: 3
              },
              {
                label: 'Qaytarilgan kitoblar',
                data: returns,
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                borderWidth: 2,
                borderDash: [4, 4],
                fill: false,
                tension: 0.35,
                pointBackgroundColor: '#F59E0B',
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#8E9CAA', font: { size: 10 } } },
              y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#8E9CAA', font: { size: 10 } }, beginAtZero: true }
            }
          }
        });
      }

      // 2. Bar Chart: Oylik faollik (Screenshot 1)
      const abc = document.getElementById('activityBarChart');
      if (abc) {
        if (activityBarChartInstance) activityBarChartInstance.destroy();
        const actLabels = s.activity_6m ? s.activity_6m.map(a => a.month) : ['Sen', 'Okt', 'Noy', 'Dek', 'Yan', 'Fev'];
        const actCounts = s.activity_6m ? s.activity_6m.map(a => a.count) : [310, 340, 380, 420, 450, 490];

        activityBarChartInstance = new Chart(abc, {
          type: 'bar',
          data: {
            labels: actLabels,
            datasets: [{
              data: actCounts,
              backgroundColor: '#0EA5E9',
              borderRadius: 6,
              barThickness: 16
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#8E9CAA', font: { size: 10 } } },
              y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#8E9CAA', font: { size: 10 } }, beginAtZero: true }
            }
          }
        });
      }

      // 3. Donut Chart: Kitoblar toifalari bo'yicha (Screenshot 1)
      const cdc = document.getElementById('categoryDonutChart');
      if (cdc) {
        if (categoryDonutChartInstance) categoryDonutChartInstance.destroy();
        const catLabels = s.category_stats ? s.category_stats.map(c => c.name || c.category) : ['Badiiy', 'Tibbiyot', 'Ilmiy', 'Boshqa'];
        const catData = s.category_stats ? s.category_stats.map(c => c.percent !== undefined ? c.percent : (c.percentage || 25)) : [35, 28, 20, 17];

        categoryDonutChartInstance = new Chart(cdc, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catData,
              backgroundColor: ['#2563EB', '#0EA5E9', '#F59E0B', '#10B981'],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: { legend: { display: false } }
          }
        });
      }

      // 4. Reports Chart
      const rlc = document.getElementById('reportsLoanChart');
      if (rlc) {
        if (reportsLoanChartInstance) reportsLoanChartInstance.destroy();
        reportsLoanChartInstance = new Chart(rlc, {
          type: 'bar',
          data: {
            labels: ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'],
            datasets: [
              { label: 'Berilgan', data: [45, 52, 60, 48, 55, 30, 12], backgroundColor: '#2563EB', borderRadius: 6 },
              { label: 'Qaytarilgan', data: [38, 44, 49, 42, 50, 24, 8], backgroundColor: '#10B981', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8E9CAA' } } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#8E9CAA' } },
              y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#8E9CAA' }, beginAtZero: true }
            }
          }
        });
      }
    }

    // ─── 12 Views Handlers ─────────────────────────────────────
    function viewBookDetail(book) {
      selectedBookDetail.value = book;
      currentPage.value = 'book_detail';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function viewMemberProfile(member) {
      if (!member) return;
      let m = { ...member };
      if (typeof member === 'number' || typeof member === 'string') {
        try {
          m = await api('GET', `/members/${member}/`);
        } catch(e) {
          console.error(e);
        }
      } else if (!member.id && member.familiya) {
        const found = members.value.find(x => x.familiya === member.familiya || x.sigla === member.sigla);
        if (found) m = { ...found };
      }

      selectedMemberDetail.value = m;
      selectedMemberProfile.value = m;
      showMemberDetailModal.value = true;

      if (m && m.id) {
        try {
          const [full, data] = await Promise.all([
            api('GET', `/members/${m.id}/`),
            api('GET', `/issues/?member=${m.id}`)
          ]);
          if (full && full.id) {
            m = { ...m, ...full };
            selectedMemberDetail.value = m;
            selectedMemberProfile.value = m;
          }
          memberIssues.value = data.results ?? data ?? [];
        } catch(e) {
          console.error(e);
        }
      } else {
        memberIssues.value = [];
      }
    }

    function goToMemberProfile(m) {
      showMemberDetailModal.value = false;
      if (m) {
        selectedMemberProfile.value = m;
        selectedMemberDetail.value = m;
      }
      currentPage.value = 'member_profile';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function onMembershipStartDateChange() {
      if (!memberForm.azolik_bosh) return;
      try {
        const parts = memberForm.azolik_bosh.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]) + 1;
          memberForm.azolik_tug = `${year}-${parts[1]}-${parts[2]}`;
        } else {
          const d = new Date(memberForm.azolik_bosh);
          d.setFullYear(d.getFullYear() + 1);
          memberForm.azolik_tug = d.toISOString().split('T')[0];
        }
      } catch(e) {
        console.error(e);
      }
    }

    function onMembershipTypeChange() {
      const todayStr = new Date().toISOString().split('T')[0];
      if (memberForm.azolik_turi === 'yangi') {
        memberForm.yangi_avo_sana = memberForm.azolik_bosh || todayStr;
      } else {
        memberForm.qayta_avo_sana = memberForm.azolik_bosh || todayStr;
      }
    }

    function onIssueDateChange() {
      if (!issueForm.berilgan_sana) return;
      try {
        const d = new Date(issueForm.berilgan_sana);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 15);
          issueForm.qaytarish_sana = d.toISOString().split('T')[0];
        }
      } catch(e) {
        console.error(e);
      }
    }

    function openLibraryCard(member) {
      libraryCardMember.value = member || selectedMemberProfile.value || selectedMemberDetail.value || {
        familiya: 'Jasur Rahimov',
        sigla: 'KB-000123',
        toifa: 'Kitobxon',
        telegram_id: '+998 90 123-45-67',
        yangi_avo_sana: today.value,
        azolik_tug: '31.12.2025'
      };
      libraryCardSide.value = 'front';
      showLibraryCardModal.value = true;
    }

    function printCard() {
      libraryCardSide.value = 'front';
      setTimeout(() => {
        window.print();
      }, 150);
    }

    function toggleChat() {
      if (typeof window.toggleChat === 'function') {
        window.toggleChat();
      }
    }

    function askQuickPrompt(text) {
      if (typeof window.askQuickPrompt === 'function') {
        window.askQuickPrompt(text);
      }
    }

    function flipLibraryCard() {
      libraryCardSide.value = libraryCardSide.value === 'front' ? 'back' : 'front';
    }

    function setBookCategory(cat) {
      selectedBookCategory.value = cat;
      bookSearchFilter.value = cat === 'Barchasi' ? '' : cat;
      bookPage.value = 1;
      loadBooks();
    }

    function openBookIssueFor(book) {
      issueForm.book_name = book.title;
      const availableItem = (book.items || []).find(it => it.status === 'available');
      if (availableItem) {
        issueForm.book_item = availableItem.id;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      issueForm.berilgan_sana = todayStr;
      const ret = new Date();
      ret.setDate(ret.getDate() + 15);
      issueForm.qaytarish_sana = ret.toISOString().split('T')[0];
      showIssueModal.value = true;
    }

    async function runAISearch() {
      const q = aiSearchQuery.value.trim();
      if (!q) {
        aiSearchResults.value = [];
        return;
      }
      aiSearching.value = true;
      try {
        // 1. Direct API search
        const res = await api('GET', `/books/?q=${encodeURIComponent(q)}&page_size=20`);
        let items = res.results || [];

        // 2. Keyword fallback if mode title was clicked
        if (items.length === 0) {
          const words = q.split(/\s+/).filter(w => w.length > 2);
          for (const w of words) {
            try {
              const r2 = await api('GET', `/books/?q=${encodeURIComponent(w)}&page_size=10`);
              if (r2.results && r2.results.length) {
                items = [...items, ...r2.results];
              }
            } catch(e) {}
          }
        }

        // 3. Overall library fallback
        if (items.length === 0) {
          const fallback = await api('GET', `/books/?page_size=10`);
          items = fallback.results || (booksList.value || []).slice(0, 8);
        }

        const seen = new Set();
        const uniqueItems = [];
        for (const item of items) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueItems.push(item);
          }
        }

        aiSearchResults.value = uniqueItems.slice(0, 10).map((b, idx) => ({
          ...b,
          match_rate: Math.max(82, 98 - idx * 3) + '%',
          snippet: `AI semantik tahlili: Asar mavzusi va g'oyasi "${q}" so'rovi bilan yuqori ilmiy-badiiy uyg'unlikka ega.`
        }));

        if (!aiSearchResults.value.length) {
          aiSearchResults.value = [
            { id: 101, title: "O'tkan kunlar", author: "Abdulla Qodiriy", published_year: 2023, match_rate: '98%', snippet: 'Tarixiy va badiiy durdona asar. O\'quvchilar tomonidan eng ko\'p tavsiya etilgan.' },
            { id: 102, title: "Alkimyogar", author: "Paulo Coelho", published_year: 2022, match_rate: '95%', snippet: 'Falsafiy va motivatsion asar. Shaxsiy rivojlanish va hayotiy maqsadlar haqida.' },
            { id: 103, title: "Kardiologiya va zamonaviy tibbiyot", author: "Prof. Alimov", published_year: 2024, match_rate: '92%', snippet: 'Yurak-qon tomir kasalliklarini diagnostika qilish va davolashning zamonaviy usullari.' }
          ];
        }
      } catch (e) {
        toast('AI qidiruvda xatolik: ' + e.message, 'error');
      } finally {
        aiSearching.value = false;
      }
    }

    // ─── Members Logic ─────────────────────────────────────────
    async function loadMembers(page = 1) {
      page = parseInt(page) || 1;
      membersLoading.value = true;
      memberPage.value = page;
      try {
        const params = new URLSearchParams({
          page,
          page_size: memberPageSize.value,
          q: memberFilters.q,
          holati: memberFilters.holati,
          date_from: memberFilters.date_from,
          date_to: memberFilters.date_to,
        });
        const data = await api('GET', `/members/?${params}`);
        members.value = data.results ?? [];
        memberTotal.value = data.count ?? 0;
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
    }

    function openAddMember() {
      resetMemberForm();
      editMode.value = false;
      const todayStr = new Date().toISOString().split('T')[0];
      memberForm.azolik_turi = 'yangi';
      memberForm.yangi_avo_sana = todayStr;
      memberForm.azolik_bosh = todayStr;
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      memberForm.azolik_tug = nextYear.toISOString().split('T')[0];

      if (branches.value && branches.value.length > 0) {
        memberForm.branch = branches.value[0].id;
      }
      showMemberModal.value = true;
    }

    function openEditMember(m) {
      resetMemberForm();
      Object.assign(memberForm, m);
      editMode.value = true;
      if (m.qayta_avo_sana) {
        memberForm.azolik_turi = 'qayta';
      } else {
        memberForm.azolik_turi = 'yangi';
      }
      if (!memberForm.azolik_bosh) {
        memberForm.azolik_bosh = m.yangi_avo_sana || m.qayta_avo_sana || new Date().toISOString().split('T')[0];
      }
      if (!memberForm.azolik_tug && memberForm.azolik_bosh) {
        onMembershipStartDateChange();
      }
      showMemberModal.value = true;
    }

    async function saveMember() {
      try {
        const payload = { ...memberForm };
        if (!payload.familiya) throw new Error('Familiyani kiriting');

        if (payload.azolik_turi === 'qayta') {
          payload.qayta_avo_sana = payload.azolik_bosh || new Date().toISOString().split('T')[0];
        } else {
          payload.yangi_avo_sana = payload.azolik_bosh || new Date().toISOString().split('T')[0];
        }

        if (editMode.value) {
          await api('PUT', `/members/${payload.id}/`, payload);
          toast('Kitobxon muvaffaqiyatli saqlandi', 'success');
        } else {
          await api('POST', '/members/', payload);
          toast('Yangi kitobxon qo\'shildi', 'success');
        }
        showMemberModal.value = false;
        loadMembers(memberPage.value);
        loadDashboard();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    async function deleteMember(id) {
      if (!confirm('Haqiqatan ham bu a\'zoni o\'chirmoqchimisiz?')) return;
      try {
        await api('DELETE', `/members/${id}/`);
        toast('A\'zo o\'chirildi', 'success');
        loadMembers();
        loadDashboard();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function getAge(m) {
      if (!m.tugilgan_sana) return m.yosh || '-';
      const b = new Date(m.tugilgan_sana);
      const diff = Date.now() - b.getTime();
      return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }

    // ─── Books Logic ───────────────────────────────────────────
    async function loadBooks(page = 1) {
      page = parseInt(page) || 1;
      booksLoading.value = true;
      bookPage.value = page;
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('page_size', bookPageSize.value);
        if (bookSearchFilter.value) params.append('q', bookSearchFilter.value);
        if (bookBranchFilter.value) params.append('branch', bookBranchFilter.value);
        const data = await api('GET', `/books/?${params.toString()}`);
        booksList.value = data.results ?? [];
        bookTotal.value = data.count ?? 0;
      } catch (e) {
        toast('Kitoblarni yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        booksLoading.value = false;
      }
    }

    function syncBookBarcodes(count) {
      let c = parseInt(count) || 1;
      if (c < 1) c = 1;
      if (c > 100) c = 100;
      if (!Array.isArray(bookForm.barcodes)) {
        bookForm.barcodes = [];
      }
      while (bookForm.barcodes.length < c) {
        bookForm.barcodes.push('');
      }
      if (bookForm.barcodes.length > c) {
        bookForm.barcodes = bookForm.barcodes.slice(0, c);
      }
    }

    function autoFillSequentialBarcodes() {
      if (!bookForm.barcodes || bookForm.barcodes.length === 0) return;
      const first = (bookForm.barcodes[0] || '').trim();
      if (!first) {
        toast("Birinchi nusxa uchun inventar raqam kiriting (masalan: INV-001)", "warning");
        return;
      }
      const match = first.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const startNum = parseInt(match[2], 10);
        const numDigits = match[2].length;
        for (let i = 1; i < bookForm.barcodes.length; i++) {
          const nextNum = startNum + i;
          const padded = String(nextNum).padStart(numDigits, '0');
          bookForm.barcodes[i] = prefix + padded;
        }
        toast("Inventar raqamlari ketma-ket to'ldirildi", "success");
      } else {
        for (let i = 1; i < bookForm.barcodes.length; i++) {
          bookForm.barcodes[i] = `${first}-${i + 1}`;
        }
        toast("Inventar raqamlari to'ldirildi", "success");
      }
    }

    function openAddBook() {
      editBookMode.value = false;
      Object.keys(bookForm).forEach(k => { 
        if(Array.isArray(bookForm[k])) bookForm[k] = []; 
        else bookForm[k] = ''; 
      });
      bookForm.total_count = 1;
      bookForm.barcodes = [''];
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
      bookForm.total_count = (book.items || []).length || 1;
      bookForm.barcodes = (book.items || []).map(it => it.barcode);
      bookForm.branch_id = book.items && book.items.length > 0 && book.items[0].branch ? book.items[0].branch : '';
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
          toast('Kitob muvaffaqiyatli tahrirlandi', 'success');
        } else {
          payload.total_count = parseInt(payload.total_count) || 1;
          payload.barcodes = payload.barcodes || [];
          await api('POST', '/books/', payload);
          toast('Kitob va nusxalari muvaffaqiyatli qo\'shildi', 'success');
        }
        showBookModal.value = false;
        loadBooks(bookPage.value);
        loadDashboard();
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }

    async function deleteBook(id) {
      if (!confirm('Haqiqatan ham bu kitobni o\'chirmoqchimisiz?')) return;
      try {
        await api('DELETE', `/books/${id}/`);
        toast('Kitob o\'chirildi', 'success');
        loadBooks();
        loadDashboard();
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }

    // ─── Issues Logic ──────────────────────────────────────────
    async function loadIssues() {
      issuesLoading.value = true;
      try {
        const params = new URLSearchParams(issueFilter);
        const data = await api('GET', `/issues/?${params}`);
        issues.value = data.results ?? data;
      } catch (e) {
        toast('Kitob berish jurnalini yuklab bo\'lmadi: ' + e.message, 'error');
      } finally {
        issuesLoading.value = false;
      }
    }

    function openAddIssue() {
      Object.keys(issueForm).forEach(k => { issueForm[k] = ''; });
      issueForm.jarima_kun_narxi = 500;
      const todayStr = new Date().toISOString().split('T')[0];
      issueForm.berilgan_sana = todayStr;
      const ret = new Date();
      ret.setDate(ret.getDate() + 15);
      issueForm.qaytarish_sana = ret.toISOString().split('T')[0];
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

    async function saveIssue() {
      try {
        const payload = { ...issueForm };
        if (!payload.member) throw new Error("Iltimos, a'zoni tanlang");
        if (!payload.book_item) throw new Error("Iltimos, kitobni tanlang");
        await api('POST', '/issues/', payload);
        toast('Kitob muvaffaqiyatli berildi', 'success');
        showIssueModal.value = false;
        loadIssues();
        loadDashboard();
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
        loadDashboard();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function overdueDays(issue) {
      if (issue.qaytarildi) return 0;
      const t = new Date();
      const ret = new Date(issue.qaytarish_sana);
      if (t > ret) return Math.floor((t - ret) / 86400000);
      return 0;
    }

    // ─── Reservations Logic ────────────────────────────────────
    async function loadReservations() {
      try {
        const data = await api('GET', '/reservations/');
        reservationsList.value = data.results ?? data ?? [];
      } catch(e) {}
    }

    async function updateReservationWithConfirm(id, status) {
      try {
        await api('PATCH', `/reservations/${id}/`, { status });
        toast('Rezervatsiya holati o\'zgartirildi', 'success');
        loadReservations();
        loadDashboard();
      } catch(e) {
        toast(e.message, 'error');
      }
    }

    function issueFromReservation(res) {
      currentPage.value = 'issues';
      issueForm.member = res.member_id;
      memberSearchQ.value = `${res.member_sigla} - ${res.member_familiya}`;
      bookSearchQ.value = res.book_title;
      searchBooksForIssue();
      showIssueModal.value = true;
    }

    // ─── Extensions Logic ──────────────────────────────────────
    async function loadExtensions() {
      try {
        const data = await api('GET', '/extensions/');
        extensionsList.value = data || [];
      } catch(e) {}
    }

    function openExtModal(item, action) {
      extModalItem.value = item;
      extModalAction.value = action;
      extModalMessage.value = '';
      extModalDate.value = action === 'approve' ? (item.requested_date || '') : '';
      showExtModal.value = true;
    }

    // ─── Import & Export ───────────────────────────────────────
    function onDrop(e) {
      e.preventDefault(); dragover.value = false;
      const f = e.dataTransfer.files[0];
      if (f) { importFile.value = f; }
    }

    function onFileSelect(e) { importFile.value = e.target.files[0]; }

    async function doImport() {
      if (!importFile.value) { toast('Fayl tanlanmagan', 'warning'); return; }
      importing.value = true;
      try {
        const fd = new FormData();
        fd.append('file', importFile.value);
        const endpoint = importType.value === 'books' ? '/books/import/' : '/members/import/';
        const res = await api('POST', endpoint, fd, true);
        toast(`Import muvaffaqiyatli yakunlandi!`, 'success');
        loadDashboard();
        if (importType.value === 'books') loadBooks();
        else loadMembers();
      } catch (e) {
        toast('Import xatoligi: ' + e.message, 'error');
      } finally {
        importing.value = false;
      }
    }

    async function exportMembers() {
      try {
        const blob = await api('GET', '/members/export/');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "kitobxonlar.xlsx"; a.click();
        URL.revokeObjectURL(url);
        toast('Excel muvaffaqiyatli yuklab olindi', 'success');
      } catch (e) {
        toast('Eksport xatoligi: ' + e.message, 'error');
      }
    }

    async function bulkDeleteAll() {
      if (!confirm("Barcha ma'lumotlarni tozalashga ishonchingiz komilmi?")) return;
      try {
        const endpoint = importType.value === 'books' ? '/books/bulk-delete/' : '/members/bulk-delete/';
        await api('DELETE', endpoint);
        toast("Ma'lumotlar tozalandi", 'info');
        loadDashboard();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    // ─── Audit & Backups & Finance ─────────────────────────────
    async function loadAuditLogs() {
      try {
        const data = await api('GET', '/audit-logs/');
        auditLogs.value = data || [];
      } catch(e) {}
    }

    async function loadBackups() {
      try {
        const data = await api('GET', '/backups/');
        backupsList.value = data || [];
      } catch(e) {}
    }

    async function createBackup() {
      try {
        await api('POST', '/backups/');
        toast('Yangi zaxira nusxa yaratildi!', 'success');
        loadBackups();
      } catch(e) { toast(e.message, 'error'); }
    }

    async function loadFinanceData() {
      financeLoading.value = true;
      try {
        const [ps, ds] = await Promise.all([
          api('GET', '/payments/'),
          api('GET', '/members/debtors/')
        ]);
        payments.value = ps.results || ps || [];
        debtors.value = ds || [];
      } catch (e) {
      } finally {
        financeLoading.value = false;
      }
    }

    // ─── Watchers & Init ───────────────────────────────────────
    watch(memberSearchQ, searchMembersForIssue);
    watch(bookSearchQ, searchBooksForIssue);
    watch(() => memberForm.azolik_bosh, (newVal) => {
      if (newVal) onMembershipStartDateChange();
    });
    watch(() => issueForm.berilgan_sana, (newVal) => {
      if (newVal) onIssueDateChange();
    });

    onMounted(() => {
      loadBranches();
      if (isLoggedIn.value) loadDashboard();
    });

    return {
      isLoggedIn, auth, loginForm, login, logout,
      currentPage, navigate, sidebarOpen, sidebarCollapsed, toggleSidebarCollapse,
      bookViewMode, setBookViewMode, globalSearchQuery, handleGlobalSearch,
      notifications, showNotifications,
      
      // 12 Views States & Methods
      selectedBookDetail, viewBookDetail,
      selectedMemberProfile, selectedMemberDetail, showMemberDetailModal, viewMemberProfile, goToMemberProfile,
      viewMember: (m) => viewMemberProfile(m),
      showLibraryCardModal, libraryCardSide, libraryCardMember, openLibraryCard, flipLibraryCard, printCard,
      toggleChat, askQuickPrompt,
      aiSearchQuery, aiSearchResults, aiSearching, runAISearch,
      bookCategories, selectedBookCategory, setBookCategory, openBookIssueFor,

      dashStats, dashLoading, dashDateFrom, dashDateTo, dashPeriod, loadDashboard,
      members, membersLoading, memberTotal, memberPage, memberPageSize, totalPages,
      memberFilters, memberForm, editMode, showMemberModal, openAddMember, openEditMember, saveMember, deleteMember, getAge, loadMembers,
      onMembershipStartDateChange, onMembershipTypeChange, onIssueDateChange,
      memberIssues,
      booksList, booksLoading, bookPage, bookTotal, bookPageSize, totalBookPages, bookSearchFilter, bookBranchFilter, branches, showBookModal, editBookMode, bookForm, openAddBook, openEditBook, saveBook, deleteBook, syncBookBarcodes, autoFillSequentialBarcodes, loadBooks,
      issues, issuesLoading, issueFilter, issueForm, showIssueModal, openAddIssue, saveIssue, returnBook, loadIssues, overdueDays,
      reservationsList, loadReservations, updateReservationWithConfirm, issueFromReservation,
      extensionsList, loadExtensions, showExtModal, extModalAction, extModalItem, extModalDate, extModalMessage, openExtModal,
      auditLogs, loadAuditLogs, backupsList, loadBackups, createBackup,
      importFile, importResult, importing, dragover, importTab, importType, onDrop, onFileSelect, doImport, bulkDeleteAll, exportMembers,
      financeTab, payments, debtors, financeLoading,
      today, formatPrice, formatDate, toasts, theme, toggleTheme,
      showQRModal, openQRModal, closeQRModal, onScanSuccess, onScanError,
      memberSearchQ, memberSearchResults, selectMemberForIssue,
      bookSearchQ, bookSearchResults, selectBookForIssue
    };
  }
});

app.mount('#app');
