import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import ModuleCard from "../components/ModuleCard"
import { saveModuleFile } from "../services/db"
import { getScopedJson, setScopedJson } from "../services/storage"
import styles from "./Modules.module.css"

export default function Modules() {
  const { user } = useAuth()
  const [modules, setModules] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  useEffect(() => {
    const savedModules = getScopedJson('uploadedModules', user?.uid, [])
    setModules(savedModules)
  }, [user?.uid])

  const handleUploadModule = async (newModule, file) => {
    const updatedModules = [newModule, ...modules]
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)

    if (file) {
      try {
        await saveModuleFile(newModule, file)
      } catch (err) {
        console.warn("Failed to cache module offline:", err)
      }
    }
  }

  const handleDeleteModule = (moduleId) => {
    const updatedModules = modules.filter(m => m.id !== moduleId)
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)
  }

  const handleEditModule = (moduleId, newTitle) => {
    const updatedModules = modules.map(m =>
      m.id === moduleId ? { ...m, title: newTitle } : m
    )
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)
  }

  const ACCEPTED_TYPES = ["application/pdf", "text/plain", "text/markdown"]

  const processFile = async (file) => {
    setUploadError("")
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith(".md")) {
      setUploadError("Only PDF, TXT, or MD files are supported.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.")
      return
    }
    const newModule = {
      id: Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      desc: `${file.type === "application/pdf" ? "PDF" : "Text"} file · ${(file.size / 1024).toFixed(1)} KB`,
      icon: file.type === "application/pdf" ? "📄" : "📝",
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    }
    await handleUploadModule(newModule, file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleFileInput = (e) => processFile(e.target.files[0])

  const filteredModules = modules.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.desc || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={styles.modulesContainer}>
      <Navbar onUpload={handleUploadModule} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />

      <div className={styles.content}>

        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.mainTitle}>My Modules</h1>
              <p className={styles.subtitle}>All your uploaded learning materials</p>
            </div>
          </div>

          {/* Search bar */}
          {modules.length > 0 && (
            <div className={styles.searchRow}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search modules…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className={styles.searchClear} onClick={() => setSearchQuery("")}>✕</button>
                )}
              </div>
              <span className={styles.moduleCount}>
                {filteredModules.length} of {modules.length} module{modules.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {uploadError && (
            <p className={styles.uploadError}>⚠️ {uploadError}</p>
          )}
        </div>

        {/* Empty state */}
        {modules.length === 0 ? (
          <div
            className={`${styles.emptyState} ${isDragging ? styles.emptyStateDragging : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isDragging ? (
              <>
                <div className={styles.emptyIconDrop}>📥</div>
                <h3 className={styles.emptyTitle}>Drop your file here!</h3>
                <p className={styles.emptyDesc}>Release to upload your module</p>
              </>
            ) : (
              <>
                <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <h3 className={styles.emptyTitle}>No modules uploaded yet</h3>
                <p className={styles.emptyDesc}>
                  Drag &amp; drop a file here, or <span className={styles.emptyLink}>click to browse</span>
                </p>
                <p className={styles.emptyFormats}>PDF · TXT · MD &nbsp;|&nbsp; Max 10 MB</p>
              </>
            )}
          </div>

        ) : filteredModules.length === 0 ? (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🔍</div>
            <h3 className={styles.noResultsTitle}>No modules match "{searchQuery}"</h3>
            <p className={styles.noResultsDesc}>Try a different search term</p>
            <button className={styles.clearSearchBtn} onClick={() => setSearchQuery("")}>
              Clear Search
            </button>
          </div>

        ) : (
          <div className={styles.modulesGrid}>
            {filteredModules.map((module, index) => (
              <div key={module.id} className={styles.moduleCardWrapper} style={{ animationDelay: `${index * 0.05}s` }}>
                <ModuleCard
                  module={module}
                  onDelete={handleDeleteModule}
                  onEdit={handleEditModule}
                  isUserModule={true}
                />
              </div>
            ))}

            {/* Add more card */}
            <div
              className={`${styles.addMoreCard} ${isDragging ? styles.addMoreCardDragging : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.addMoreIcon}>+</div>
              <p className={styles.addMoreText}>Upload Module</p>
              <p className={styles.addMoreSub}>PDF · TXT · MD</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}