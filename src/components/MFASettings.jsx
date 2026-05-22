import React, { useState, useEffect } from 'react'
import styles from './MFASettings.module.css'
import { apiJson } from '../services/api'

/**
 * MFASettings Component
 * Allows users to manage their MFA settings
 */
export default function MFASettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [setupStep, setSetupStep] = useState(null) // 'choose', 'configure', 'verify'
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [setupData, setSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  // Fetch MFA settings on mount
  useEffect(() => {
    fetchMFASettings()
  }, [])

  const fetchMFASettings = async () => {
    try {
      setLoading(true)
      const response = await apiJson('/mfa/settings', {
        method: 'GET'
      })
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
      setError('')
      setSuccess('')
      setSelectedMethod(method)

      let body = { mfaMethod: method }
      if (method === 'sms') {
        if (!phoneNumber.trim()) {
          setError('Phone number is required for SMS MFA')
          return
        }
        body.phoneNumber = phoneNumber
      }

      const response = await apiJson('/mfa/setup', {
        method: 'POST',
        body: JSON.stringify(body)
      })

      if (response.success) {
        setSetupData(response.setup)
        setSetupStep('configure')
        if (method === 'totp') {
          setBackupCodes(response.setup.backupCodes || [])
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to setup MFA')
    }
  }

  const verifyMFASetup = async () => {
    try {
      setError('')

      if (!verificationCode.trim()) {
        setError('Please enter verification code')
        return
      }

      const body = {
        mfaMethod: selectedMethod,
        code: verificationCode
      }

      if (selectedMethod === 'totp') {
        body.secret = setupData.secret
        body.backupCodes = backupCodes
      }

      if (selectedMethod === 'sms') {
        body.phoneNumber = phoneNumber
      }

      const response = await apiJson('/mfa/verify-setup', {
        method: 'POST',
        body: JSON.stringify(body)
      })

      if (response.success) {
        setSuccess(response.message)
        setSetupStep(null)
        setVerificationCode('')
        setPhoneNumber('')
        setBackupCodes([])
        setSelectedMethod(null)
        setSetupData(null)
        fetchMFASettings()
      }
    } catch (err) {
      setError(err.message || 'Failed to verify MFA')
    }
  }

  const disableMFAMethod = async (method) => {
    if (!window.confirm(`Are you sure you want to disable ${method.toUpperCase()} MFA?`)) {
      return
    }

    try {
      setError('')
      const response = await apiJson(`/mfa/disable/${method}`, {
        method: 'POST'
      })

      if (response.success) {
        setSuccess(response.message)
        fetchMFASettings()
      }
    } catch (err) {
      setError(err.message || 'Failed to disable MFA')
    }
  }

  const downloadBackupCodes = () => {
    const element = document.createElement('a')
    const file = new Blob(
      [
        'EduHub - Backup Codes\n',
        'Generated: ' + new Date().toISOString() + '\n',
        'Keep these codes safe. Each code can only be used once.\n\n',
        backupCodes.join('\n')
      ],
      { type: 'text/plain' }
    )
    element.href = URL.createObjectURL(file)
    element.download = 'eduhub-backup-codes.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading MFA settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className={styles.errorContainer}>
        <p>Failed to load MFA settings</p>
      </div>
    )
  }

  return (
    <div className={styles.mfaSettingsContainer}>
      <h1 className={styles.heading}>Multi-Factor Authentication</h1>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      {/* MFA Status Overview */}
      <div className={styles.statusCard}>
        <h3>Account Security Status</h3>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>MFA Protection</span>
          <span
            className={`${styles.statusBadge} ${settings.mfa_enabled ? styles.enabled : styles.disabled}`}
          >
            {settings.mfa_enabled ? '✓ Enabled' : '✗ Disabled'}
          </span>
        </div>
      </div>

      {/* Current Methods */}
      <div className={styles.methodsSection}>
        <h2>Current Methods</h2>

        <div className={styles.methodsList}>
          {/* Email MFA */}
          <div className={styles.methodCard}>
            <div className={styles.methodHeader}>
              <span className={styles.icon}>📧</span>
              <span className={styles.methodName}>Email OTP</span>
            </div>
            <p className={styles.methodDescription}>
              Receive one-time codes via email for verification
            </p>
            {settings.email_mfa_enabled ? (
              <>
                <div className={styles.enabledBadge}>✓ Enabled</div>
                <button
                  className={styles.disableButton}
                  onClick={() => disableMFAMethod('email')}
                >
                  Disable Email MFA
                </button>
              </>
            ) : (
              <button
                className={styles.enableButton}
                onClick={() => startMFASetup('email')}
                disabled={setupStep !== null}
              >
                Enable Email MFA
              </button>
            )}
          </div>

          {/* SMS MFA */}
          <div className={styles.methodCard}>
            <div className={styles.methodHeader}>
              <span className={styles.icon}>💬</span>
              <span className={styles.methodName}>SMS OTP</span>
            </div>
            <p className={styles.methodDescription}>
              Receive verification codes via text message
            </p>
            {settings.sms_mfa_enabled ? (
              <>
                <div className={styles.enabledBadge}>
                  ✓ Enabled ({settings.phone_number})
                </div>
                <button
                  className={styles.disableButton}
                  onClick={() => disableMFAMethod('sms')}
                >
                  Disable SMS MFA
                </button>
              </>
            ) : (
              <>
                {setupStep === 'choose' && selectedMethod === 'sms' ? (
                  <div className={styles.setupForm}>
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={styles.phoneInput}
                    />
                    <button
                      className={styles.nextButton}
                      onClick={() => startMFASetup('sms')}
                    >
                      Next
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setSetupStep(null)
                        setSelectedMethod(null)
                        setPhoneNumber('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.enableButton}
                    onClick={() => setSetupStep('choose')}
                    disabled={setupStep !== null}
                  >
                    Enable SMS MFA
                  </button>
                )}
              </>
            )}
          </div>

          {/* TOTP MFA */}
          <div className={styles.methodCard}>
            <div className={styles.methodHeader}>
              <span className={styles.icon}>🔐</span>
              <span className={styles.methodName}>Authenticator App</span>
            </div>
            <p className={styles.methodDescription}>
              Use Google Authenticator, Microsoft Authenticator, or similar apps
            </p>
            {settings.totp_mfa_enabled ? (
              <>
                <div className={styles.enabledBadge}>✓ Enabled</div>
                <button
                  className={styles.disableButton}
                  onClick={() => disableMFAMethod('totp')}
                >
                  Disable Authenticator
                </button>
              </>
            ) : (
              <button
                className={styles.enableButton}
                onClick={() => startMFASetup('totp')}
                disabled={setupStep !== null}
              >
                Enable Authenticator
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Setup Flow */}
      {setupStep === 'configure' && selectedMethod && (
        <div className={styles.setupModal}>
          <div className={styles.setupContent}>
            <h3>Configure {selectedMethod.toUpperCase()} MFA</h3>

            {selectedMethod === 'totp' && setupData && (
              <div className={styles.totpSetup}>
                <h4>Step 1: Scan QR Code</h4>
                <p>
                  Scan this QR code with your authenticator app (Google Authenticator,
                  Microsoft Authenticator, Authy, etc.)
                </p>
                <div className={styles.qrCodeContainer}>
                  <img src={setupData.qrCode} alt="TOTP QR Code" />
                </div>

                <h4>Step 2: Manual Entry (if QR scan fails)</h4>
                <p>Enter this secret key in your authenticator app:</p>
                <div className={styles.secretBox}>
                  <code>{setupData.secret}</code>
                </div>

                <h4>Step 3: Save Backup Codes</h4>
                <p>
                  Save these backup codes in a safe place. You can use them to access your
                  account if you lose access to your authenticator.
                </p>
                <div className={styles.backupCodesDisplay}>
                  {setupData.backupCodes.map((code, idx) => (
                    <code key={idx}>{code}</code>
                  ))}
                </div>
                <button
                  className={styles.downloadButton}
                  onClick={() => {
                    setBackupCodes(setupData.backupCodes)
                    downloadBackupCodes()
                  }}
                >
                  Download Backup Codes
                </button>
              </div>
            )}

            {selectedMethod === 'email' && (
              <div className={styles.otpSetup}>
                <p>An OTP has been sent to your email. Please enter it below.</p>
              </div>
            )}

            {selectedMethod === 'sms' && (
              <div className={styles.otpSetup}>
                <p>An OTP has been sent to your phone. Please enter it below.</p>
              </div>
            )}

            <h4>Step: Enter Verification Code</h4>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className={styles.verificationInput}
            />

            <div className={styles.setupButtonGroup}>
              <button
                className={styles.confirmButton}
                onClick={verifyMFASetup}
                disabled={verificationCode.length < 6}
              >
                Confirm & Enable
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setSetupStep(null)
                  setSelectedMethod(null)
                  setSetupData(null)
                  setVerificationCode('')
                  setBackupCodes([])
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Recommendations */}
      <div className={styles.recommendationsCard}>
        <h3>Security Recommendations</h3>
        <ul>
          <li>✓ Enable at least one MFA method to protect your account</li>
          <li>✓ Use an authenticator app for maximum security</li>
          <li>✓ Enable email or SMS as backup verification methods</li>
          <li>✓ Store backup codes in a secure location</li>
          <li>✓ Review your login activity regularly</li>
        </ul>
      </div>
    </div>
  )
}
