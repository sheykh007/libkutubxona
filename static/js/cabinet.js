const { createApp, ref, reactive, onMounted, nextTick } = Vue;

const API_BASE = '/api';

async function api(method, path, body = null) {
  const opts = { method, headers: {} };
  const memberId = localStorage.getItem('cabinet_member_id');
  if (memberId) {
    opts.headers['X-Member-ID'] = memberId;
  }
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const response = await fetch(API_BASE + path, opts);
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || e.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

const app = createApp({
  setup() {
    const isLoggedIn = ref(localStorage.getItem('cabinet_logged_in') === 'true');
    const member = ref(JSON.parse(localStorage.getItem('cabinet_member') || 'null'));
    
    // Auth
    const authTab = ref('login');
    const loginSigla = ref('');
    const loginPassword = ref('');
    const regForm = reactive({ familiya: '', telefon: '', jinsi: 'erkak', tugilgan_sana: '', yunalish: 'Talaba', yunalish_boshqa: '', telegram_username: '', password: '' });
    const loading = ref(false);
    const loginError = ref('');
    
    // Profile update
    const profileForm = reactive({ familiya: '', yunalish: '', telegram_username: '', password: '', passwordConfirm: '' });
    
    // Modals & State
    const reservations = ref([]);
    const showReserveModal = ref(false);
    const selectedBookForReserve = ref(null);
    const reserveForm = reactive({ date: '', notes: '' });

    const showExtensionModal = ref(false);
    const selectedIssueForExt = ref(null);
    const extForm = reactive({ requested_date: '', reason: '' });
    
    // Password reset state
    const showResetModal = ref(false);
    const resetStep = ref(1);
    const resetForm = reactive({ sigla: '', code: '', new_password: '' });
    
    // Toasts
    const toasts = ref([]);
    let toastId = 0;
    function toast(msg, type = 'info') {
      const id = ++toastId;
      toasts.value.push({ id, msg, type });
      setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 4000);
    }
    
    // Member Data
    const issueHistory = ref([]);
    const currentIssues = ref([]);
    
    // Catalog Data
    const catalogBooks = ref([]);
    const catalogLoading = ref(false);
    const catalogQuery = ref('');
    let searchTimer = null;
    
    async function login() {
      if (!loginSigla.value) return;
      loading.value = true;
      loginError.value = '';
      try {
        const res = await api('POST', '/cabinet/login/', { sigla: loginSigla.value, password: loginPassword.value });
        const found = res;
        if (found && !found.error) {
          // Block kutilmoqda users from logging in
          if (found.holati === 'kutilmoqda') {
            loginError.value = '⏳ Sizning a\'zolik so\'rovingiz hali admin tomonidan tasdiqlanmagan. Iltimos, kutib turing.';
            loading.value = false;
            return;
          }
          // Block faol_emas users
          if (found.holati === 'faol_emas') {
            loginError.value = '🚫 Sizning a\'zoligingiz to\'xtatilgan. Kutubxona bilan bog\'laning.';
            loading.value = false;
            return;
          }
          localStorage.setItem('cabinet_logged_in', 'true');
          localStorage.setItem('cabinet_member_id', found.id);
          localStorage.setItem('cabinet_member', JSON.stringify(found));
          member.value = found;
          isLoggedIn.value = true;
          initCabinet();
          loginPassword.value = '';
        } else {
          loginError.value = 'Bunday Sigla raqamli a\'zo topilmadi.';
        }
      } catch (e) {
        loginError.value = 'Tizim xatosi: ' + e.message;
      } finally {
        loading.value = false;
      }
    }
    
    const registerSuccess = ref(false);
    const registeredSigla = ref('');

    async function registerUser() {
      if (!regForm.familiya || !regForm.telefon) return;
      loading.value = true;
      loginError.value = '';
      try {
        const dataToSend = { ...regForm };
        if (dataToSend.yunalish === 'Boshqa') {
          dataToSend.yunalish = dataToSend.yunalish_boshqa;
        }
        
        const res = await api('POST', '/cabinet/register/', dataToSend);
        // Show pending approval screen — do NOT auto-login
        registeredSigla.value = res.sigla || '';
        registerSuccess.value = true;
        toast('So\'rovingiz yuborildi! Admin tasdiqlashini kuting.', 'success');
      } catch (e) {
        loginError.value = 'Xatolik: ' + e.message;
      } finally {
        loading.value = false;
      }
    }
    
    function logout() {
      localStorage.removeItem('cabinet_logged_in');
      localStorage.removeItem('cabinet_member_id');
      localStorage.removeItem('cabinet_member');
      isLoggedIn.value = false;
      member.value = null;
    }
    
    async function loadMemberData() {
      if (!member.value) return;
      try {
        const data = await api('GET', `/issues/?member=${member.value.id}`);
        const allIssues = data.results || data;
        issueHistory.value = allIssues;
        currentIssues.value = allIssues.filter(i => !i.qaytarildi);
        
        const resData = await api('GET', `/reservations/?member=${member.value.id}`);
        reservations.value = resData.results || resData;
      } catch (e) {
        console.error('Failed to load member data', e);
      }
    }
    
    async function loadCatalog() {
      catalogLoading.value = true;
      try {
        const q = encodeURIComponent(catalogQuery.value);
        const data = await api('GET', `/books/?q=${q}`);
        catalogBooks.value = data.results || data;
      } catch (e) {
        console.error(e);
      } finally {
        catalogLoading.value = false;
      }
    }
    
    function debouncedCatalogSearch() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        loadCatalog();
      }, 500);
    }
    
    function isLate(dateStr) {
      if (!dateStr) return false;
      const parts = dateStr.split('.');
      let d;
      if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      else d = new Date(dateStr);
      d.setHours(23, 59, 59, 999);
      return d < new Date();
    }

    function openExtensionModal(issue) {
      selectedIssueForExt.value = issue;
      extForm.requested_date = '';
      extForm.reason = '';
      showExtensionModal.value = true;
    }

    async function confirmExtension() {
      if (!selectedIssueForExt.value || !extForm.requested_date) return;
      try {
        await api('POST', '/extensions/', {
          issue_id: selectedIssueForExt.value.id,
          requested_date: extForm.requested_date,
          reason: extForm.reason
        });
        toast('So\'rov muvaffaqiyatli yuborildi', 'success');
        showExtensionModal.value = false;
      } catch (e) {
        toast(e.message, 'error');
      }
    }
    
    function openReserveModal(book) {
      selectedBookForReserve.value = book;
      reserveForm.date = '';
      reserveForm.notes = '';
      showReserveModal.value = true;
    }

    async function confirmReservation() {
      if (!selectedBookForReserve.value || !reserveForm.date) return;
      const combinedNotes = `Qachon olib ketasiz: ${reserveForm.date}\nIzoh: ${reserveForm.notes}`;
      try {
        await api('POST', '/reservations/', {
          book: selectedBookForReserve.value.id,
          member: member.value.id,
          notes: combinedNotes
        });
        toast('Kitob muvaffaqiyatli band qilindi!', 'success');
        showReserveModal.value = false;
        loadMemberData();
        loadCatalog();
      } catch (e) {
        toast('Xatolik: ' + e.message, 'error');
      }
    }
    
    async function saveSettings() {
      if (profileForm.password && profileForm.password !== profileForm.passwordConfirm) {
        toast('Parollar mos kelmadi!', 'error');
        return;
      }
      try {
        await api('PUT', `/cabinet/profile/${member.value.id}/`, profileForm);
        toast('Sozlamalar va Profil muvaffaqiyatli saqlandi!', 'success');
        member.value.familiya = profileForm.familiya;
        localStorage.setItem('cabinet_member', JSON.stringify(member.value));
        profileForm.password = '';
        profileForm.passwordConfirm = '';
      } catch (e) {
        toast(e.message, 'error');
      }
    }
    
    function openPasswordReset() {
      resetStep.value = 1;
      resetForm.sigla = loginSigla.value;
      resetForm.code = '';
      resetForm.new_password = '';
      showResetModal.value = true;
    }
    
    async function requestResetCode() {
      if (!resetForm.sigla) return;
      try {
        await api('POST', '/cabinet/password-reset-request/', { sigla: resetForm.sigla });
        resetStep.value = 2;
      } catch (e) {
        toast(e.message, 'error');
      }
    }
    
    async function confirmResetCode() {
      if (!resetForm.code || !resetForm.new_password) return;
      try {
        await api('POST', '/cabinet/password-reset-confirm/', {
          sigla: resetForm.sigla,
          code: resetForm.code,
          new_password: resetForm.new_password
        });
        toast('Parol muvaffaqiyatli tiklandi! Endi yangi parol bilan kiring.', 'success');
        showResetModal.value = false;
        loginSigla.value = resetForm.sigla;
        loginPassword.value = '';
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function renderQR() {
      const canvas = document.getElementById('qr-code');
      if (canvas && member.value) {
        const qrValue = `Ism: ${member.value.familiya}\nSigla: ${member.value.sigla}\nTelefon: ${member.value.telegram_id || ''}\nHolati: ${member.value.holati}`;
        new QRious({
          element: canvas,
          value: qrValue,
          size: 150,
          background: 'white',
          foreground: '#111827'
        });
      }
    }
    
    function downloadPDF() {
      const element = document.getElementById('library-card-element');
      const opt = {
        margin:       [0.2, 0.2, 0.2, 0.2],
        filename:     `Kitobxon_bileti_${member.value.sigla}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a5', orientation: 'landscape' }
      };
      
      // Temporarily adjust styles for better PDF output
      const originalBorder = element.style.border;
      const originalShadow = element.style.boxShadow;
      element.style.border = 'none';
      element.style.boxShadow = 'none';
      
      html2pdf().set(opt).from(element).save().then(() => {
        // Restore styles
        element.style.border = originalBorder;
        element.style.boxShadow = originalShadow;
      });
    }
    
    function initCabinet() {
      loadMemberData();
      loadCatalog();
      if (member.value) {
        profileForm.familiya = member.value.familiya || '';
        profileForm.yunalish = member.value.yunalish || '';
        profileForm.telegram_username = member.value.telegram_username || '';
      }
      nextTick(() => {
        renderQR();
      });
    }
    
    onMounted(() => {
      if (isLoggedIn.value) {
        initCabinet();
      }
    });
    
    return {
      isLoggedIn, member, authTab, regForm, loginSigla, loginPassword, loading, loginError,
      registerSuccess, registeredSigla,
      profileForm,
      login, registerUser, logout,
      toasts,
      issueHistory, currentIssues, reservations,
      catalogBooks, catalogLoading, catalogQuery, debouncedCatalogSearch,
      isLate,
      showExtensionModal, selectedIssueForExt, extForm, openExtensionModal, confirmExtension,
      showReserveModal, selectedBookForReserve, reserveForm, openReserveModal, confirmReservation,
      saveSettings, downloadPDF,
      showResetModal, resetStep, resetForm, openPasswordReset, requestResetCode, confirmResetCode
    };
  }
});

app.mount('#cabinet-app');
