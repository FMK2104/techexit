const state = {
  systems: [],
  users: [],
  authUser: null,
  selectedSystemId: null,
  activeTab: 'systems',
  tableSort: { key: 'name', direction: 'asc' },
  graphEdges: [],
  graphMode: 'focus',
  countryOptions: [],
  countryCodeByName: {},
  alternativesById: {},
  dependenciesById: {},
  editingAlternativeId: null,
  editingDependencyId: null,
  editingDependencySourceId: null
};

const FALLBACK_COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'
];

const LABELS = {
  criticality: { critical: 'Kritisk', high: 'Høj', medium: 'Mellem', low: 'Lav' },
  replacementPriority: { high: 'Høj', medium: 'Mellem', low: 'Lav' },
  status: { active: 'Aktiv', phase_out: 'Udfases', planned: 'Planlagt', retired: 'Nedlagt' },
  dependencyType: {
    api: 'API',
    file_transfer: 'Filoverførsel',
    sso: 'Fælles login (SSO)',
    database: 'Database',
    manual_process: 'Manuel proces',
    other: 'Andet'
  }
};

const ROLE_LABELS = {
  admin: 'Administrator',
  editor: 'Redaktør'
};

const SORT_ORDER = {
  criticality: { critical: 4, high: 3, medium: 2, low: 1 },
  replacement_priority: { high: 3, medium: 2, low: 1 },
  status: { active: 4, planned: 3, phase_out: 2, retired: 1 }
};

const COUNTRY_CODE_ALIASES = {
  usa: 'US',
  us: 'US',
  'united states': 'US',
  'united states of america': 'US',
  storbritannien: 'GB',
  england: 'GB',
  uk: 'GB',
  'united kingdom': 'GB'
};

const el = {
  authCard: document.getElementById('auth-card'),
  appLayout: document.getElementById('app-layout'),
  loginForm: document.getElementById('login-form'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  sessionMeta: document.getElementById('session-meta'),
  sessionUser: document.getElementById('session-user'),
  sessionRole: document.getElementById('session-role'),
  logoutBtn: document.getElementById('logout-btn'),
  topTabs: document.getElementById('top-tabs'),
  topTabButtons: document.querySelectorAll('#top-tabs .top-tab'),
  topTabUsers: document.querySelector('#top-tabs .top-tab[data-tab="users"]'),
  quickCreateForm: document.getElementById('quick-create-form'),
  quickSystemName: document.getElementById('quick-system-name'),
  overviewCard: document.getElementById('overview-card'),
  dashboardCard: document.getElementById('dashboard-card'),
  graphCard: document.getElementById('graph-card'),
  usersCard: document.getElementById('users-card'),
  profileCard: document.getElementById('profile-card'),
  usersAccessDenied: document.getElementById('users-access-denied'),
  profileUsername: document.getElementById('profile-username'),
  profileRole: document.getElementById('profile-role'),
  kpiTotalSystems: document.getElementById('kpi-total-systems'),
  kpiTotalDependencies: document.getElementById('kpi-total-dependencies'),
  kpiCriticalSystems: document.getElementById('kpi-critical-systems'),
  kpiIsolatedSystems: document.getElementById('kpi-isolated-systems'),
  chartCountryOrigin: document.getElementById('chart-country-origin'),
  chartCriticalityRing: document.getElementById('chart-criticality-ring'),
  chartCriticalityLegend: document.getElementById('chart-criticality-legend'),
  chartStatus: document.getElementById('chart-status'),
  chartDependencyLoad: document.getElementById('chart-dependency-load'),
  systemsTableHead: document.querySelector('#systems-table thead'),
  systemsTableBody: document.querySelector('#systems-table tbody'),
  detailCard: document.getElementById('system-detail-card'),
  showDependenciesBtn: document.getElementById('show-dependencies'),
  showOverviewBtn: document.getElementById('show-overview'),
  selectedSystemName: document.getElementById('selected-system-name'),
  systemForm: document.getElementById('system-form'),
  deleteSystemBtn: document.getElementById('delete-system'),
  systemId: document.getElementById('system-id'),
  alternativeForm: document.getElementById('alternative-form'),
  altId: document.getElementById('alt-id'),
  altSubmit: document.getElementById('alt-submit'),
  altCancel: document.getElementById('alt-cancel'),
  alternativesList: document.getElementById('alternatives-list'),
  dependencyForm: document.getElementById('dependency-form'),
  depId: document.getElementById('dep-id'),
  depSubmit: document.getElementById('dep-submit'),
  depCancel: document.getElementById('dep-cancel'),
  dependencyTarget: document.getElementById('dep-target'),
  dependencyNewTargetName: document.getElementById('dep-new-target-name'),
  dependenciesList: document.getElementById('dependencies-list'),
  systemGraph: document.getElementById('system-graph'),
  graphModeFocus: document.getElementById('graph-mode-focus'),
  graphModeAll: document.getElementById('graph-mode-all'),
  originCountry: document.getElementById('origin_country'),
  originCountryOptions: document.getElementById('origin-country-options'),
  altCountry: document.getElementById('alt-country'),
  altCountryOptions: document.getElementById('alt-country-options'),
  userAdminPanel: document.getElementById('user-admin-panel'),
  createUserForm: document.getElementById('create-user-form'),
  usersTableBody: document.querySelector('#users-table tbody'),
  newUserUsername: document.getElementById('new-user-username'),
  newUserPassword: document.getElementById('new-user-password'),
  newUserRole: document.getElementById('new-user-role'),
  changePasswordForm: document.getElementById('change-password-form'),
  currentPassword: document.getElementById('current-password'),
  newPassword: document.getElementById('new-password'),
  confirmPassword: document.getElementById('confirm-password'),
  toast: document.getElementById('toast')
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function flagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function getCountryCodes() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const values = Intl.supportedValuesOf('region').filter((code) => /^[A-Z]{2}$/.test(code));
      if (values.length > 0) return values;
    }
  } catch (_error) {
    // fallback below
  }
  return FALLBACK_COUNTRY_CODES;
}

