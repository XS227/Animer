import { AMBASSADOR_STATUSES, LEAD_STATUSES, calculateAmbassadorTotals, currency, demoDb } from './data-store.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBERElRl3D5EHzKme6to5w2nTZFAFb8ySQ',
  authDomain: 'animer-ambassador-mvp.firebaseapp.com',
  projectId: 'animer-ambassador-mvp',
  storageBucket: 'animer-ambassador-mvp.firebasestorage.app',
  messagingSenderId: '793382601384',
  appId: '1:793382601384:web:539e5516ac484f9dc6789d'
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const authMessage = document.querySelector('#authMessage');
const DEFAULT_COMMISSION_RATE = 0.1;

const adminState = {
  leadStatusFilter: 'all',
  ambassadorFilter: 'all',
  pendingStatusLeadId: null
};

const ambassadorState = {
  leadFilter: 'all'
};

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function trackReferralFromUrl() {
  const url = new URL(window.location.href);
  const ref = (url.searchParams.get('ref') || '').trim().toUpperCase();
  const target = url.searchParams.get('target') || 'ambassador.html';

  if (!ref) return;

  demoDb.referralClicks.push({
    ambassadorId: ref,
    timestamp: new Date().toISOString(),
    ip: 'client-captured',
    userAgent: navigator.userAgent
  });

  setCookie('ref', ref, 90);
  window.location.replace(target);
}

function getFriendlyAuthError(error) {
  if (error?.code === 'auth/popup-closed-by-user') return 'Innlogging avbrutt.';
  if (error?.code === 'auth/popup-blocked') return 'Popup blokkert. Vi prøver redirect-innlogging.';
  if (error?.code === 'auth/unauthorized-domain') return 'Domenet er ikke whitelistet i Firebase Authentication.';
  if (error?.code === 'permission-denied') {
    return 'Innlogging feilet: Mangler tilgang til Firestore. Oppdater sikkerhetsregler for ambassadors-samlingen.';
  }
  return `Innlogging feilet: ${error?.message || 'Ukjent feil.'}`;
}

async function ensureAmbassadorProfile(user) {
  try {
    const ambassadorRef = doc(db, 'ambassadors', user.uid);
    const ambassadorSnap = await getDoc(ambassadorRef);

    if (!ambassadorSnap.exists()) {
      await setDoc(ambassadorRef, {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        status: 'pending',
        commissionRate: DEFAULT_COMMISSION_RATE,
        createdAt: serverTimestamp()
      });
    }

    return { profileReady: true };
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return { profileReady: false, error };
    }

    throw error;
  }
}

async function handleRedirectLoginResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return;
    const syncStatus = await ensureAmbassadorProfile(result.user);
    if (!syncStatus.profileReady) {
      setAuthMessage(`Innlogget som ${result.user.email}, men profil kunne ikke lagres (Firestore-regler).`);
      return;
    }
    setAuthMessage(`Innlogget som ${result.user.email}. Status: Pending (manuell godkjenning).`);
  } catch (error) {
    setAuthMessage(getFriendlyAuthError(error));
  }
}

window.loginWithGoogle = async (event) => {
  const button = event?.currentTarget;
  const provider = new GoogleAuthProvider();

  if (button instanceof HTMLButtonElement) button.disabled = true;

  try {
    const result = await signInWithPopup(auth, provider);
    const syncStatus = await ensureAmbassadorProfile(result.user);
    if (!syncStatus.profileReady) {
      setAuthMessage(`Innlogget som ${result.user.email}, men profil kunne ikke lagres (Firestore-regler).`);
      return;
    }
    setAuthMessage(`Innlogget som ${result.user.email}. Status: Pending (manuell godkjenning).`);
  } catch (error) {
    if (['auth/popup-blocked', 'auth/internal-error'].includes(error?.code)) {
      setAuthMessage('Popup feilet. Sender til Google redirect...');
      await signInWithRedirect(auth, provider);
      return;
    }
    setAuthMessage(getFriendlyAuthError(error));
  } finally {
    if (button instanceof HTMLButtonElement) button.disabled = false;
  }
};

