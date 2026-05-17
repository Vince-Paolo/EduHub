import { useState } from "react"
import styles from "./UploadModal.module.css"

export default function UploadModal({ isOpen, onClose, onUpload }) {
  const [fileName, setFileName] = useState("")
  const [moduleName, setModuleName] = useState("")
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (file) => {
    const validTypes = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid file (PDF, DOC, DOCX, or TXT)")
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return false
    }

    setError("")
    return true
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFileName(selectedFile.name)
      setFile(selectedFile)
    } else {
      setFileName("")
      setFile(null)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const selectedFile = e.dataTransfer.files?.[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFileName(selectedFile.name)
      setFile(selectedFile)
    } else {
      setFileName("")
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!fileName) {
      setError("Please select a file first")
      return
    }

    if (!moduleName.trim()) {
      setError("Please enter a module name")
      return
    }

    setUploading(true)
    
    // Simulate upload process
    setTimeout(() => {
      setUploading(false)
      onUpload({
        id: Date.now(),
        title: moduleName,
        desc: `${file.type === "application/pdf" ? "PDF" : "Text"} file · ${(file.size / 1024).toFixed(1)} KB`,
        icon: file.type === "application/pdf" ? "📄" : "📚",
        fileName: file.name,
        fileType: file.type,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString()
      }, file)
      setFileName("")
      setFile(null)
      setModuleName("")
      setError("")
      onClose()
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Upload Module</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label htmlFor="moduleName" className={styles.label}>
              Module Name
            </label>
            <input
              type="text"
              id="moduleName"
              className={styles.input}
              placeholder="e.g., Advanced Python Programming"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Upload File</label>
            <div 
              className={`${styles.dropZone} ${dragActive ? styles.dragActive : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
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
          </div>

          {fileName && (
            <div className={styles.selectedFile}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <p className={styles.fileName}>{fileName}</p>
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

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className={`${styles.uploadBtn} ${uploading ? styles.uploading : ""}`}
            onClick={handleUpload}
            disabled={!fileName || !moduleName.trim() || uploading}
          >
            {uploading ? (
              <>
                <span className={styles.spinner}></span>
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
