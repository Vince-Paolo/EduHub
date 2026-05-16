.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fef3c7 100%);
  display: flex;
  flex-direction: column;
}

/* ── Loading / centred states ── */
.centred {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #bbf7d0;
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.missingIcon  { font-size: 4rem; }
.missingTitle { font-size: 1.35rem; font-weight: 700; color: #1f2937; margin: 0; }
.missingDesc  { font-size: 0.95rem; color: #6b7280; max-width: 36rem; line-height: 1.6; margin: 0; }

.backBtn {
  margin-top: 0.5rem;
  border: 2px solid #22c55e;
  color: #16a34a;
  background: transparent;
  font-weight: 600;
  padding: 0.65rem 1.4rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}
.backBtn:hover { background: #dcfce7; }

/* ── Toolbar ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbarBack {
  border: 2px solid #22c55e;
  color: #16a34a;
  background: transparent;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}
.toolbarBack:hover { background: #dcfce7; }

.toolbarTitle {
  flex: 1;
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbarDownload {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  padding: 0.45rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}
.toolbarDownload:hover { opacity: 0.9; transform: translateY(-1px); }

/* ── PDF / embed viewer ── */
.embedWrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.embed {
  flex: 1;
  width: 100%;
  height: calc(100vh - 120px);
  border: none;
  background: white;
}

/* ── Text / Markdown viewer ── */
.textContent {
  flex: 1;
  max-width: 52rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  width: 100%;
}

.textPre {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.95rem;
  line-height: 1.8;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  background: white;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

/* ── Dark mode ── */
[data-theme="dark"] .page          { background: linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#2d1b69 100%); }
[data-theme="dark"] .toolbar       { background: #1f2937; border-color: #374151; }
[data-theme="dark"] .toolbarTitle  { color: #f3f4f6; }
[data-theme="dark"] .missingTitle  { color: #f3f4f6; }
[data-theme="dark"] .textPre       { background: #1f2937; border-color: #374151; color: #f3f4f6; }
[data-theme="dark"] .embed         { background: #111827; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .toolbarTitle { display: none; }
}