function initNavbar() {
  const navToggle = document.querySelector('#navToggle');
  const sidebar = document.querySelector('.sidebar');
  if (!navToggle || !sidebar) return;

  navToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function createLead({ name, company, email }) {
  const emailKey = String(email || '').trim().toLowerCase();
  const existingLead = demoDb.leads.find((lead) => lead.email.toLowerCase() === emailKey);

  if (existingLead) {
    return { created: false, reason: 'Lead finnes allerede. Ingen ny provisjon opprettes.' };
  }

  const ambassadorId = getCookie('ref') || null;
  const newLead = {
    id: `lead-${Date.now()}`,
    name,
    company,
    email,
    ambassadorId,
    status: 'Open',
    dealValue: 0,
    commissionAmount: 0,
    createdAt: new Date().toISOString()
  };

  demoDb.leads.unshift(newLead);
  return {
    created: true,
    lead: newLead
  };
}

function getFilteredLeads() {
  return demoDb.leads.filter((lead) => {
    const statusOk = adminState.leadStatusFilter === 'all' || lead.status === adminState.leadStatusFilter;
    const ambassador = lead.ambassadorId || 'Ingen';
    const ambassadorOk = adminState.ambassadorFilter === 'all' || ambassador === adminState.ambassadorFilter;
    return statusOk && ambassadorOk;
  });
}

function renderAdmin() {
  const leadBody = document.querySelector('#adminLeadBody');
  const ambassadorBody = document.querySelector('#adminAmbassadorBody');
  const payoutBody = document.querySelector('#adminPayoutBody');
  const leadEmptyState = document.querySelector('#leadEmptyState');
  if (!leadBody || !ambassadorBody || !payoutBody) return;

  const filteredLeads = getFilteredLeads();

  leadBody.innerHTML = filteredLeads
    .map((lead) => {
      const ambassadorLabel = lead.ambassadorId || 'Ingen';
      return `
        <tr>
          <td>${lead.company}</td>
          <td>${ambassadorLabel}</td>
          <td><span class="badge info">${lead.status}</span></td>
          <td><input type="number" class="deal-input" data-id="${lead.id}" min="0" value="${lead.dealValue || 0}" ${lead.status === 'Won' ? '' : 'disabled'} /></td>
          <td>${currency(lead.commissionAmount || 0)}</td>
          <td><button class="btn-secondary open-status-modal" data-id="${lead.id}" type="button">Endre status</button></td>
        </tr>`;
    })
    .join('');

  if (leadEmptyState) leadEmptyState.hidden = filteredLeads.length > 0;

  ambassadorBody.innerHTML = demoDb.ambassadors
    .map((ambassador) => {
      const totals = calculateAmbassadorTotals(ambassador.id);
      const statusBadge = ambassador.status === 'Active' ? 'ok' : ambassador.status === 'Paused' ? 'paused' : 'pending';
      const approveButton = ambassador.status === 'Pending'
        ? `<button class="btn-primary approve-ambassador" data-id="${ambassador.id}" type="button">Godkjenn</button>`
        : '<span class="muted">-</span>';

      return `
      <tr>
        <td>${ambassador.name}</td>
        <td>
          <select class="ambassador-status" data-id="${ambassador.id}">
            ${AMBASSADOR_STATUSES.map((status) => `<option value="${status}" ${status === ambassador.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
          <span class="badge ${statusBadge}">${ambassador.status}</span>
        </td>
        <td>${totals.leads}</td>
        <td>${currency(totals.revenue)}</td>
        <td>${currency(totals.earned)}</td>
        <td>${approveButton}</td>
      </tr>`;
    })
    .join('');

  payoutBody.innerHTML = demoDb.ambassadors
    .map((ambassador) => {
      const totals = calculateAmbassadorTotals(ambassador.id);
      return `
      <tr>
        <td>${ambassador.name}</td>
        <td>${currency(totals.earned)}</td>
        <td>${currency(totals.paidOut)}</td>
        <td>${currency(totals.available)}</td>
        <td><button class="btn-ghost mark-paid" data-id="${ambassador.id}">Marker utbetalt</button></td>
      </tr>`;
    })
    .join('');
}

function openStatusModal(leadId) {
  const backdrop = document.querySelector('#statusModalBackdrop');
  const select = document.querySelector('#statusModalSelect');
  const message = document.querySelector('#statusModalMessage');
  const lead = demoDb.leads.find((item) => item.id === leadId);
  if (!backdrop || !select || !lead) return;

  adminState.pendingStatusLeadId = leadId;
  select.innerHTML = LEAD_STATUSES.map((status) => `<option value="${status}" ${status === lead.status ? 'selected' : ''}>${status}</option>`).join('');
  if (message) message.textContent = `Endre status for ${lead.company}.`;
  backdrop.classList.add('open');
}

function closeStatusModal() {
  const backdrop = document.querySelector('#statusModalBackdrop');
  adminState.pendingStatusLeadId = null;
  backdrop?.classList.remove('open');
}

function initAdminPage() {
  const leadBody = document.querySelector('#adminLeadBody');
  const ambassadorBody = document.querySelector('#adminAmbassadorBody');
  const payoutBody = document.querySelector('#adminPayoutBody');
  const leadStatusFilter = document.querySelector('#leadStatusFilter');
  const leadAmbassadorFilter = document.querySelector('#leadAmbassadorFilter');
  const closeModalButton = document.querySelector('#closeStatusModal');
  const saveModalButton = document.querySelector('#saveStatusModal');
  const modalSelect = document.querySelector('#statusModalSelect');
  const modalBackdrop = document.querySelector('#statusModalBackdrop');

  if (!leadBody || !ambassadorBody || !payoutBody) return;

  if (leadAmbassadorFilter) {
    const options = ['all', ...new Set(demoDb.leads.map((lead) => lead.ambassadorId || 'Ingen'))];
    leadAmbassadorFilter.innerHTML = options.map((option) => {
      const label = option === 'all' ? 'Alle' : option;
      return `<option value="${option}">${label}</option>`;
    }).join('');
  }

  renderAdmin();

  leadStatusFilter?.addEventListener('change', (event) => {
    adminState.leadStatusFilter = event.target.value;
    renderAdmin();
  });

  leadAmbassadorFilter?.addEventListener('change', (event) => {
    adminState.ambassadorFilter = event.target.value;
    renderAdmin();
  });

  leadBody.addEventListener('change', (event) => {
    const dealInput = event.target.closest('.deal-input');
    if (!dealInput) return;

    const lead = demoDb.leads.find((item) => item.id === dealInput.dataset.id);
    lead.dealValue = Number(dealInput.value || 0);
    lead.commissionAmount = Math.round(lead.dealValue * DEFAULT_COMMISSION_RATE);
    renderAdmin();
  });

  leadBody.addEventListener('click', (event) => {
    const modalButton = event.target.closest('.open-status-modal');
    if (!modalButton) return;
    openStatusModal(modalButton.dataset.id);
  });

  ambassadorBody.addEventListener('change', (event) => {
    const statusSelect = event.target.closest('.ambassador-status');
    if (!statusSelect) return;
    const ambassador = demoDb.ambassadors.find((item) => item.id === statusSelect.dataset.id);
    ambassador.status = statusSelect.value;
    renderAdmin();
  });

  ambassadorBody.addEventListener('click', (event) => {
    const approveButton = event.target.closest('.approve-ambassador');
    if (!approveButton) return;
    const ambassador = demoDb.ambassadors.find((item) => item.id === approveButton.dataset.id);
    ambassador.status = 'Active';
    renderAdmin();
  });

  payoutBody.addEventListener('click', (event) => {
    const paidButton = event.target.closest('.mark-paid');
    if (!paidButton) return;
    const ambassadorId = paidButton.dataset.id;
    const totals = calculateAmbassadorTotals(ambassadorId);
    if (totals.available <= 0) return;
    demoDb.payouts.push({ ambassadorId, paidOut: totals.available });
    renderAdmin();
  });

  closeModalButton?.addEventListener('click', closeStatusModal);
  modalBackdrop?.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) closeStatusModal();
  });

  saveModalButton?.addEventListener('click', () => {
    if (!adminState.pendingStatusLeadId || !modalSelect) return;
    const lead = demoDb.leads.find((item) => item.id === adminState.pendingStatusLeadId);
    lead.status = modalSelect.value;
    if (lead.status !== 'Won') {
      lead.dealValue = 0;
      lead.commissionAmount = 0;
    }
    closeStatusModal();
    renderAdmin();
  });
}

function getAmbassadorLeads(ambassadorId) {
  const leads = demoDb.leads.filter((lead) => lead.ambassadorId === ambassadorId);
  if (ambassadorState.leadFilter === 'all') return leads;
  return leads.filter((lead) => lead.status === ambassadorState.leadFilter);
}

function renderAmbassadorDashboard() {
  const totalLeads = document.querySelector('#metricLeads');
  const totalWon = document.querySelector('#metricWon');
  const totalCommission = document.querySelector('#metricCommission');
  const availablePayout = document.querySelector('#metricAvailable');
  const leadList = document.querySelector('#leadList');
  const emptyState = document.querySelector('#ambassadorEmptyState');

  if (!totalLeads || !totalWon || !totalCommission || !availablePayout || !leadList) return;

  const ambassadorId = 'AMB123';
  const totals = calculateAmbassadorTotals(ambassadorId);
  const leads = getAmbassadorLeads(ambassadorId);

  totalLeads.textContent = String(totals.leads);
  totalWon.textContent = String(totals.won);
  totalCommission.textContent = currency(totals.earned);
  availablePayout.textContent = currency(totals.available);

  leadList.innerHTML = leads
    .map(
      (lead) => `<tr><td>${lead.company}</td><td>${lead.status}</td><td>${currency(lead.dealValue)}</td><td>${currency(lead.commissionAmount)}</td></tr>`
    )
    .join('');

  if (emptyState) emptyState.hidden = leads.length > 0;

  const copyBtn = document.querySelector('#copyLink');
  copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText('https://animer.no/a/AMB123');
    copyBtn.textContent = 'Lenke kopiert ✓';
    setTimeout(() => {
      copyBtn.textContent = 'Kopier lenke';
    }, 1200);
  });
}

function initAmbassadorTabs() {
  const tabs = document.querySelector('#ambassadorLeadTabs');
  if (!tabs) return;

  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab-btn');
    if (!tab) return;
    ambassadorState.leadFilter = tab.dataset.filter;
    tabs.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
    tab.classList.add('active');
    renderAmbassadorDashboard();
  });
}

function initLandingPage() {
  const leadForm = document.querySelector('#leadForm');
  const leadMessage = document.querySelector('#leadMessage');
  if (!leadForm || !leadMessage) return;

  const refCookie = getCookie('ref');
  const attributionElement = document.querySelector('#attributionInfo');
  if (attributionElement) {
    attributionElement.textContent = refCookie
      ? `Aktiv attribution-cookie: ${refCookie} (first click, 90 dager)`
      : 'Ingen attribution-cookie funnet.';
  }

  leadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);
    const payload = {
      name: String(formData.get('name') || ''),
      company: String(formData.get('company') || ''),
      email: String(formData.get('email') || '')
    };

    const result = createLead(payload);
    if (!result.created) {
      leadMessage.textContent = result.reason;
      leadMessage.style.color = 'var(--color-warning)';
      return;
    }

    leadMessage.textContent = `Lead lagret. ambassadorId=${result.lead.ambassadorId || 'null'} status=open`;
    leadMessage.style.color = 'var(--color-success)';
    leadForm.reset();
  });
}

trackReferralFromUrl();
handleRedirectLoginResult();
initNavbar();
initLandingPage();
initAdminPage();
initAmbassadorTabs();
renderAmbassadorDashboard();

const loginGoogleBtn = document.querySelector('#loginGoogle');
const registerGoogleBtn = document.querySelector('#registerGoogle');
const loginFacebookBtn = document.querySelector('#loginFacebook');
const registerFacebookBtn = document.querySelector('#registerFacebook');

loginGoogleBtn?.addEventListener('click', window.loginWithGoogle);
registerGoogleBtn?.addEventListener('click', window.loginWithGoogle);

const facebookMessage = () => setAuthMessage('Facebook er ikke med i MVP. Bruk Google-login.');
loginFacebookBtn?.addEventListener('click', facebookMessage);
registerFacebookBtn?.addEventListener('click', facebookMessage);
