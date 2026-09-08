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

// ─── Multi-Language Translations (UZ, RU, EN) ────────────────
const TRANSLATIONS = {
  uz: {
    main_menu: "Asosiy menyu",
    dashboard: "Dashboard",
    books: "Kitoblar",
    members: "Kitobxonlar",
    issues: "Kitob Berish",
    reservations: "Rezervatsiyalar",
    ai_modules: "AI Modullari",
    ai_search: "AI Qidiruv",
    services_analysis: "Xizmatlar & Tahlil",
    extensions: "Muddat Uzaytirish",
    reports: "Hisobotlar",
    notifications: "Bildirishnomalar",
    finance: "Moliya",
    management: "Boshqaruv",
    excel_import: "Excel Import",
    audit_log: "Audit Log",
    backup: "Zaxira Nusxa",
    settings: "Sozlamalar",
    logout: "Chiqish",
    
    digital_library: "ELEKTRON KUTUBXONA",
    search_placeholder: "Kitob, muallif, kitobxon yoki mavzu bo'yicha qidiring...",
    qr_scanner: "📷 QR Skaner",
    administrator: "Administrator",
    operator: "Operator",
    save: "Saqlash",
    cancel: "Bekor qilish",
    search: "Qidirish",
    export: "Eksport",
    add: "Qo'shish",
    edit: "Tahrirlash",
    delete: "O'chirish",
    status: "Holati",
    actions: "Harakatlar",
    
    total_books: "Jami Kitoblar",
    active_members: "Faol Kitobxonlar",
    issued_books: "Berilgan Kitoblar",
    returned_books: "Qaytarilgan Kitoblar",
    pending_members: "Kutilayotgan A'zolar",
    overdue_books: "Muddati O'tgan",
    popular_books_chart: "Eng ko'p o'qilgan kitoblar",
    active_readers_chart: "Eng faol kitobxonlar reytingi",
    
    system_settings_title: "⚙️ Tizim Sozlamalari & Ko'rinish",
    system_settings_subtitle: "Platforma parametrlari, tizim tili va tashqi ko'rinish sozlamalari",
    interface_theme: "Interfeys mavzusi",
    theme_light: "Kunduzgi rejim (Light)",
    theme_dark: "Tungi rejim (Dark)",
    theme_auto: "Tizim rejimi (Auto)",
    general_params: "Umumiy parametrlar",
    library_name: "Kutubxona nomi",
    system_language: "Tizim tili",
    max_loan_days: "Kitob berishning maksimal muddati (kun)",
    daily_overdue_fine: "Kunlik kechikish jarimasi (so'm)",
    save_settings: "💾 Saqlash",
    settings_saved: "Sozlamalar muvaffaqiyatli saqlandi! Tizim tili yangilandi.",
    
    ai_search_title: "AI Aqlli Qidiruv & Semantik Tavsiyalar",
    ai_search_desc: "Kitob mazmuni, muallif, qahramonlar yoki mavzuni erkin tilda tasvirlang. AI mos asarlarni topib beradi.",
    ai_search_input_placeholder: "Masalan: Tibbiyotda kardiologiya yangiliklari yoki Navoiy g'azallari...",
    popular_topics: "Mashhur mavzular:",
    mode_semantic: "Semantik qidiruv",
    mode_semantic_desc: "Ma'no va g'oya bo'yicha",
    mode_qa: "Savol-javob",
    mode_qa_desc: "Kitobdan aniq javob olish",
    mode_recommend: "Tavsiya tizimi",
    mode_recommend_desc: "Shaxsiy qiziqishlarga mos",
    mode_summary: "Xulosa chiqarish",
    mode_summary_desc: "Katta kitoblarning sarasi",
    results_found: "ta kitob topildi",
    match_rate: "moslik",
    give_book: "📖 Kitob berish",
    view_detail: "Batafsil ko'rish →",
    available_copies: "ta nusxa mavjud",
    currently_borrowed: "Hozirda band",
    searching: "AI tahlil qilmoqda..."
  },
  ru: {
    main_menu: "Главное меню",
    dashboard: "Панель управления",
    books: "Книги",
    members: "Читатели",
    issues: "Выдача книг",
    reservations: "Бронирование",
    ai_modules: "Модули AI",
    ai_search: "AI Поиск",
    services_analysis: "Сервисы и аналитика",
    extensions: "Продление сроков",
    reports: "Отчеты",
    notifications: "Уведомления",
    finance: "Финансы",
    management: "Управление",
    excel_import: "Импорт Excel",
    audit_log: "Журнал аудита",
    backup: "Резервные копии",
    settings: "Настройки",
    logout: "Выход",
    
    digital_library: "ЭЛЕКТРОННАЯ БИБЛИОТЕКА",
    search_placeholder: "Поиск по названию, автору, читателю или теме...",
    qr_scanner: "📷 QR Сканер",
    administrator: "Администратор",
    operator: "Оператор",
    save: "Сохранить",
    cancel: "Отмена",
    search: "Поиск",
    export: "Экспорт",
    add: "Добавить",
    edit: "Редактировать",
    delete: "Удалить",
    status: "Статус",
    actions: "Действия",
    
    total_books: "Всего книг",
    active_members: "Активные читатели",
    issued_books: "Выданные книги",
    returned_books: "Возвращенные книги",
    pending_members: "Ожидающие заявки",
    overdue_books: "Просроченные книги",
    popular_books_chart: "Самые популярные книги",
    active_readers_chart: "Рейтинг самых активных читателей",
    
    system_settings_title: "⚙️ Системные настройки и внешний вид",
    system_settings_subtitle: "Параметры платформы, язык системы и темы оформления",
    interface_theme: "Тема интерфейса",
    theme_light: "Дневной режим (Light)",
    theme_dark: "Ночной режим (Dark)",
    theme_auto: "Системный режим (Auto)",
    general_params: "Общие параметры",
    library_name: "Название библиотеки",
    system_language: "Язык системы",
    max_loan_days: "Максимальный срок выдачи (дней)",
    daily_overdue_fine: "Штраф за день просрочки (сум)",
    save_settings: "💾 Сохранить",
    settings_saved: "Настройки успешно сохранены! Язык системы обновлен.",
    
    ai_search_title: "AI Умный поиск и семантические рекомендации",
    ai_search_desc: "Опишите содержание, автора, персонажей или тему своими словами. AI найдет подходящие произведения.",
    ai_search_input_placeholder: "Например: Новости кардиологии в медицине или газели Навои...",
    popular_topics: "Популярные темы:",
    mode_semantic: "Семантический поиск",
    mode_semantic_desc: "По смыслу и идее",
    mode_qa: "Вопрос-ответ",
    mode_qa_desc: "Точный ответ из книги",
    mode_recommend: "Система рекомендаций",
    mode_recommend_desc: "По личным интересам",
    mode_summary: "Краткие тезисы",
    mode_summary_desc: "Квинтэссенция больших книг",
    results_found: "книг найдено",
    match_rate: "соответствие",
    give_book: "📖 Выдать книгу",
    view_detail: "Подробнее →",
    available_copies: "экз. доступно",
    currently_borrowed: "В данный момент на руках",
    searching: "AI анализирует библиотеку..."
  },
  en: {
    main_menu: "Main Menu",
    dashboard: "Dashboard",
    books: "Books Catalog",
    members: "Readers",
    issues: "Book Loans",
    reservations: "Reservations",
    ai_modules: "AI Modules",
    ai_search: "AI Search",
    services_analysis: "Services & Analytics",
    extensions: "Due Extensions",
    reports: "Reports",
    notifications: "Notifications",
    finance: "Finance",
    management: "Management",
    excel_import: "Excel Import",
    audit_log: "Audit Log",
    backup: "Backups",
    settings: "Settings",
    logout: "Sign Out",
    
    digital_library: "DIGITAL LIBRARY",
    search_placeholder: "Search by title, author, reader, or topic...",
    qr_scanner: "📷 QR Scanner",
    administrator: "Administrator",
    operator: "Operator",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    export: "Export",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    status: "Status",
    actions: "Actions",
    
    total_books: "Total Books",
    active_members: "Active Readers",
    issued_books: "Borrowed Books",
    returned_books: "Returned Books",
    pending_members: "Pending Members",
    overdue_books: "Overdue Books",
    popular_books_chart: "Most Popular Books",
    active_readers_chart: "Top Active Readers",
    
    system_settings_title: "⚙️ System Settings & Appearance",
    system_settings_subtitle: "Platform parameters, language and interface theme",
    interface_theme: "Interface Theme",
    theme_light: "Light Mode",
    theme_dark: "Dark Mode",
    theme_auto: "System (Auto)",
    general_params: "General Parameters",
    library_name: "Library Name",
    system_language: "System Language",
    max_loan_days: "Maximum Loan Duration (days)",
    daily_overdue_fine: "Daily Overdue Fine (UZS)",
    save_settings: "💾 Save Settings",
    settings_saved: "Settings successfully saved! Language updated.",
    
    ai_search_title: "AI Smart Search & Semantic Recommendations",
    ai_search_desc: "Describe the content, author, characters, or topic freely. AI will find matching literature.",
    ai_search_input_placeholder: "e.g., Cardiology advances in medicine or Navoi ghazals...",
    popular_topics: "Popular topics:",
    mode_semantic: "Semantic Search",
    mode_semantic_desc: "By meaning and concept",
    mode_qa: "Question & Answer",
    mode_qa_desc: "Precise answers from books",
    mode_recommend: "Recommendation System",
    mode_recommend_desc: "Tailored to interests",
    mode_summary: "Key Summaries",
    mode_summary_desc: "Essence of large books",
    results_found: "books found",
    match_rate: "match",
    give_book: "📖 Issue Book",
    view_detail: "View details →",
    available_copies: "copies available",
    currently_borrowed: "Currently checked out",
    searching: "AI is analyzing library..."
  }
};

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

    function setTheme(m) {
      theme.value = m;
    }

    // Multi-Language Localization System
    const currentLang = ref(localStorage.getItem('system_lang') || 'uz');
    function t(key) {
      const dict = TRANSLATIONS[currentLang.value] || TRANSLATIONS.uz;
      return dict[key] || TRANSLATIONS.uz[key] || key;
    }
    const systemSettings = reactive({
      language: currentLang.value,
      libraryName: localStorage.getItem('system_lib_name') || "Samarqand viloyati Urgut tumani Axborot-kutubxona markazi",
      maxDays: parseInt(localStorage.getItem('system_max_days')) || 15,
      dailyFine: parseInt(localStorage.getItem('system_daily_fine')) || 500
    });

    function saveSystemSettings() {
      currentLang.value = systemSettings.language;
      localStorage.setItem('system_lang', currentLang.value);
      localStorage.setItem('system_lib_name', systemSettings.libraryName);
      localStorage.setItem('system_max_days', systemSettings.maxDays);
      localStorage.setItem('system_daily_fine', systemSettings.dailyFine);
      toast(t('settings_saved'), 'success');
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

    const aiSearchMode = ref('semantic');

    async function runAISearch(mode = null, customQ = null) {
      if (mode && typeof mode === 'string') {
        aiSearchMode.value = mode;
      }
      if (customQ && typeof customQ === 'string') {
        aiSearchQuery.value = customQ;
      }
      
      let q = aiSearchQuery.value.trim();
      if (!q && aiSearchMode.value === 'recommend') {
        q = "Eng yaxshi tavsiya etilgan kitoblar";
        aiSearchQuery.value = q;
      } else if (!q && aiSearchMode.value === 'summary') {
        q = "Kutubxonadagi asosiy durdona asarlar";
        aiSearchQuery.value = q;
      } else if (!q && aiSearchMode.value === 'qa') {
        q = "Kutubxona xizmatlari va kitoblar";
        aiSearchQuery.value = q;
      } else if (!q) {
        q = "Ommabop kitoblar";
        aiSearchQuery.value = q;
      }

      aiSearching.value = true;
      try {
        const res = await api('GET', `/ai/search/?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(aiSearchMode.value)}`);
        aiSearchResults.value = Array.isArray(res) ? res : (res.results || []);
        if (!aiSearchResults.value.length) {
          toast(t('results_found') + ': 0', 'warning');
        }
      } catch (e) {
        toast('AI qidiruvda xatolik: ' + e.message, 'error');
      } finally {
        aiSearching.value = false;
      }
    }

    function issueBookFromSearch(book) {
      if (!book) return;
      issueForm.book_name = book.title;
      if (book.items && book.items.length) {
        const avail = book.items.find(i => i.status === 'available');
        if (avail) issueForm.book_item = avail.id;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      issueForm.berilgan_sana = todayStr;
      const ret = new Date();
      ret.setDate(ret.getDate() + 15);
      issueForm.qaytarish_sana = ret.toISOString().split('T')[0];
      showIssueModal.value = true;
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
      
      // Multi-Language & Settings
      currentLang, t, systemSettings, saveSystemSettings,
      
      // 12 Views States & Methods
      selectedBookDetail, viewBookDetail,
      selectedMemberProfile, selectedMemberDetail, showMemberDetailModal, viewMemberProfile, goToMemberProfile,
      viewMember: (m) => viewMemberProfile(m),
      showLibraryCardModal, libraryCardSide, libraryCardMember, openLibraryCard, flipLibraryCard, printCard,
      toggleChat, askQuickPrompt,
      aiSearchQuery, aiSearchResults, aiSearching, aiSearchMode, runAISearch, issueBookFromSearch,
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
      today, formatPrice, formatDate, toasts, theme, toggleTheme, setTheme,
      showQRModal, openQRModal, closeQRModal, onScanSuccess, onScanError,
      memberSearchQ, memberSearchResults, selectMemberForIssue,
      bookSearchQ, bookSearchResults, selectBookForIssue
    };
  }
});

app.mount('#app');