function buildCountryOptions() {
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['da', 'en'], { type: 'region' })
    : null;

  state.countryOptions = getCountryCodes()
    .map((code) => {
      const name = displayNames?.of(code) || code;
      return {
        code,
        name,
        label: `${flagEmoji(code)} ${name}`,
        search: `${name} ${code}`.toLowerCase()
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'da'));

  state.countryCodeByName = {};
  for (const country of state.countryOptions) {
    state.countryCodeByName[country.name.trim().toLowerCase()] = country.code;
  }
}

function getCountryFlagByName(countryName) {
  const name = String(countryName || '').trim();
  if (!name || ['ukendt', 'unknown'].includes(name.toLowerCase())) return '';
  const key = name.toLowerCase();
  const fromMap = state.countryCodeByName[key];
  if (fromMap) return flagEmoji(fromMap);
  if (COUNTRY_CODE_ALIASES[key]) return flagEmoji(COUNTRY_CODE_ALIASES[key]);
  if (/^[A-Z]{2}$/.test(name)) return flagEmoji(name);
  return '';
}

function filterCountries(query) {
  const q = query.trim().toLowerCase();
  if (!q) return state.countryOptions;
  return state.countryOptions.filter((country) => country.search.includes(q));
}

function renderCountryDropdown(listEl, countries, activeIndex) {
  if (countries.length === 0) {
    listEl.innerHTML = '<div class="combo-empty">Ingen lande fundet</div>';
    listEl.classList.remove('hidden');
    return;
  }

  listEl.innerHTML = countries
    .map((country, index) => {
      const activeClass = index === activeIndex ? ' is-active' : '';
      return `<button type="button" class="combo-option${activeClass}" data-index="${index}">${escapeHtml(country.label)}</button>`;
    })
    .join('');
  listEl.classList.remove('hidden');
}

