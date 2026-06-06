(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const fmtNumber = (value) => Number(value || 0).toLocaleString();
  const fmtMoney = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  const fmtDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
  const fmtDateTime = (value) => value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";
  const debounce = (fn, wait = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  const state = {
    rangeDays: 30,
    stats: null,
    charts: {},
    notifications: [],
    users: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    selected: new Set(),
    sort: "createdAt",
    direction: "desc",
    editingUser: null,
    chartInstances: {},
    refreshTimer: null,
    hasLoadedUsers: false
  };

  const chartDefaults = () => {
    if (!window.Chart) return;
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = "#647084";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.tooltip.backgroundColor = "#111827";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  };

  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "login.html";
      throw new Error("Unauthorized");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Request failed");
    return payload;
  };

  const showError = (message) => {
    const notice = $("#errorNotice");
    notice.textContent = message;
    notice.classList.remove("hidden");
  };

  const clearError = () => $("#errorNotice").classList.add("hidden");

  const removeLockout = () => {
    const overlay = $("#lockoutOverlay");
    if (!overlay) return;
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 250);
  };

  const authorize = async () => {
    const data = await api("/auth/me");
    if (!data.user || data.user.role !== "admin") {
      window.location.href = "login.html";
      return;
    }
    const user = data.user;
    const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Admin";
    $("#adminNameHeader").textContent = fullName;
    $("#adminEmailHeader").textContent = user.email || "";
    $("#adminAvatarHeader").textContent = `${user.firstName?.[0] || "A"}${user.lastName?.[0] || "D"}`.toUpperCase();
  };

  const commonChartOptions = (legend = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    animation: { duration: 260, easing: "easeOutQuart" },
    interaction: { intersect: false, mode: "index" },
    plugins: { legend: { display: legend, position: "bottom" } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 6, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: "rgba(103,116,138,.12)" }, ticks: { maxTicksLimit: 4 } }
    }
  });

  const upsertChart = (id, config) => {
    const canvas = $(`#${id}`);
    if (!canvas || !window.Chart) return;
    const existing = state.chartInstances[id];
    if (existing) {
      existing.data.labels = config.data.labels;
      existing.data.datasets = config.data.datasets;
      existing.options = config.options;
      existing.update("none");
      return;
    }
    state.chartInstances[id] = new Chart(canvas, config);
  };

  const clearCanvas = (canvas) => {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    return { ctx, width: rect.width, height: rect.height };
  };

  const fallbackLineChart = (id, values, color, fill = true) => {
    const canvas = $(`#${id}`);
    if (!canvas) return;
    const { ctx, width, height } = clearCanvas(canvas);
    const data = values.length ? values : [0];
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = Math.max(max - min, 1);
    const pad = 18;
    const step = (width - pad * 2) / Math.max(data.length - 1, 1);
    const points = data.map((value, index) => ({
      x: pad + index * step,
      y: height - pad - ((value - min) / range) * (height - pad * 2)
    }));

    ctx.strokeStyle = "rgba(103,116,138,.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    if (fill) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${color}26`);
      gradient.addColorStop(1, `${color}00`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - pad);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points.at(-1).x, height - pad);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
  };

  const fallbackBarChart = (id, values, colors) => {
    const canvas = $(`#${id}`);
    if (!canvas) return;
    const { ctx, width, height } = clearCanvas(canvas);
    const data = values.length ? values : [0];
    const max = Math.max(...data, 1);
    const gap = 12;
    const pad = 18;
    const barWidth = Math.min(34, (width - pad * 2 - gap * (data.length - 1)) / data.length);
    const totalWidth = barWidth * data.length + gap * (data.length - 1);
    let x = (width - totalWidth) / 2;
    data.forEach((value, index) => {
      const h = ((value || 0) / max) * (height - pad * 2);
      ctx.fillStyle = Array.isArray(colors) ? colors[index % colors.length] : colors;
      ctx.beginPath();
      ctx.roundRect(x, height - pad - h, barWidth, h || 2, 7);
      ctx.fill();
      x += barWidth + gap;
    });
  };

  const fallbackDoughnutChart = (id, values, colors) => {
    const canvas = $(`#${id}`);
    if (!canvas) return;
    const { ctx, width, height } = clearCanvas(canvas);
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.34;
    let start = -Math.PI / 2;
    values.forEach((value, index) => {
      const slice = (Number(value || 0) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.strokeStyle = colors[index % colors.length];
      ctx.lineWidth = Math.max(14, radius * 0.28);
      ctx.arc(cx, cy, radius, start, start + slice);
      ctx.stroke();
      start += slice;
    });
    ctx.fillStyle = "#111827";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(total.toLocaleString(), cx, cy + 4);
  };

  const makeLineChart = (id, labels, values, color, fill = true) => {
    const canvas = $(`#${id}`);
    if (!canvas) return;
    if (!window.Chart) {
      fallbackLineChart(id, values, color, fill);
      return;
    }
    const gradient = canvas.getContext("2d").createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, `${color}30`);
    gradient.addColorStop(1, `${color}00`);
    upsertChart(id, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: color,
          backgroundColor: gradient,
          fill,
          tension: 0.42,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.2
        }]
      },
      options: commonChartOptions(false)
    });
  };

  const makeBarChart = (id, labels, values, color) => {
    if (!$(`#${id}`)) return;
    if (!window.Chart) {
      fallbackBarChart(id, values, color);
      return;
    }
    upsertChart(id, {
      type: "bar",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: color, borderRadius: 7, maxBarThickness: 30 }]
      },
      options: commonChartOptions(false)
    });
  };

  const makeDoughnutChart = (id, labels, values, colors) => {
    if (!$(`#${id}`)) return;
    if (!window.Chart) {
      fallbackDoughnutChart(id, values, colors);
      return;
    }
    upsertChart(id, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 120,
        cutout: "68%",
        animation: { duration: 260, easing: "easeOutQuart" },
        plugins: { legend: { position: "bottom" } }
      }
    });
  };

  const updateKpis = (payload) => {
    const stats = payload.stats;
    const total = stats.totalCreators || 0;
    const paid = stats.paidUsers || 0;
    const free = stats.freeUsers || 0;
    const activeTrials = stats.activeTrials || 0;
    const freeShare = total ? Math.round((free / total) * 100) : 0;
    const paidShare = total ? Math.round((paid / total) * 100) : 0;

    $("#kpiTotalCreators").textContent = fmtNumber(total);
    $("#kpiPaidMembers").textContent = fmtNumber(paid);
    $("#kpiFreeMembers").textContent = fmtNumber(free);
    $("#kpiActiveTrials").textContent = fmtNumber(activeTrials);
    $("#kpiRevenue").textContent = fmtMoney(stats.revenueMtd);
    $("#kpiSecurityAlerts").textContent = fmtNumber(stats.securityAlerts);
    $("#kpiTotalGrowth").textContent = `${stats.userGrowthRate || 0}%`;
    $("#kpiPaidGrowth").textContent = `${stats.paidGrowthRate || 0}%`;
    $("#kpiFreeShare").textContent = `${freeShare}%`;
    $("#kpiSecurityState").textContent = stats.securityAlerts ? "Review" : "Clean";

    $("#kpiTotalContext").textContent = `${fmtNumber(payload.charts.dailySignups.reduce((sum, point) => sum + point.value, 0))} registrations in this range`;
    $("#kpiPaidContext").textContent = `${paidShare}% of all creators are paid`;
    $("#kpiFreeContext").textContent = `${freeShare}% free base with conversion potential`;
    $("#kpiTrialContext").textContent = `${fmtNumber(payload.trialFunnel.started)} trials started all time`;
    $("#kpiRevenueContext").textContent = `${fmtNumber(paid)} paid members contributing`;
    $("#kpiSecurityContext").textContent = stats.securityAlerts ? "Duplicate signup IP groups detected" : "No duplicate signup IP groups";

    $("#freeTotal").textContent = fmtNumber(free);
    $("#freeNew").textContent = fmtNumber(payload.charts.dailySignups.reduce((sum, point) => sum + point.value, 0));
    $("#freeActivity").textContent = free ? "Trackable" : "No users";
    $("#freeOpportunity").textContent = `${fmtNumber(free)} leads`;
    $("#paidRenewals").textContent = "0";
    $("#paidRevenue").textContent = fmtMoney(stats.revenueMtd);
    $("#paidActive").textContent = fmtNumber(paid);
  };

  const updateCharts = (payload) => {
    const growth = payload.charts.userGrowth || [];
    const signups = payload.charts.dailySignups || [];
    const revenue = payload.charts.revenueGrowth || [];
    const plan = payload.planDistribution || {};
    const funnel = payload.trialFunnel || {};
    const labels = growth.map((point) => point.label);

    makeLineChart("userGrowthChart", labels, growth.map((point) => point.value), "#586dff");
    makeDoughnutChart("distributionChart", ["Free", "Paid"], [plan.free || 0, plan.paid || 0], ["#a7afb9", "#7b50ff"]);
    makeBarChart("trialFunnelChart", ["Started", "Active", "Converted", "Expired"], [funnel.started || 0, funnel.active || 0, funnel.converted || 0, funnel.expired || 0], ["#586dff", "#e7b958", "#108947", "#d72748"]);
    makeLineChart("revenueGrowthChart", revenue.map((point) => point.label), revenue.map((point) => point.value), "#108947");
    makeBarChart("dailySignupsChart", signups.map((point) => point.label), signups.map((point) => point.value), "#586dff");
    makeDoughnutChart("subscriptionTrendsChart", ["Free", "Paid", "Trial"], [plan.free || 0, plan.paid || 0, plan.trial || 0], ["#a7afb9", "#7b50ff", "#e7b958"]);

    $("#growthCaption").textContent = `${fmtNumber(growth.at(-1)?.value || 0)} total`;
    $("#distributionCaption").textContent = `${fmtNumber(plan.paid || 0)} paid`;
    $("#trialCaption").textContent = `${fmtNumber(funnel.active || 0)} active`;
    $("#revenueCaption").textContent = fmtMoney(revenue.reduce((sum, point) => sum + point.value, 0));
    $("#signupCaption").textContent = `${fmtNumber(signups.reduce((sum, point) => sum + point.value, 0))} new`;
    $("#subscriptionCaption").textContent = `${fmtNumber(plan.trial || 0)} trials`;
  };

  const groupDate = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const renderNotifications = () => {
    const list = $("#notificationList");
    const unread = state.notifications.filter((item) => item.unread).length;
    $("#notifCount").textContent = String(unread);
    $("#notificationSubtitle").textContent = `${unread} unread admin events`;
    if (!state.notifications.length) {
      list.innerHTML = '<div class="empty-state">No notifications available.</div>';
      return;
    }
    let lastGroup = "";
    list.innerHTML = state.notifications.map((item) => {
      const group = groupDate(item.createdAt);
      const header = group !== lastGroup ? `<div class="notification-day">${group}</div>` : "";
      lastGroup = group;
      return `${header}
        <article class="notification-item ${item.unread ? "unread" : ""}" data-id="${item.id}">
          <div>
            <strong>${item.title}</strong>
            <span>${item.type}: ${item.message}</span>
            <small>${fmtDateTime(item.createdAt)}</small>
          </div>
          <button title="Delete notification" data-delete-notification="${item.id}"><i class="fa-solid fa-trash"></i></button>
        </article>`;
    }).join("");
  };

  const renderTrialMonitor = () => {
    const trials = state.users
      .filter((user) => user.trial && user.trial.status !== "none")
      .sort((a, b) => (a.trial.remainingDays ?? 99) - (b.trial.remainingDays ?? 99))
      .slice(0, 5);
    if (!trials.length) {
      $("#trialMonitorList").innerHTML = '<div class="empty-state">No active or historical trials in this filter.</div>';
      return;
    }
    $("#trialMonitorList").innerHTML = trials.map((user) => `
      <article class="trial-item">
        <strong>${user.name || user.email}<em class="pill ${user.trial.status === "expired" ? "expired" : "trial"}">${trialLabel(user.trial)}</em></strong>
        <span>${fmtDate(user.trial.startDate)} to ${fmtDate(user.trial.endDate)}</span>
        <div class="trial-progress"><i style="width:${user.trial.progress || 0}%"></i></div>
      </article>
    `).join("");
  };

  const trialLabel = (trial) => {
    if (!trial || trial.status === "none") return "No trial";
    if (trial.status === "expired") return "Expired";
    if (trial.status === "expires_today") return "Today";
    if (trial.status === "expiring_soon") return `${trial.remainingDays}d left`;
    return `${trial.remainingDays}d left`;
  };

  const renderUsers = () => {
    const tbody = $("#creatorsTableBody");
    if (!state.users.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No creators match the current search and filters.</td></tr>';
    } else {
      tbody.innerHTML = state.users.map((user) => {
        const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed Creator";
        const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CR";
        const avatar = user.avatar ? `<img src="${user.avatar}" alt="">` : initials;
        return `
          <tr>
            <td><input type="checkbox" class="user-select" data-id="${user.id}" ${state.selected.has(user.id) ? "checked" : ""}></td>
            <td><div class="user-cell"><div class="avatar">${avatar}</div><div><strong>${name}</strong><span>${user.email}</span></div></div></td>
            <td><b>${fmtDate(user.createdAt)}</b><span>${fmtDateTime(user.createdAt)}</span></td>
            <td><span class="pill ${user.plan === "pro" ? "pro" : "free"}">${user.plan === "pro" ? "Paid" : "Free"}</span></td>
            <td><b>${trialLabel(user.trial)}</b><span>${user.trial?.endDate ? `Ends ${fmtDate(user.trial.endDate)}` : "No trial window"}</span><div class="trial-progress"><i style="width:${user.trial?.progress || 0}%"></i></div></td>
            <td><b>${fmtDate(user.lastLoginAt)}</b><span>${fmtDateTime(user.lastLoginAt)}</span></td>
            <td><b>${user.signupIp || "Not captured"}</b><span>${user.deviceFingerprint ? "Fingerprint captured" : "No fingerprint"}</span></td>
            <td><span class="pill ${user.status || "active"}">${user.status || "active"}</span></td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" title="View user" data-view="${user.id}"><i class="fa-regular fa-eye"></i></button>
                <button class="icon-btn" title="Edit user" data-edit="${user.id}"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="icon-btn" title="${user.status === "suspended" ? "Activate" : "Suspend"} user" data-suspend="${user.id}"><i class="fa-solid fa-ban"></i></button>
                <button class="icon-btn" title="Delete user" data-delete="${user.id}"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>`;
      }).join("");
    }

    const start = state.pagination.total ? ((state.pagination.page - 1) * state.pagination.limit) + 1 : 0;
    const end = Math.min(state.pagination.page * state.pagination.limit, state.pagination.total);
    $("#tablePaginationInfo").textContent = `Showing ${fmtNumber(start)} to ${fmtNumber(end)} of ${fmtNumber(state.pagination.total)} creators`;
    renderPagination();
    renderBulkBar();
    renderTrialMonitor();
  };

  const renderPagination = () => {
    const total = state.pagination.totalPages;
    const current = state.pagination.page;
    const buttons = [
      `<button class="page-btn" data-page="${current - 1}" ${current <= 1 ? "disabled" : ""}><i class="fa-solid fa-angle-left"></i></button>`
    ];
    const pages = Array.from(new Set([1, current - 1, current, current + 1, total])).filter((page) => page >= 1 && page <= total);
    let prev = 0;
    pages.forEach((page) => {
      if (page - prev > 1) buttons.push('<button class="page-btn" disabled>...</button>');
      buttons.push(`<button class="page-btn ${page === current ? "active" : ""}" data-page="${page}">${page}</button>`);
      prev = page;
    });
    buttons.push(`<button class="page-btn" data-page="${current + 1}" ${current >= total ? "disabled" : ""}><i class="fa-solid fa-angle-right"></i></button>`);
    $("#paginationBtns").innerHTML = buttons.join("");
  };

  const renderBulkBar = () => {
    $("#selectedCount").textContent = `${state.selected.size} selected`;
    $("#bulkBar").classList.toggle("active", state.selected.size > 0);
    $("#selectAllUsers").checked = state.users.length > 0 && state.users.every((user) => state.selected.has(user.id));
  };

  const queryString = () => {
    const params = new URLSearchParams({
      search: $("#tableSearchInput").value || $("#globalSearchInput").value || "",
      plan: $("#planFilterSelect").value,
      trial: $("#trialFilterSelect").value,
      status: $("#statusFilterSelect").value,
      page: state.pagination.page,
      limit: state.pagination.limit,
      sort: state.sort,
      direction: state.direction
    });
    return params.toString();
  };

  const fetchStats = async () => {
    const payload = await api(`/api/admin/stats?days=${state.rangeDays}`);
    state.stats = payload.stats;
    state.charts = payload.charts;
    state.notifications = payload.notifications || [];
    updateKpis(payload);
    updateCharts(payload);
    renderNotifications();
  };

  const fetchUsers = async () => {
    if (!state.hasLoadedUsers) {
      $("#creatorsTableBody").innerHTML = '<tr><td colspan="9" class="loading-cell"><div class="spinner"></div><br>Loading creators</td></tr>';
    }
    const payload = await api(`/api/admin/users?${queryString()}`);
    state.users = payload.users || [];
    state.pagination = payload.pagination || state.pagination;
    state.hasLoadedUsers = true;
    renderUsers();
  };

  const refresh = async () => {
    clearError();
    try {
      await fetchStats();
      await fetchUsers();
    } catch (error) {
      showError(error.message);
    }
  };

  const refreshStatsOnly = async () => {
    try {
      await fetchStats();
    } catch (error) {
      showError(error.message);
    }
  };

  const openCreatorModal = (user = null) => {
    state.editingUser = user;
    $("#creatorModalTitle").textContent = user ? "Edit Creator" : "Add Creator";
    $("#creatorFirstName").value = user?.firstName || "";
    $("#creatorLastName").value = user?.lastName || "";
    $("#creatorEmail").value = user?.email || "";
    $("#creatorPlan").value = user?.plan || "free";
    $("#creatorStatus").value = user?.status || "active";
    $("#creatorPassword").value = "";
    $("#creatorPassword").closest("label").style.display = user ? "none" : "grid";
    $("#creatorModal").showModal();
  };

  const saveCreator = async () => {
    const body = {
      firstName: $("#creatorFirstName").value.trim(),
      lastName: $("#creatorLastName").value.trim(),
      email: $("#creatorEmail").value.trim(),
      plan: $("#creatorPlan").value,
      status: $("#creatorStatus").value,
      password: $("#creatorPassword").value
    };
    const user = state.editingUser;
    if (user) {
      await api(`/api/admin/users/${user.id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
    }
    $("#creatorModal").close();
    await refresh();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this creator profile permanently?")) return;
    await api(`/api/admin/users/${id}`, { method: "DELETE" });
    state.selected.delete(id);
    await refresh();
  };

  const updateUser = async (id, body) => {
    await api(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) });
    await refresh();
  };

  const exportCsv = () => {
    const headers = ["Name", "Email", "Registration Date", "Plan", "Trial Status", "Last Login", "IP Address", "Status"];
    const rows = state.users.map((user) => [
      user.name || "",
      user.email || "",
      fmtDate(user.createdAt),
      user.plan || "",
      trialLabel(user.trial),
      fmtDateTime(user.lastLoginAt),
      user.signupIp || "",
      user.status || ""
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bindEvents = () => {
    const search = debounce(() => {
      state.pagination.page = 1;
      fetchUsers().catch((error) => showError(error.message));
    });
    $("#globalSearchInput").addEventListener("input", search);
    $("#tableSearchInput").addEventListener("input", search);
    ["#planFilterSelect", "#trialFilterSelect", "#statusFilterSelect"].forEach((selector) => {
      $(selector).addEventListener("change", () => {
        state.pagination.page = 1;
        fetchUsers().catch((error) => showError(error.message));
      });
    });

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#globalSearchInput").focus();
      }
    });

    $("#rangeFilters").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-days]");
      if (!button) return;
      $$("#rangeFilters button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.rangeDays = Number(button.dataset.days);
      fetchStats().catch((error) => showError(error.message));
    });

    $("#collapseSidebarBtn").addEventListener("click", () => $("#adminShell").classList.toggle("collapsed"));
    $("#mobileMenuBtn").addEventListener("click", () => {
      $("#adminSidebar").classList.add("open");
      $("#mobileShade").classList.add("open");
    });
    $("#mobileShade").addEventListener("click", () => {
      $("#adminSidebar").classList.remove("open");
      $("#mobileShade").classList.remove("open");
    });

    $$(".side-link").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".side-link").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const section = button.dataset.section;
        const target = section === "analytics" ? $(".analytics-panel") : section === "users" ? $(".directory-panel") : $(".admin-main");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        $("#adminSidebar").classList.remove("open");
        $("#mobileShade").classList.remove("open");
      });
    });

    $("#notificationsBtn").addEventListener("click", () => $("#notificationDrawer").classList.add("open"));
    $("#closeNotificationsBtn").addEventListener("click", () => $("#notificationDrawer").classList.remove("open"));
    $("#markAllReadBtn").addEventListener("click", () => {
      state.notifications.forEach((item) => item.unread = false);
      renderNotifications();
    });
    $("#clearNotificationsBtn").addEventListener("click", () => {
      state.notifications = [];
      renderNotifications();
    });
    $("#notificationList").addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-delete-notification]");
      if (deleteButton) {
        state.notifications = state.notifications.filter((item) => item.id !== deleteButton.dataset.deleteNotification);
        renderNotifications();
        return;
      }
      const item = event.target.closest(".notification-item");
      if (item) {
        const notification = state.notifications.find((entry) => entry.id === item.dataset.id);
        if (notification) notification.unread = false;
        renderNotifications();
      }
    });

    $("#creatorsTableBody").addEventListener("click", (event) => {
      const checkbox = event.target.closest(".user-select");
      if (checkbox) {
        checkbox.checked ? state.selected.add(checkbox.dataset.id) : state.selected.delete(checkbox.dataset.id);
        renderBulkBar();
        return;
      }
      const view = event.target.closest("[data-view]");
      const edit = event.target.closest("[data-edit]");
      const suspend = event.target.closest("[data-suspend]");
      const remove = event.target.closest("[data-delete]");
      if (view) {
        const user = state.users.find((item) => item.id === view.dataset.view);
        if (user) alert(`${user.name || user.email}\n${user.email}\nPlan: ${user.plan}\nStatus: ${user.status}`);
      }
      if (edit) openCreatorModal(state.users.find((item) => item.id === edit.dataset.edit));
      if (suspend) {
        const user = state.users.find((item) => item.id === suspend.dataset.suspend);
        updateUser(suspend.dataset.suspend, { status: user?.status === "suspended" ? "active" : "suspended" }).catch((error) => showError(error.message));
      }
      if (remove) deleteUser(remove.dataset.delete).catch((error) => showError(error.message));
    });

    $("#selectAllUsers").addEventListener("change", (event) => {
      state.users.forEach((user) => event.target.checked ? state.selected.add(user.id) : state.selected.delete(user.id));
      renderUsers();
    });
    $("#paginationBtns").addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      state.pagination.page = Number(button.dataset.page);
      fetchUsers().catch((error) => showError(error.message));
    });
    $$(".creator-table th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const nextSort = th.dataset.sort;
        state.direction = state.sort === nextSort && state.direction === "desc" ? "asc" : "desc";
        state.sort = nextSort;
        fetchUsers().catch((error) => showError(error.message));
      });
    });
    $("#bulkBar").addEventListener("click", async (event) => {
      const action = event.target.closest("[data-bulk]")?.dataset.bulk;
      if (!action) return;
      const ids = [...state.selected];
      if (action === "delete" && !confirm(`Delete ${ids.length} selected creator profiles?`)) return;
      for (const id of ids) {
        if (action === "delete") await api(`/api/admin/users/${id}`, { method: "DELETE" });
        if (action === "pro") await api(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ plan: "pro" }) });
        if (action === "suspended") await api(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ status: "suspended" }) });
      }
      state.selected.clear();
      await refresh();
    });

    $("#addCreatorBtn").addEventListener("click", () => openCreatorModal());
    $("#creatorForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveCreator().catch((error) => showError(error.message));
    });
    $("#exportReportBtn").addEventListener("click", exportCsv);
    $("#sidebarLogoutBtn").addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" }).catch(() => {});
      window.location.href = "login.html";
    });
  };

  document.addEventListener("DOMContentLoaded", async () => {
    chartDefaults();
    bindEvents();
    try {
      await authorize();
      await refresh();
    } catch (error) {
      showError(error.message);
    } finally {
      removeLockout();
    }
    state.refreshTimer = setInterval(refreshStatsOnly, 120000);
  });
})();
