import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./ModuleCard.module.css"
import {
  saveModuleFile,
  deleteModuleFile,
  listStoredModuleIds,
} from "../services/db"

export default function ModuleCard({ module, onDelete, onEdit, isUserModule }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [isEditModalOpen, setIsEditModalOpen]   = useState(false)
  const [editTitle, setEditTitle]               = useState(module.title)
  const [isStoredOffline, setIsStoredOffline]   = useState(false)
  const [isDownloading, setIsDownloading]       = useState(false)
  const [dlStatus, setDlStatus]                 = useState(null) // null|"saving"|"done"|"error"

  // Check on mount whether this module already has an offline copy
  useEffect(() => {
    listStoredModuleIds()
      .then(ids => setIsStoredOffline(ids.includes(String(module.id))))
      .catch(() => {})
  }, [module.id])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirm(`Delete "${module.title}"? This will also remove the offline copy.`)) {
      deleteModuleFile(module.id).catch(() => {})
      onDelete(module.id)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEditClick = (e) => {
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() && onEdit) {
      onEdit(module.id, editTitle.trim())
      setIsEditModalOpen(false)
    }
  }

  // ── Offline download / remove ─────────────────────────────────────────────
  const handleOfflineClick = (e) => {
    e.stopPropagation()
    if (isStoredOffline) {
      if (confirm(`Remove offline copy of "${module.title}"?`)) {
        deleteModuleFile(module.id)
          .then(() => setIsStoredOffline(false))
          .catch(() => alert("Failed to remove offline copy."))
      }
    } else {
      // Ask user to supply the file so we can store its bytes
      fileInputRef.current?.click()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file) return

    setIsDownloading(true)
    setDlStatus("saving")
    try {
      await saveModuleFile(module, file)
      setIsStoredOffline(true)
      setDlStatus("done")
      setTimeout(() => setDlStatus(null), 2000)
    } catch (err) {
      console.error(err)
      setDlStatus("error")
      setTimeout(() => setDlStatus(null), 2500)
    } finally {
      setIsDownloading(false)
    }
  }

  // ── View offline lesson ───────────────────────────────────────────────────
  const handleViewOffline = (e) => {
    e.stopPropagation()
    navigate(`/offline/${module.id}`)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          month: "numeric", day: "numeric", year: "numeric",
        })
      : null

  return (
    <>
      {/* Hidden file input for offline save */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      <div className={styles.card} onClick={() => navigate(`/quiz-config/${module.id}`)}>

        {/* ── Header row ── */}
        <div className={styles.cardHeader}>
          <div className={styles.icon}>{module.icon || "📚"}</div>

          <div className={styles.buttonGroup}>
            {/* Offline / download button */}
            <button
              className={`${styles.downloadBtn} ${isStoredOffline ? styles.downloadBtnOn : ""}`}
              onClick={handleOfflineClick}
              title={isStoredOffline ? "Stored offline — click to remove" : "Save for offline use"}
              disabled={isDownloading}
            >
              {dlStatus === "saving" ? (
                <div className={styles.downloadSpinner} />
              ) : dlStatus === "done" ? (
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : dlStatus === "error" ? "!" : isStoredOffline ? (
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>

            {/* Edit */}
            {isUserModule && (
              <button className={styles.editBtn} onClick={handleEditClick} title="Rename module">
                <svg className={styles.editSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            {/* Delete */}
            {isUserModule && onDelete && (
              <button className={styles.deleteBtn} onClick={handleDelete} title="Delete module">
                <svg className={styles.deleteSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </div>

          <button className={styles.iconButton} onClick={e => e.stopPropagation()}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* ── Title ── */}
        <h3 className={styles.title}>{module.title}</h3>

        {/* ── Consistent meta: date + size ── */}
        <div className={styles.metaRow}>
          {formatDate(module.uploadedAt) && (
            <span className={styles.metaItem}>
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
                <line x1="8"  y1="2" x2="8"  y2="6" strokeWidth={2} />
                <line x1="3"  y1="10" x2="21" y2="10" strokeWidth={2} />
              </svg>
              {formatDate(module.uploadedAt)}
            </span>
          )}
          {module.fileSize && (
            <span className={styles.metaItem}>
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {module.fileSize}
            </span>
          )}
        </div>

        {/* ── Offline badge ── */}
        {isStoredOffline && (
          <div className={styles.offlineBadge} onClick={handleViewOffline}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Available Offline — View Lesson
          </div>
        )}

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <span className={styles.footerText}>Start Learning</span>
          <svg className={styles.footerSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {isEditModalOpen && (
        <div className={styles.editModalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.editModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.editModalTitle}>Rename Module</h3>
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter")  handleSaveEdit()
                if (e.key === "Escape") setIsEditModalOpen(false)
              }}
              className={styles.editModalInput}
              placeholder="Enter new module name"
            />
            <div className={styles.editModalActions}>
              <button className={styles.editModalCancel} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button className={styles.editModalSave}   onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}