// pages/OfflineLessonViewer.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { getModuleViewerData } from '../services/db'
import styles from './OfflineLessonViewer.module.css'

export default function OfflineLessonViewer() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const objUrlRef  = useRef(null)   // track so we can revoke on unmount

  const [phase, setPhase]   = useState('loading')   // loading | ready | error | missing
  const [data, setData]     = useState(null)         // { url, type, name }
  const [textContent, setTextContent] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await getModuleViewerData(id)
        if (cancelled) return

        if (!result) {
          setPhase('missing')
          return
        }

        objUrlRef.current = result.url

        // For text files, fetch the text so we can render it nicely
        if (result.type === 'text/plain' || result.type === 'text/markdown' || result.name?.endsWith('.md')) {
          const res  = await fetch(result.url)
          const text = await res.text()
          if (!cancelled) {
            setTextContent(text)
            setData(result)
            setPhase('text')
          }
        } else {
          // PDFs and other binary types → show in <iframe>
          if (!cancelled) {
            setData(result)
            setPhase('embed')
          }
        }
      } catch (err) {
        console.error('OfflineLessonViewer error:', err)
        if (!cancelled) setPhase('error')
      }
    }

    load()

    return () => {
      cancelled = true
      // Revoke object URL to free memory
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current)
        objUrlRef.current = null
      }
    }
  }, [id])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.centred}>
          <div className={styles.spinner} />
          <p>Loading offline lesson…</p>
        </div>
      </div>
    )
  }

  // ── Missing ───────────────────────────────────────────────────────────────
  if (phase === 'missing') {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.centred}>
          <div className={styles.missingIcon}>📭</div>
          <h2 className={styles.missingTitle}>No offline copy found</h2>
          <p className={styles.missingDesc}>
            This module hasn't been saved for offline use yet. Open the module card and click the
            download icon, then select the file to store it.
          </p>
          <button className={styles.backBtn} onClick={() => navigate('/modules')}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.centred}>
          <div className={styles.missingIcon}>⚠️</div>
          <h2 className={styles.missingTitle}>Failed to load lesson</h2>
          <p className={styles.missingDesc}>There was a problem reading the stored file.</p>
          <button className={styles.backBtn} onClick={() => navigate('/modules')}>← Back</button>
        </div>
      </div>
    )
  }

  // ── Text / Markdown ───────────────────────────────────────────────────────
  if (phase === 'text') {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.toolbar}>
          <button className={styles.toolbarBack} onClick={() => navigate(-1)}>← Back</button>
          <span className={styles.toolbarTitle}>{data.name}</span>
          <a href={data.url} download={data.name} className={styles.toolbarDownload}>
            ⬇ Download
          </a>
        </div>
        <div className={styles.textContent}>
          <pre className={styles.textPre}>{textContent}</pre>
        </div>
      </div>
    )
  }

  // ── PDF / binary embed ────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.toolbar}>
        <button className={styles.toolbarBack} onClick={() => navigate(-1)}>← Back</button>
        <span className={styles.toolbarTitle}>{data?.name}</span>
        {data?.url && (
          <a href={data.url} download={data.name} className={styles.toolbarDownload}>
            ⬇ Download
          </a>
        )}
      </div>
      <div className={styles.embedWrapper}>
        <iframe
          src={data?.url}
          title={data?.name}
          className={styles.embed}
        />
      </div>
    </div>
  )
}