function setupCountryCombobox(inputEl, listEl) {
  let visibleCountries = [];
  let activeIndex = 0;

  const close = () => {
    listEl.classList.add('hidden');
  };

  const open = () => {
    visibleCountries = filterCountries(inputEl.value).slice(0, 80);
    activeIndex = 0;
    renderCountryDropdown(listEl, visibleCountries, activeIndex);
  };

  const updateActive = (nextIndex) => {
    if (visibleCountries.length === 0) return;
    const max = visibleCountries.length - 1;
    activeIndex = Math.min(Math.max(nextIndex, 0), max);
    renderCountryDropdown(listEl, visibleCountries, activeIndex);
  };

  const commit = (country) => {
    if (!country) return;
    inputEl.value = country.name;
    close();
  };

  inputEl.addEventListener('focus', open);
  inputEl.addEventListener('input', open);

  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (listEl.classList.contains('hidden')) {
        open();
      } else {
        updateActive(activeIndex + 1);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (listEl.classList.contains('hidden')) {
        open();
      } else {
        updateActive(activeIndex - 1);
      }
      return;
    }

    if (event.key === 'Enter' && !listEl.classList.contains('hidden')) {
      event.preventDefault();
      commit(visibleCountries[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      close();
    }
  });

  listEl.addEventListener('mousedown', (event) => {
    const btn = event.target.closest('button[data-index]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    commit(visibleCountries[index]);
    event.preventDefault();
  });

  inputEl.addEventListener('blur', () => {
    setTimeout(close, 120);
  });
}

function setAuthenticatedUi(user) {
  state.authUser = user || null;
  const authenticated = Boolean(state.authUser);
  el.authCard.classList.toggle('hidden', authenticated);
  el.appLayout.classList.toggle('hidden', !authenticated);
  el.topTabs.classList.toggle('hidden', !authenticated);
  el.sessionMeta.classList.toggle('hidden', !authenticated);

  if (authenticated) {
    el.sessionUser.textContent = state.authUser.username;
    el.sessionRole.textContent = ROLE_LABELS[state.authUser.role] || state.authUser.role;
    if (el.profileUsername) el.profileUsername.textContent = state.authUser.username;
    if (el.profileRole) el.profileRole.textContent = ROLE_LABELS[state.authUser.role] || state.authUser.role;
  } else {
    el.sessionUser.textContent = '';
    el.sessionRole.textContent = '';
    if (el.profileUsername) el.profileUsername.textContent = '-';
    if (el.profileRole) el.profileRole.textContent = '-';
    state.selectedSystemId = null;
    state.users = [];
    resetAlternativeForm();
    resetDependencyForm();
    if (el.changePasswordForm) {
      el.changePasswordForm.reset();
    }
    if (el.usersTableBody) {
      el.usersTableBody.innerHTML = '';
    }
    setFocusOnSelectedSystem(false);
    el.detailCard.classList.add('hidden');
    state.activeTab = 'systems';
    document.body.setAttribute('data-active-tab', 'systems');
    updateTopTabs();
  }

  updateAdminPanelVisibility();
}

function updateAdminPanelVisibility() {
  const isAdmin = state.authUser?.role === 'admin';
  if (el.topTabUsers) {
    el.topTabUsers.classList.toggle('hidden', !isAdmin);
  }
  if (el.userAdminPanel) {
    el.userAdminPanel.classList.toggle('hidden', !isAdmin);
  }
  if (el.usersAccessDenied) {
    el.usersAccessDenied.classList.toggle('hidden', isAdmin);
  }

  if (!isAdmin && state.activeTab === 'users') {
    setActiveTab('profile');
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('da-DK', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function renderUsersTable() {
  if (!el.usersTableBody) return;
  el.usersTableBody.innerHTML = '';

  if (state.users.length === 0) {
    el.usersTableBody.innerHTML = '<tr><td colspan="5">Ingen brugere fundet.</td></tr>';
    return;
  }

  for (const user of state.users) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(ROLE_LABELS[user.role] || user.role)}</td>
      <td>${user.is_active ? 'Aktiv' : 'Inaktiv'}</td>
      <td>${escapeHtml(formatDateTime(user.last_login_at))}</td>
      <td>${escapeHtml(formatDateTime(user.created_at))}</td>
    `;
    el.usersTableBody.appendChild(tr);
  }
}

async function loadUsers() {
  if (state.authUser?.role !== 'admin') {
    state.users = [];
    renderUsersTable();
    return;
  }

  state.users = await api('/users');
  renderUsersTable();
}

async function handleUnauthorized() {
  if (state.authUser) {
    notify('Session udløbet. Log ind igen.');
  }
  setAuthenticatedUi(null);
}

async function api(path, options = {}) {
  const { skipAuthHandling = false, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...fetchOptions,
    headers
  });

  if (response.status === 401 && !skipAuthHandling) {
    await handleUnauthorized();
    throw new Error('Du skal logge ind');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function notify(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 1800);
}

function formatNumber(value) {
  return new Intl.NumberFormat('da-DK').format(Number(value) || 0);
}

function formatPercent(value) {
  return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 }).format(value);
}

function getSystemPayloadFromForm() {
  const payload = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    vendor: document.getElementById('vendor').value.trim(),
    origin_country: el.originCountry.value.trim(),
    hosting_model: document.getElementById('hosting_model').value.trim(),
    business_owner: document.getElementById('business_owner').value.trim() || null,
    technical_owner: document.getElementById('technical_owner').value.trim() || null,
    criticality: document.getElementById('criticality').value,
    data_classification: document.getElementById('data_classification').value,
    replacement_priority: document.getElementById('replacement_priority').value,
    status: document.getElementById('status').value,
    annual_cost_eur: document.getElementById('annual_cost_eur').value || null,
    contract_end_date: document.getElementById('contract_end_date').value || null,
    notes: document.getElementById('notes').value.trim() || null
  };

  if (payload.annual_cost_eur !== null) payload.annual_cost_eur = Number(payload.annual_cost_eur);
  return payload;
}

function populateSystemForm(system) {
  el.systemId.value = system.id;
  document.getElementById('name').value = system.name || '';
  document.getElementById('category').value = system.category || '';
  document.getElementById('vendor').value = system.vendor || '';
  el.originCountry.value = system.origin_country || '';
  document.getElementById('hosting_model').value = system.hosting_model || '';
  document.getElementById('business_owner').value = system.business_owner || '';
  document.getElementById('technical_owner').value = system.technical_owner || '';
  document.getElementById('criticality').value = system.criticality || 'medium';
  document.getElementById('data_classification').value = system.data_classification || 'internal';
  document.getElementById('replacement_priority').value = system.replacement_priority || 'medium';
  document.getElementById('status').value = system.status || 'active';
  document.getElementById('annual_cost_eur').value = system.annual_cost_eur ?? '';
  document.getElementById('contract_end_date').value = system.contract_end_date || '';
  document.getElementById('notes').value = system.notes || '';
}

function getSortValue(system, key) {
  const value = system[key];
  if (value == null) return '';

  if (key === 'criticality' || key === 'replacement_priority' || key === 'status') {
    return SORT_ORDER[key][String(value)] || 0;
  }

  return String(value).toLowerCase();
}

function compareSystems(a, b) {
  const { key, direction } = state.tableSort;
  const av = getSortValue(a, key);
  const bv = getSortValue(b, key);

  let result;
  if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), 'da', { numeric: true, sensitivity: 'base' });
  }

  if (result === 0) {
    result = String(a.name || '').localeCompare(String(b.name || ''), 'da', { numeric: true, sensitivity: 'base' });
  }

  return direction === 'asc' ? result : -result;
}

function renderTableSortHeaders() {
  const headers = el.systemsTableHead.querySelectorAll('th[data-sort]');
  for (const th of headers) {
    const key = th.dataset.sort;
    th.classList.add('sortable');
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (key === state.tableSort.key) {
      th.classList.add(state.tableSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  }
}

function renderSystemsTable() {
  el.systemsTableBody.innerHTML = '';
  const systemsForTable = [...state.systems].sort(compareSystems);

  for (const system of systemsForTable) {
    const tr = document.createElement('tr');
    tr.dataset.id = String(system.id);
    tr.className = 'system-row';
    const selected = state.selectedSystemId === system.id;
    if (selected) tr.classList.add('selected');
    const flag = getCountryFlagByName(system.origin_country);
    const originCountry = escapeHtml(system.origin_country || 'Ukendt');
    const businessOwner = escapeHtml(system.business_owner || '-');
    const category = escapeHtml(system.category || '-');
    const vendor = escapeHtml(system.vendor || '-');
    tr.innerHTML = `
      <td>${escapeHtml(system.name)}</td>
      <td>${category}</td>
      <td>${vendor}</td>
      <td>${businessOwner}</td>
      <td>${LABELS.criticality[system.criticality] || system.criticality}</td>
      <td>${LABELS.replacementPriority[system.replacement_priority] || system.replacement_priority || '-'}</td>
      <td class="country-cell"><span class="country-content">${flag ? `<span class="country-flag">${flag}</span>` : ''}<span>${originCountry}</span></span></td>
      <td>${LABELS.status[system.status] || system.status}</td>
    `;
    el.systemsTableBody.appendChild(tr);
  }

  renderTableSortHeaders();
  renderSystemGraph();
}

function renderBarChart(targetEl, entries, options = {}) {
  if (!targetEl) return;
  const {
    emptyText = 'Ingen data endnu',
    totalForPercent = null,
    valueFormatter = null
  } = options;
  const validEntries = entries.filter((entry) => Number(entry.value) > 0);

  if (validEntries.length === 0) {
    targetEl.innerHTML = `<p class="chart-empty">${emptyText}</p>`;
    return;
  }

  const maxValue = Math.max(...validEntries.map((entry) => Number(entry.value)), 1);
  targetEl.innerHTML = validEntries
    .map((entry) => {
      const width = Math.max((Number(entry.value) / maxValue) * 100, 2);
      let valueLabel = formatNumber(entry.value);
      if (typeof valueFormatter === 'function') {
        valueLabel = valueFormatter(entry);
      } else if (totalForPercent && totalForPercent > 0) {
        valueLabel = `${formatNumber(entry.value)} (${formatPercent((Number(entry.value) / totalForPercent) * 100)}%)`;
      }

      return `
        <div class="chart-row">
          <span class="chart-label" title="${escapeHtml(entry.label)}">${escapeHtml(entry.label)}</span>
          <span class="chart-bar"><span class="chart-bar-fill" style="width: ${width.toFixed(1)}%"></span></span>
          <span class="chart-value">${escapeHtml(valueLabel)}</span>
        </div>
      `;
    })
    .join('');
}

function renderDashboard() {
  const systems = state.systems || [];
  const edges = state.graphEdges || [];
  const systemCount = systems.length;
  const dependencyCount = edges.length;
  const criticalSystems = systems.filter((system) => system.criticality === 'critical').length;

  const connectedIds = new Set();
  for (const edge of edges) {
    connectedIds.add(Number(edge.source_system_id));
    connectedIds.add(Number(edge.target_system_id));
  }

  const isolatedSystems = systems.filter((system) => !connectedIds.has(Number(system.id))).length;
  el.kpiTotalSystems.textContent = formatNumber(systemCount);
  el.kpiTotalDependencies.textContent = formatNumber(dependencyCount);
  el.kpiCriticalSystems.textContent = formatNumber(criticalSystems);
  el.kpiIsolatedSystems.textContent = formatNumber(isolatedSystems);

  const countryCounts = new Map();
  for (const system of systems) {
    const country = String(system.origin_country || '').trim() || 'Ukendt';
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
  }

  const sortedCountries = [...countryCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'da'));
  const countryEntries = sortedCountries.slice(0, 10).map((entry) => {
    const flag = getCountryFlagByName(entry.name);
    return {
      label: `${flag ? `${flag} ` : ''}${entry.name}`,
      value: entry.value
    };
  });

  if (sortedCountries.length > 10) {
    const otherTotal = sortedCountries.slice(10).reduce((sum, entry) => sum + entry.value, 0);
    countryEntries.push({ label: 'Øvrige', value: otherTotal });
  }

  renderBarChart(el.chartCountryOrigin, countryEntries, {
    emptyText: 'Ingen systemer endnu',
    totalForPercent: systemCount
  });

  const criticalityMeta = [
    { key: 'critical', label: LABELS.criticality.critical, color: '#b84457' },
    { key: 'high', label: LABELS.criticality.high, color: '#d6873f' },
    { key: 'medium', label: LABELS.criticality.medium, color: '#4f87c1' },
    { key: 'low', label: LABELS.criticality.low, color: '#5e9d84' }
  ];
  const criticalityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const system of systems) {
    const key = system.criticality;
    if (Object.prototype.hasOwnProperty.call(criticalityCounts, key)) {
      criticalityCounts[key] += 1;
    }
  }

  const donutSegments = [];
  let currentAngle = 0;
  for (const item of criticalityMeta) {
    const value = criticalityCounts[item.key];
    if (!value || systemCount === 0) continue;
    const nextAngle = currentAngle + (value / systemCount) * 360;
    donutSegments.push(`${item.color} ${currentAngle.toFixed(2)}deg ${nextAngle.toFixed(2)}deg`);
    currentAngle = nextAngle;
  }
  if (donutSegments.length === 0) {
    donutSegments.push('#dbe7f3 0deg 360deg');
  }

  el.chartCriticalityRing.style.background = `conic-gradient(${donutSegments.join(', ')})`;
  el.chartCriticalityRing.innerHTML = `
    <span class="donut-center">
      <span>
        <strong>${formatNumber(systemCount)}</strong>
        <small>Systemer</small>
      </span>
    </span>
  `;

  el.chartCriticalityLegend.innerHTML = criticalityMeta
    .map((item) => {
      const count = criticalityCounts[item.key];
      const share = systemCount > 0 ? (count / systemCount) * 100 : 0;
      return `
        <li class="legend-item">
          <span class="legend-key"><span class="legend-dot" style="background: ${item.color}"></span>${escapeHtml(item.label)}</span>
          <span class="legend-value">${formatNumber(count)} (${formatPercent(share)}%)</span>
        </li>
      `;
    })
    .join('');

  const statusEntries = ['active', 'planned', 'phase_out', 'retired'].map((key) => ({
    label: LABELS.status[key],
    value: systems.filter((system) => system.status === key).length
  }));
  renderBarChart(el.chartStatus, statusEntries, {
    emptyText: 'Ingen systemer endnu',
    totalForPercent: systemCount
  });

  const dependencyLoadById = new Map();
  for (const system of systems) {
    dependencyLoadById.set(Number(system.id), {
      label: system.name,
      incoming: 0,
      outgoing: 0,
      value: 0
    });
  }

  for (const edge of edges) {
    const source = dependencyLoadById.get(Number(edge.source_system_id));
    const target = dependencyLoadById.get(Number(edge.target_system_id));
    if (source) {
      source.outgoing += 1;
      source.value += 1;
    }
    if (target) {
      target.incoming += 1;
      target.value += 1;
    }
  }

  const dependencyLoadEntries = [...dependencyLoadById.values()]
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || b.incoming - a.incoming || a.label.localeCompare(b.label, 'da'))
    .slice(0, 8);

  renderBarChart(el.chartDependencyLoad, dependencyLoadEntries, {
    emptyText: 'Ingen afhængigheder endnu',
    valueFormatter: (entry) => `${formatNumber(entry.value)} (ind ${entry.incoming} / ud ${entry.outgoing})`
  });
}

function nodeRadius(criticality) {
  if (criticality === 'critical') return 20;
  if (criticality === 'high') return 17;
  if (criticality === 'medium') return 15;
  return 13;
}

function renderSystemGraph() {
  if (!el.systemGraph) return;

  const svg = el.systemGraph;
  const width = 1000;
  const height = 520;
  const allNodes = [...state.systems].sort((a, b) => a.name.localeCompare(b.name, 'da'));
  const allEdges = state.graphEdges || [];
  let nodes = allNodes;
  let edges = allEdges;

  if (state.graphMode === 'focus') {
    if (!state.selectedSystemId) {
      svg.innerHTML = '<text x="500" y="260" text-anchor="middle" class="graph-empty">Vælg et system i oversigten for at se afhængigheder</text>';
      return;
    }

    const selectedId = Number(state.selectedSystemId);
    const focusIds = new Set([selectedId]);

    for (const edge of allEdges) {
      if (Number(edge.source_system_id) === selectedId || Number(edge.target_system_id) === selectedId) {
        focusIds.add(Number(edge.source_system_id));
        focusIds.add(Number(edge.target_system_id));
      }
    }

    nodes = allNodes.filter((node) => focusIds.has(Number(node.id)));
    edges = allEdges.filter((edge) => focusIds.has(Number(edge.source_system_id)) && focusIds.has(Number(edge.target_system_id)));
  }

  if (nodes.length === 0) {
    svg.innerHTML = '<text x="500" y="260" text-anchor="middle" class="graph-empty">Ingen systemer endnu</text>';
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = Math.max(170, centerX - 110);
  const radiusY = Math.max(120, centerY - 115);
  const positions = new Map();

  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: centerX, y: centerY });
  } else {
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY
      });
    });
  }

  const connectedNodeIds = new Set();
  if (state.selectedSystemId) {
    for (const edge of edges) {
      if (Number(edge.source_system_id) === Number(state.selectedSystemId) || Number(edge.target_system_id) === Number(state.selectedSystemId)) {
        connectedNodeIds.add(Number(edge.source_system_id));
        connectedNodeIds.add(Number(edge.target_system_id));
      }
    }
  }

  const edgeMarkup = edges
    .map((edge) => {
      const source = positions.get(Number(edge.source_system_id));
      const target = positions.get(Number(edge.target_system_id));
      if (!source || !target) return '';
      const isActive = Number(edge.source_system_id) === Number(state.selectedSystemId) || Number(edge.target_system_id) === Number(state.selectedSystemId);
      return `<line class="graph-edge${isActive ? ' active' : ''}" x1="${source.x.toFixed(2)}" y1="${source.y.toFixed(2)}" x2="${target.x.toFixed(2)}" y2="${target.y.toFixed(2)}"></line>`;
    })
    .join('');

  const nodeMarkup = nodes
    .map((node) => {
      const pos = positions.get(node.id);
      const selected = Number(node.id) === Number(state.selectedSystemId);
      const dimmed = state.graphMode === 'all' && state.selectedSystemId && !selected && !connectedNodeIds.has(Number(node.id));
      const criticalityClass = `c-${node.criticality || 'low'}`;
      const label = node.name.length > 18 ? `${node.name.slice(0, 17)}…` : node.name;
      return `
        <g class="graph-node ${criticalityClass}${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}" data-node-id="${node.id}" transform="translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})">
          <circle r="${nodeRadius(node.criticality)}"></circle>
          <text y="${nodeRadius(node.criticality) + 16}" text-anchor="middle">${escapeHtml(label)}</text>
          <title>${escapeHtml(node.name)}</title>
        </g>
      `;
    })
    .join('');

  svg.innerHTML = `
    <defs>
      <pattern id="graph-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" class="graph-grid-line"></path>
      </pattern>
    </defs>
    <rect class="graph-grid-bg" x="0" y="0" width="${width}" height="${height}"></rect>
    <rect class="graph-grid-fill" x="0" y="0" width="${width}" height="${height}" fill="url(#graph-grid)"></rect>
    <g class="graph-edges">${edgeMarkup}</g>
    <g class="graph-nodes">${nodeMarkup}</g>
  `;
}

function setFocusOnSelectedSystem(enabled) {
  document.body.classList.toggle('focus-on-system', enabled);
}

function updateTopTabs() {
  for (const button of el.topTabButtons) {
    const active = button.dataset.tab === state.activeTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  }
}

function setActiveTab(tab) {
  if (!state.authUser) return;
  const allowed = ['systems', 'dashboard', 'dependencies', 'users', 'profile'];
  if (!allowed.includes(tab)) return;
  if (tab === 'users' && state.authUser.role !== 'admin') {
    tab = 'profile';
  }
  state.activeTab = tab;
  document.body.setAttribute('data-active-tab', tab);
  updateTopTabs();

  if (tab !== 'systems') {
    setFocusOnSelectedSystem(false);
    el.detailCard.classList.add('hidden');
  }

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'dependencies') renderSystemGraph();
  if (tab === 'users') loadUsers().catch((error) => notify(error.message));
}

function showOverviewMode() {
  setActiveTab('systems');
  setFocusOnSelectedSystem(false);
  el.detailCard.classList.add('hidden');
}

function updateGraphModeButtons() {
  el.graphModeFocus.classList.toggle('active', state.graphMode === 'focus');
  el.graphModeAll.classList.toggle('active', state.graphMode === 'all');
}

function setGraphMode(mode) {
  state.graphMode = mode;
  updateGraphModeButtons();
  renderSystemGraph();
}

function renderDependencyTargetOptions() {
  const sourceSystemId = state.editingDependencySourceId || state.selectedSystemId;
  const forceIncludeId = state.editingDependencyId
    ? state.dependenciesById[state.editingDependencyId]?.target_system_id || null
    : null;
  const options = state.systems
    .filter((s) => s.id !== sourceSystemId || s.id === forceIncludeId)
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join('');

  el.dependencyTarget.innerHTML = `<option value="">Vælg system</option>${options}`;
}

function resetAlternativeForm() {
  state.editingAlternativeId = null;
  el.altId.value = '';
  el.alternativeForm.reset();
  el.altCountry.value = '';
  el.altSubmit.textContent = 'Tilføj alternativ';
  el.altCancel.classList.add('hidden');
}

function startAlternativeEdit(alternative) {
  state.editingAlternativeId = alternative.id;
  el.altId.value = String(alternative.id);
  document.getElementById('alt-name').value = alternative.name || '';
  document.getElementById('alt-vendor').value = alternative.vendor || '';
  el.altCountry.value = alternative.vendor_country || '';
  document.getElementById('alt-eu-based').value = alternative.eu_based ? 'true' : 'false';
  document.getElementById('alt-fit').value = alternative.fit_score ?? '';
  document.getElementById('alt-migration').value = alternative.migration_complexity || '';
  document.getElementById('alt-url').value = alternative.website_url || '';
  document.getElementById('alt-notes').value = alternative.notes || '';
  el.altSubmit.textContent = 'Gem alternativ';
  el.altCancel.classList.remove('hidden');
}

function resetDependencyForm() {
  state.editingDependencyId = null;
  state.editingDependencySourceId = null;
  el.depId.value = '';
  el.dependencyForm.reset();
  el.depSubmit.textContent = 'Tilføj afhængighed';
  el.depCancel.classList.add('hidden');
  renderDependencyTargetOptions();
}

function startDependencyEdit(dependency) {
  state.editingDependencyId = dependency.id;
  state.editingDependencySourceId = Number(dependency.source_system_id);
  el.depId.value = String(dependency.id);
  renderDependencyTargetOptions();
  el.dependencyTarget.value = String(dependency.target_system_id);
  document.getElementById('dep-type').value = dependency.dependency_type;
  document.getElementById('dep-direction').value = dependency.direction;
  document.getElementById('dep-criticality').value = dependency.criticality;
  document.getElementById('dep-data').value = dependency.data_shared || '';
  el.depSubmit.textContent = 'Gem afhængighed';
  el.depCancel.classList.remove('hidden');
}

async function renderSelectedSystemDetails() {
  if (!state.authUser) {
    setFocusOnSelectedSystem(false);
    el.detailCard.classList.add('hidden');
    return;
  }

  if (!state.selectedSystemId) {
    setFocusOnSelectedSystem(false);
    el.detailCard.classList.add('hidden');
    el.selectedSystemName.textContent = 'Ingen valgt';
    state.alternativesById = {};
    state.dependenciesById = {};
    el.alternativesList.innerHTML = '';
    el.dependenciesList.innerHTML = '';
    resetAlternativeForm();
    resetDependencyForm();
    return;
  }

  if (state.activeTab !== 'systems') {
    setFocusOnSelectedSystem(false);
    el.detailCard.classList.add('hidden');
    return;
  }

  setFocusOnSelectedSystem(true);
  const data = await api(`/systems/${state.selectedSystemId}`);
  el.detailCard.classList.remove('hidden');
  el.selectedSystemName.textContent = data.system.name;
  populateSystemForm(data.system);
  state.alternativesById = {};
  state.dependenciesById = {};

  el.alternativesList.innerHTML = '';
  if (data.alternatives.length === 0) {
    el.alternativesList.innerHTML = '<li class="item"><span>Ingen alternativer endnu.</span></li>';
  } else {
    for (const alt of data.alternatives) {
      state.alternativesById[alt.id] = alt;
      const li = document.createElement('li');
      li.className = 'item';
      const linkMarkup = alt.website_url
        ? ` <a class="alt-link" href="${escapeHtml(alt.website_url)}" target="_blank" rel="noopener noreferrer">Link</a>`
        : '';
      li.innerHTML = `
        <span>${escapeHtml(alt.name)} (${escapeHtml(alt.vendor_country)}) - ${alt.eu_based ? 'EU-baseret' : 'Ikke EU-baseret'} - match: ${alt.fit_score ?? '-'}${linkMarkup}</span>
        <div class="row">
          <button data-alt-edit="${alt.id}" class="secondary">Rediger</button>
          <button data-alt-delete="${alt.id}" class="warn">Slet</button>
        </div>
      `;
      el.alternativesList.appendChild(li);
    }
  }

  el.dependenciesList.innerHTML = '';
  const outgoing = data.dependencies.outgoing.map((dep) => ({
    ...dep,
    direction_kind: 'outgoing',
    label: `${data.system.name} -> ${dep.target_system_name}`
  }));

  const incoming = data.dependencies.incoming.map((dep) => ({
    ...dep,
    direction_kind: 'incoming',
    label: `${dep.source_system_name} -> ${data.system.name}`
  }));

  const allDeps = [...outgoing, ...incoming];
  if (allDeps.length === 0) {
    el.dependenciesList.innerHTML = '<li class="item"><span>Ingen afhængigheder endnu.</span></li>';
    return;
  }

  for (const dep of allDeps) {
    state.dependenciesById[dep.id] = dep;
    const li = document.createElement('li');
    li.className = 'item';
    const directionLabel = dep.direction_kind === 'incoming' ? 'Indgående' : 'Udgående';
    li.innerHTML = `
      <span>${escapeHtml(dep.label)} (${directionLabel}, ${LABELS.dependencyType[dep.dependency_type] || dep.dependency_type}, ${LABELS.criticality[dep.criticality] || dep.criticality})</span>
      <div class="row">
        <button data-dep-edit="${dep.id}" class="secondary">Rediger</button>
        <button data-dep-delete="${dep.id}" class="warn">Slet</button>
      </div>
    `;
    el.dependenciesList.appendChild(li);
  }
}

async function loadSystems() {
  if (!state.authUser) {
    state.systems = [];
    state.graphEdges = [];
    renderSystemsTable();
    renderDashboard();
    renderDependencyTargetOptions();
    return;
  }

  const [systems, graph] = await Promise.all([api('/systems'), api('/graph')]);
  state.systems = systems;
  state.graphEdges = graph?.edges || [];
  renderSystemsTable();
  renderDashboard();
  renderDependencyTargetOptions();
}

function scrollToSystemDetails() {
  if (!state.selectedSystemId) return;
  el.detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function refreshSession() {
  const session = await api('/auth/me', { skipAuthHandling: true });
  if (!session?.authenticated || !session.user) {
    setAuthenticatedUi(null);
    return false;
  }

  setAuthenticatedUi(session.user);
  return true;
}

el.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const username = el.loginUsername.value.trim();
    const password = el.loginPassword.value;
    if (!username || !password) return;

    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuthHandling: true
    });

    setAuthenticatedUi(result.user);
    setActiveTab('systems');
    await loadSystems();
    await renderSelectedSystemDetails();
    await loadUsers();
    el.loginForm.reset();
    notify('Logget ind');
  } catch (error) {
    notify(error.message);
  }
});

el.logoutBtn.addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST', skipAuthHandling: true });
    setAuthenticatedUi(null);
    notify('Logget ud');
  } catch (error) {
    notify(error.message);
  }
});

el.createUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    if (state.authUser?.role !== 'admin') {
      notify('Kun administrator kan oprette brugere');
      return;
    }

    const payload = {
      username: el.newUserUsername.value.trim(),
      password: el.newUserPassword.value,
      role: el.newUserRole.value
    };

    await api('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    el.createUserForm.reset();
    await loadUsers();
    notify('Bruger oprettet');
  } catch (error) {
    notify(error.message);
  }
});

el.changePasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    if (!state.authUser) {
      notify('Du skal logge ind');
      return;
    }

    const currentPassword = el.currentPassword.value;
    const newPassword = el.newPassword.value;
    const confirmPassword = el.confirmPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      notify('Udfyld alle felter');
      return;
    }

    if (newPassword !== confirmPassword) {
      notify('Ny adgangskode og bekræftelse matcher ikke');
      return;
    }

    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    el.changePasswordForm.reset();
    notify('Adgangskode opdateret');
  } catch (error) {
    notify(error.message);
  }
});

el.quickCreateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.authUser) return;
  const name = el.quickSystemName.value.trim();
  if (!name) return;

  const created = await api('/systems/quick', {
    method: 'POST',
    body: JSON.stringify({ name })
  });

  el.quickCreateForm.reset();
  await loadSystems();
  state.selectedSystemId = created.id;
  resetAlternativeForm();
  resetDependencyForm();
  await renderSelectedSystemDetails();
  notify('System oprettet');
});

el.topTabs.addEventListener('click', async (event) => {
  if (!state.authUser) return;
  const button = event.target.closest('button[data-tab]');
  if (!button) return;
  setActiveTab(button.dataset.tab);
  const tab = state.activeTab;

  if (tab === 'systems') {
    await renderSelectedSystemDetails();
    if (state.selectedSystemId) {
      scrollToSystemDetails();
    } else {
      el.overviewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  if (tab === 'dashboard') {
    el.dashboardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (tab === 'dependencies') {
    el.graphCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (tab === 'users') {
    el.usersCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  el.profileCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

el.systemsTableHead.addEventListener('click', (event) => {
  const th = event.target.closest('th[data-sort]');
  if (!th) return;
  const key = th.dataset.sort;

  if (state.tableSort.key === key) {
    state.tableSort.direction = state.tableSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.tableSort.key = key;
    state.tableSort.direction = 'asc';
  }

  renderSystemsTable();
});

el.systemsTableBody.addEventListener('click', async (event) => {
  const row = event.target.closest('tr[data-id]');
  if (!row) return;
  state.selectedSystemId = Number(row.dataset.id);
  resetAlternativeForm();
  resetDependencyForm();
  renderSystemsTable();
  renderDependencyTargetOptions();
  await renderSelectedSystemDetails();
  scrollToSystemDetails();
});

el.systemGraph.addEventListener('click', async (event) => {
  const node = event.target.closest('g[data-node-id]');
  if (!node) return;
  state.selectedSystemId = Number(node.dataset.nodeId);
  resetAlternativeForm();
  resetDependencyForm();
  renderSystemsTable();
  renderDependencyTargetOptions();
  await renderSelectedSystemDetails();
});

el.showOverviewBtn.addEventListener('click', () => {
  showOverviewMode();
  el.overviewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

el.showDependenciesBtn.addEventListener('click', () => {
  setGraphMode('focus');
  setActiveTab('dependencies');
  el.graphCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

el.graphModeFocus.addEventListener('click', () => {
  setGraphMode('focus');
});

el.graphModeAll.addEventListener('click', () => {
  setGraphMode('all');
});

el.deleteSystemBtn.addEventListener('click', async () => {
  if (!state.selectedSystemId) {
    notify('Vælg et system først');
    return;
  }

  if (!confirm('Slet system? Dette sletter også afhængigheder.')) return;
  await api(`/systems/${state.selectedSystemId}`, { method: 'DELETE' });
  state.selectedSystemId = null;
  resetAlternativeForm();
  resetDependencyForm();
  await loadSystems();
  await renderSelectedSystemDetails();
  notify('System slettet');
});

el.systemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!state.selectedSystemId) {
    notify('Vælg et system først');
    return;
  }

  const payload = getSystemPayloadFromForm();
  await api(`/systems/${state.selectedSystemId}`, { method: 'PUT', body: JSON.stringify(payload) });
  notify('System opdateret');
  await loadSystems();
  await renderSelectedSystemDetails();
});

el.alternativeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedSystemId) {
    notify('Vælg et system først');
    return;
  }

  const payload = {
    name: document.getElementById('alt-name').value.trim(),
    vendor: document.getElementById('alt-vendor').value.trim(),
    vendor_country: el.altCountry.value.trim(),
    eu_based: document.getElementById('alt-eu-based').value === 'true',
    fit_score: document.getElementById('alt-fit').value || null,
    migration_complexity: document.getElementById('alt-migration').value || null,
    website_url: document.getElementById('alt-url').value.trim() || null,
    notes: document.getElementById('alt-notes').value.trim() || null
  };

  if (payload.fit_score !== null) payload.fit_score = Number(payload.fit_score);

  if (state.editingAlternativeId) {
    await api(`/alternatives/${state.editingAlternativeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    notify('Alternativ opdateret');
  } else {
    await api(`/systems/${state.selectedSystemId}/alternatives`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    notify('Alternativ tilføjet');
  }

  resetAlternativeForm();
  await renderSelectedSystemDetails();
});

el.dependencyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!state.selectedSystemId) {
    notify('Vælg et system først');
    return;
  }

  let targetSystemId = Number(el.dependencyTarget.value);
  const newTargetName = el.dependencyNewTargetName.value.trim();

  if (!targetSystemId && !newTargetName) {
    notify('Vælg et system eller opret et nyt med navn');
    return;
  }

  if (newTargetName) {
    const created = await api('/systems/quick', {
      method: 'POST',
      body: JSON.stringify({ name: newTargetName })
    });
    targetSystemId = created.id;
  }

  const sourceSystemId = state.editingDependencySourceId || state.selectedSystemId;
  if (targetSystemId === sourceSystemId) {
    notify('Et system kan ikke afhænge af sig selv');
    return;
  }

  const payload = {
    source_system_id: sourceSystemId,
    target_system_id: targetSystemId,
    dependency_type: document.getElementById('dep-type').value,
    direction: document.getElementById('dep-direction').value,
    criticality: document.getElementById('dep-criticality').value,
    data_shared: document.getElementById('dep-data').value.trim() || null
  };

  if (state.editingDependencyId) {
    await api(`/dependencies/${state.editingDependencyId}`, { method: 'PUT', body: JSON.stringify(payload) });
    notify('Afhængighed opdateret');
  } else {
    await api('/dependencies', { method: 'POST', body: JSON.stringify(payload) });
    notify('Afhængighed tilføjet');
  }
  resetDependencyForm();
  await loadSystems();
  renderDependencyTargetOptions();
  await renderSelectedSystemDetails();
});

