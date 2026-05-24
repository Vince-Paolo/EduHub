import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import styles from './MFASettings.module.css'
import { apiJson } from '../services/api'

export default function MFASettings() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [settings, setSettings]                 = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState('')
  const [success, setSuccess]                   = useState('')
  const [setupStep, setSetupStep]               = useState(null)
  const [selectedMethod, setSelectedMethod]     = useState(null)
  const [setupData, setSetupData]               = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneNumber, setPhoneNumber]           = useState('')
  const [backupCodes, setBackupCodes]           = useState([])

  useEffect(() => { fetchMFASettings() }, [])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(t)
  }, [success])

  const fetchMFASettings = async () => {
    try {
      setLoading(true)
      const response = await apiJson('/mfa/settings', { method: 'GET' })
      setSettings(response.settings)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to fetch MFA settings')
    } finally {
      setLoading(false)
    }
  }

  const startMFASetup = async (method) => {
    try {
      setError(''); setSuccess('')
      setSelectedMethod(method)
      let body = { mfaMethod: method }
      if (method === 'email') {
        if (!user?.email) {
          setError('Unable to resolve your account email. Please refresh the page and try again.')
          return
        }
        body.email = user.email
      }
      if (method === 'sms') {
        if (!phoneNumber.trim()) { setError('Phone number is required for SMS MFA'); return }
        body.phoneNumber = phoneNumber
      }
      const response = await apiJson('/mfa/setup', { method: 'POST', body: JSON.stringify(body) })
      if (response.success) {
        setSetupData(response.setup)
        setSetupStep('configure')
        if (method === 'totp') setBackupCodes(response.setup.backupCodes || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to setup MFA')
    }
  }

  const verifyMFASetup = async () => {
    try {
      setError('')
      if (!verificationCode.trim()) { setError('Please enter the verification code'); return }
      const body = { mfaMethod: selectedMethod, code: verificationCode }
      if (selectedMethod === 'totp') { body.secret = setupData.secret; body.backupCodes = backupCodes }
      if (selectedMethod === 'sms')  { body.phoneNumber = phoneNumber }
      const response = await apiJson('/mfa/verify-setup', { method: 'POST', body: JSON.stringify(body) })
      if (response.success) {
        setSuccess(response.message || 'MFA method enabled successfully!')
        closeSetup()
        fetchMFASettings()
      }
    } catch (err) {
      setError(err.message || 'Failed to verify MFA')
    }
  }

  const disableMFAMethod = async (method) => {
    if (!window.confirm(`Disable ${method.toUpperCase()} MFA?`)) return
    try {
      setError('')
      const response = await apiJson(`/mfa/disable/${method}`, { method: 'POST' })
      if (response.success) { setSuccess(response.message); fetchMFASettings() }
    } catch (err) {
      setError(err.message || 'Failed to disable MFA')
    }
  }

  const downloadBackupCodes = () => {
    const el   = document.createElement('a')
    const file = new Blob(
      ['EduHub - Backup Codes\nGenerated: ' + new Date().toISOString() +
       '\nKeep these codes safe. Each can only be used once.\n\n' + backupCodes.join('\n')],
      { type: 'text/plain' }
    )
    el.href = URL.createObjectURL(file)
    el.download = 'eduhub-backup-codes.txt'
    document.body.appendChild(el); el.click(); document.body.removeChild(el)
  }

  const closeSetup = () => {
    setSetupStep(null); setSelectedMethod(null); setSetupData(null)
    setVerificationCode(''); setPhoneNumber(''); setBackupCodes([])
  }

  if (loading) return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading security settings…</p>
      </div>
    </div>
  )

  if (!settings) return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.errorContainer}>
        <p>⚠️ Failed to load MFA settings</p>
        <button className={styles.backBtn} onClick={fetchMFASettings}>Retry</button>
      </div>
    </div>
  )

  const METHODS = [
    {
      key: 'email', icon: '📧', name: 'Email OTP',
      desc: user?.email
        ? `Receive one-time codes at ${user.email}`
        : 'Receive one-time codes to your email address',
      enabledKey: 'email_mfa_enabled'
    },
    { key: 'sms',   icon: '💬', name: 'SMS OTP',           desc: 'Receive verification codes via text message',    enabledKey: 'sms_mfa_enabled'   },
    { key: 'totp',  icon: '🔐', name: 'Authenticator App', desc: 'Use Google Authenticator, Authy, or similar',    enabledKey: 'totp_mfa_enabled'  },
  ]

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.content}>

        {/* ── Back ── */}
        <button className={styles.backBtn} onClick={() => navigate('/profile')}>
          ← Back to Profile
        </button>

        {/* ── Header ── */}
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Multi-Factor Authentication</h1>
          <p className={styles.pageSubtitle}>
            Add an extra layer of security to your account by enabling one or more verification methods.
          </p>
        </div>

        {/* ── Alerts ── */}
        {error   && <div className={styles.errorAlert}>⚠️ {error}</div>}
        {success && <div className={styles.successAlert}>✅ {success}</div>}

        {/* ── Status ── */}
        <div className={styles.card} style={{ animationDelay: '0.05s' }}>
          <p className={styles.cardTitle}>Account Security Status</p>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>🛡️ MFA Protection</span>
            <span className={`${styles.statusBadge} ${settings.mfa_enabled ? styles.enabled : styles.disabled}`}>
              {settings.mfa_enabled ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
        </div>

        {/* ── Methods ── */}
        <div className={styles.card} style={{ animationDelay: '0.1s' }}>
          <p className={styles.cardTitle}>Verification Methods</p>
          <div className={styles.methodsGrid}>
            {METHODS.map(m => {
              const isEnabled = settings[m.enabledKey]
              const isSmsChooser = m.key === 'sms' && setupStep === 'choose' && selectedMethod === 'sms'

              return (
                <div key={m.key} className={styles.methodCard}>
                  <div className={styles.methodHeader}>
                    <div className={styles.methodIcon}>{m.icon}</div>
                    <span className={styles.methodName}>{m.name}</span>
                  </div>
                  <p className={styles.methodDesc}>{m.desc}</p>

                  {isEnabled && (
                    <div className={styles.enabledBadge}>
                      ✓ {m.key === 'sms' && settings.phone_number ? settings.phone_number : 'Enabled'}
                    </div>
                  )}

                  {isSmsChooser && (
                    <div className={styles.phoneSetup}>
                      <input
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className={styles.phoneInput}
                      />
                      <button className={styles.nextBtn} onClick={() => startMFASetup('sms')}>
                        Send Verification Code
                      </button>
                      <button className={styles.cancelBtn} onClick={closeSetup}>Cancel</button>
                    </div>
                  )}

                  {isEnabled ? (
                    <button className={styles.disableBtn} onClick={() => disableMFAMethod(m.key)}>
                      Disable {m.name}
                    </button>
                  ) : !isSmsChooser && (
                    <button
                      className={styles.enableBtn}
                      onClick={() =>
                        m.key === 'sms'
                          ? (setSetupStep('choose'), setSelectedMethod('sms'))
                          : startMFASetup(m.key)
                      }
                      disabled={setupStep !== null && !isSmsChooser}
                    >
                      Enable {m.name}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Recommendations ── */}
        <div className={styles.recoCard}>
          <p className={styles.recoTitle}>💡 Security Recommendations</p>
          <ul className={styles.recoList}>
            {[
              'Enable at least one MFA method to protect your account',
              'Use an authenticator app (TOTP) for maximum security',
              'Enable email or SMS as a backup verification method',
              'Store backup codes in a secure, offline location',
              'Review your account login activity regularly',
            ].map((item, i) => (
              <li key={i} className={styles.recoItem}><span>✓</span><span>{item}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Setup Modal ── */}
      {setupStep === 'configure' && selectedMethod && (
        <div className={styles.modalOverlay} onClick={closeSetup}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

            <h3 className={styles.modalTitle}>
              {selectedMethod === 'totp' ? '🔐' : selectedMethod === 'email' ? '📧' : '💬'}
              &nbsp;Configure {selectedMethod === 'totp' ? 'Authenticator App' : selectedMethod === 'email' ? 'Email OTP' : 'SMS OTP'}
            </h3>

            {/* TOTP */}
            {selectedMethod === 'totp' && setupData && (
              <>
                <div className={styles.modalSection}>
                  <p className={styles.modalSectionLabel}>Step 1 — Scan QR Code</p>
                  <p className={styles.modalSectionDesc}>Open your authenticator app and scan this QR code.</p>
                  <div className={styles.qrWrapper}>
                    <img src={setupData.qrCode} alt="TOTP QR Code" />
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <p className={styles.modalSectionLabel}>Step 2 — Manual Entry</p>
                  <p className={styles.modalSectionDesc}>Can't scan? Enter this secret key manually.</p>
                  <div className={styles.secretBox}>{setupData.secret}</div>
                </div>

                <div className={styles.modalSection}>
                  <p className={styles.modalSectionLabel}>Step 3 — Save Backup Codes</p>
                  <p className={styles.modalSectionDesc}>Store these safely — each can only be used once.</p>
                  <div className={styles.backupGrid}>
                    {setupData.backupCodes.map((code, i) => (
                      <div key={i} className={styles.backupCode}>{code}</div>
                    ))}
                  </div>
                  <button
                    className={styles.downloadBtn}
                    onClick={() => { setBackupCodes(setupData.backupCodes); downloadBackupCodes() }}
                  >
                    ⬇ Download Backup Codes
                  </button>
                </div>
              </>
            )}

            {/* Email / SMS */}
            {(selectedMethod === 'email' || selectedMethod === 'sms') && (
              <div className={styles.modalSection}>
                <div className={styles.infoBox}>
                  {selectedMethod === 'email'
                    ? '📧 A verification code has been sent to your email address.'
                    : '💬 A verification code has been sent to your phone.'}
                  {setupData?.message && <><br /><br />{setupData.message}</>}
                </div>
              </div>
            )}

            <div className={styles.modalSection}>
              <p className={styles.modalSectionLabel}>
                {selectedMethod === 'totp' ? 'Step 4 — ' : ''}Enter Verification Code
              </p>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="000000"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className={styles.verifyInput}
              />
            </div>

            {error && <div className={styles.errorAlert} style={{ marginBottom: '0.75rem' }}>⚠️ {error}</div>}

            <div className={styles.modalBtnRow}>
              <button className={styles.cancelBtn} onClick={closeSetup}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={verifyMFASetup}
                disabled={verificationCode.length < 6}
              >
                Confirm & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}