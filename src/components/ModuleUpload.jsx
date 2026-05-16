import { useState } from "react"
import styles from "./ModuleUpload.module.css"

export default function ModuleUpload({ onModuleUpload }) {
  const [fileName, setFileName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (PDF, DOC, DOCX, TXT)
      const validTypes = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
      
      if (!validTypes.includes(file.type)) {
        setError("Please upload a valid file (PDF, DOC, DOCX, or TXT)")
        setFileName("")
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        setFileName("")
        return
      }

      setError("")
      setFileName(file.name)
    }
  }

  const handleUpload = async () => {
    if (!fileName) {
      setError("Please select a file first")
      return
    }

    setUploading(true)
    
    // Simulate upload process
    setTimeout(() => {
      setUploading(false)
      // Call the parent callback with mock data
      onModuleUpload({
        name: fileName,
        uploadedAt: new Date().toLocaleDateString(),
        size: "2.5 MB"
      })
      setFileName("")
    }, 2000)
  }

  return (
    <div className={styles.uploadCard}>
      <div className={styles.uploadHeader}>
        <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <h3 className={styles.uploadTitle}>Upload Module</h3>
      </div>

      <div className={styles.uploadContent}>
        <p className={styles.uploadSubtitle}>Upload your course material to generate an AI-powered quiz</p>

        <div className={styles.dropZone}>
          <input
            type="file"
            id="fileInput"
            className={styles.fileInput}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          />
          <label htmlFor="fileInput" className={styles.dropZoneLabel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Click to upload or drag and drop</span>
            <small>PDF, DOC, DOCX or TXT (Max 10MB)</small>
          </label>
        </div>

        {fileName && (
          <div className={styles.selectedFile}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{fileName}</p>
              <p className={styles.fileSize}>Ready to upload</p>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <button
        className={`${styles.uploadBtn} ${uploading ? styles.uploading : ""}`}
        onClick={handleUpload}
        disabled={!fileName || uploading}
      >
        {uploading ? (
          <>
            <span className={styles.spinner}></span>
            Uploading...
          </>
        ) : (
          "Generate Quiz"
        )}
      </button>
    </div>
  )
}
