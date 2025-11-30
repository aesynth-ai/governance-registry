(() => {
  const ledgerListEl = document.getElementById("ledger-list");
  const ledgerDetailEl = document.getElementById("ledger-detail");
  const selectionLabel = document.getElementById("selection-label");
  const searchInput = document.getElementById("search-input");
  const refreshLedgerBtn = document.getElementById("refresh-ledger");
  const refreshLoopsBtn = document.getElementById("refresh-loops");
  const refreshSnapshotsBtn = document.getElementById("refresh-snapshots");
  const loopsListEl = document.getElementById("loops-list");
  const snapshotsListEl = document.getElementById("snapshots-list");
  const apiKeyInput = document.getElementById("api-key");
  const saveKeyBtn = document.getElementById("save-key");
  const authStatus = document.getElementById("auth-status");

  let apiKey = window.localStorage.getItem("ledgerApiKey") || "";
  if (apiKey) {
    apiKeyInput.value = apiKey;
    authStatus.textContent = "Using saved API key (Bearer + x-api-key)";
  }

  function setAuthKey(nextKey) {
    apiKey = nextKey.trim();
    if (apiKey) {
      window.localStorage.setItem("ledgerApiKey", apiKey);
      authStatus.textContent = "Using saved API key (Bearer + x-api-key)";
    } else {
      window.localStorage.removeItem("ledgerApiKey");
      authStatus.textContent = "Using anonymous access";
    }
  }

  saveKeyBtn.addEventListener("click", () => setAuthKey(apiKeyInput.value));
  apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      setAuthKey(apiKeyInput.value);
    }
  });

  function formatDate(iso) {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso;
      return date.toLocaleString();
    } catch {
      return iso;
    }
  }

  async function fetchJson(url, opts = {}) {
    const headers = { ...(opts.headers || {}), Accept: "application/json" };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers["x-api-key"] = apiKey;
    }
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Request failed (${res.status}): ${message || res.statusText}`);
    }
    return res.json();
  }

  function renderLedgerList(items) {
    ledgerListEl.innerHTML = "";
    if (!items.length) {
      ledgerListEl.innerHTML = '<div class="empty">No ledger entries found.</div>';
      return;
    }
    items.forEach(({ id, entry }) => {
      const row = document.createElement("div");
      row.className = "ledger-item";
      row.innerHTML = `
        <div class="meta">#${id} • ${entry.event || "event"} • ${formatDate(entry.timestamp)}</div>
        <div class="subject">${entry.subject || "No subject"}</div>
        <div class="meta">${entry.urn || ""}</div>
      `;
      row.addEventListener("click", () => selectEntry(id));
      ledgerListEl.appendChild(row);
    });
  }

  async function loadLedger() {
    ledgerListEl.innerHTML = '<div class="empty">Loading ledger…</div>';
    try {
      const query = searchInput.value.trim();
      const url = new URL("/api/ledger/search", window.location.origin);
      if (query) {
        url.searchParams.set("q", query);
      }
      const data = await fetchJson(url.toString());
      renderLedgerList(data.items || []);
      if (data.items?.length) {
        selectEntry(data.items[0].id);
      } else {
        ledgerDetailEl.textContent = "// awaiting selection";
        selectionLabel.textContent = "Select an entry to inspect";
      }
    } catch (err) {
      ledgerListEl.innerHTML = `<div class="empty">Failed to load ledger: ${err.message}</div>`;
    }
  }

  async function selectEntry(id) {
    selectionLabel.textContent = `Entry #${id}`;
    ledgerDetailEl.textContent = "// loading entry…";
    try {
      const data = await fetchJson(`/api/ledger/${id}`);
      ledgerDetailEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      ledgerDetailEl.textContent = `// failed to load entry: ${err.message}`;
    }
  }

  async function loadLoops() {
    loopsListEl.textContent = "Loading semantic loops…";
    try {
      const data = await fetchJson("/api/semantic-loops");
      const items = data.items || [];
      if (!items.length) {
        loopsListEl.classList.add("empty");
        loopsListEl.textContent = "No semantic loop records found.";
        return;
      }
      loopsListEl.classList.remove("empty");
      loopsListEl.innerHTML = "";
      items.forEach((loop, idx) => {
        const card = document.createElement("div");
        card.className = "meta-card";
        card.innerHTML = `
          <h4>Loop ${loop.id || idx + 1}</h4>
          <p>${loop.summary || "Semantic loop record"}</p>
        `;
        loopsListEl.appendChild(card);
      });
    } catch (err) {
      loopsListEl.textContent = `Failed to load loops: ${err.message}`;
    }
  }

  async function loadSnapshots() {
    snapshotsListEl.textContent = "Loading snapshots…";
    try {
      const data = await fetchJson("/api/ledger/snapshots");
      const items = data.items || [];
      if (!items.length) {
        snapshotsListEl.classList.add("empty");
        snapshotsListEl.textContent = "No snapshots discovered.";
        return;
      }
      snapshotsListEl.classList.remove("empty");
      snapshotsListEl.innerHTML = "";
      items.forEach((snap, idx) => {
        const card = document.createElement("div");
        card.className = "meta-card";
        const title = snap.name || snap.urn || `Snapshot ${idx + 1}`;
        const ts = snap.timestamp || snap.generated || "";
        card.innerHTML = `
          <h4>${title}</h4>
          <p>${ts ? formatDate(ts) : "Timestamp unknown"}</p>
        `;
        snapshotsListEl.appendChild(card);
      });
    } catch (err) {
      snapshotsListEl.textContent = `Failed to load snapshots: ${err.message}`;
    }
  }

  refreshLedgerBtn.addEventListener("click", loadLedger);
  refreshLoopsBtn.addEventListener("click", loadLoops);
  refreshSnapshotsBtn.addEventListener("click", loadSnapshots);

  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => loadLedger(), 180);
  });

  loadLedger();
  loadLoops();
  loadSnapshots();
})();