el.dependenciesList.addEventListener('click', async (event) => {
  const editBtn = event.target.closest('button[data-dep-edit]');
  if (editBtn) {
    const dep = state.dependenciesById[Number(editBtn.dataset.depEdit)];
    if (dep) startDependencyEdit(dep);
    return;
  }

  const deleteBtn = event.target.closest('button[data-dep-delete]');
  if (!deleteBtn) return;

  const deleteId = Number(deleteBtn.dataset.depDelete);
  await api(`/dependencies/${deleteId}`, { method: 'DELETE' });
  if (state.editingDependencyId === deleteId) resetDependencyForm();
  notify('Afhængighed slettet');
  await loadSystems();
  await renderSelectedSystemDetails();
});

el.alternativesList.addEventListener('click', async (event) => {
  const editBtn = event.target.closest('button[data-alt-edit]');
  if (editBtn) {
    const alternative = state.alternativesById[Number(editBtn.dataset.altEdit)];
    if (alternative) startAlternativeEdit(alternative);
    return;
  }

  const deleteBtn = event.target.closest('button[data-alt-delete]');
  if (!deleteBtn) return;
  const deleteId = Number(deleteBtn.dataset.altDelete);
  await api(`/alternatives/${deleteId}`, { method: 'DELETE' });
  if (state.editingAlternativeId === deleteId) resetAlternativeForm();
  notify('Alternativ slettet');
  await renderSelectedSystemDetails();
});

el.altCancel.addEventListener('click', () => {
  resetAlternativeForm();
});

el.depCancel.addEventListener('click', () => {
  resetDependencyForm();
});

async function init() {
  buildCountryOptions();
  setupCountryCombobox(el.originCountry, el.originCountryOptions);
  setupCountryCombobox(el.altCountry, el.altCountryOptions);
  updateGraphModeButtons();
  el.detailCard.classList.add('hidden');

  const authenticated = await refreshSession();
  if (!authenticated) return;

  setActiveTab(state.activeTab);
  await loadSystems();
  await renderSelectedSystemDetails();
  await loadUsers();
}

init().catch((error) => {
  notify(error.message);
  console.error(error);
});
