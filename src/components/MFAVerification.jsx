import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './MFAVerification.module.css'
import { apiJson } from '../services/api'

/**
 * MFAVerification Component
 * Handles verification of MFA codes during login
 * Supports: Email OTP, SMS OTP, and Backup Codes
 */
export default function MFAVerification({
  userId,
  mfaMethods,
  onSuccess,
  onCancel,
  email
}) {
  const [verificationCode, setVerificationCode] = useState('')
  const [selectedMethod, setSelectedMethod] = useState(
    mfaMethods.email ? 'email' : mfaMethods.sms ? 'sms' : 'backup'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [resendCount, setResendCount] = useState(0)
  const [resendTimer, setResendTimer] = useState(0)
  const lastAutoSentMethod = useRef(null)

  const isGmailUser = email?.toLowerCase().endsWith('@gmail.com')

  const getOtpStatusMessage = (method, responseMessage) => {
    if (method === 'email') {
      if (isGmailUser) {
        return responseMessage || `A code has been sent from your Gmail account (${email}). Check your Gmail inbox and spam folder.`
      }
      return responseMessage || `A code has been sent to your email (${email}).`
    }
    if (method === 'sms') {
      return responseMessage || 'A code has been sent to your phone.'
    }
    return responseMessage || 'A verification code has been sent.'
  }

  // Handle resending OTP
  const handleResendOTP = async () => {
    try {
      setLoading(true)
      setError('')
      setStatusMessage('')

      const response = await apiJson('/mfa/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          method: selectedMethod
        })
      })

      setOtpSent(true)
      setResendCount(prev => prev + 1)
      setResendTimer(60)
      setStatusMessage(getOtpStatusMessage(selectedMethod, response?.message))

      // Countdown timer
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      lastAutoSentMethod.current = null
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const { setUserAfterMFA } = useAuth()

  useEffect(() => {
    if (
      (selectedMethod === 'email' || selectedMethod === 'sms') &&
      !otpSent &&
      lastAutoSentMethod.current !== selectedMethod
    ) {
      lastAutoSentMethod.current = selectedMethod
      handleResendOTP()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod, otpSent, userId])

  // Handle verification
  const handleVerify = async (e) => {
    e.preventDefault()

    if (!verificationCode.trim()) {
      setError('Please enter verification code')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await apiJson('/mfa/verify-login', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          code: verificationCode.trim(),
          method: selectedMethod
        })
      })

      if (response.success && response.user) {
        setUserAfterMFA(response.user)
        onSuccess(response.user)
      } else {
        setError(response.error || 'Verification failed')
      }
    } catch (err) {
      setError(err.message || 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  // Handle method change
  const handleMethodChange = (method) => {
    setSelectedMethod(method)
    setVerificationCode('')
    setError('')
    setStatusMessage('')
    setOtpSent(false)
  }

  return (
    <div className={styles.mfaVerificationContainer}>
      <div className={styles.mfaCard}>
        <h2 className={styles.title}>Multi-Factor Authentication</h2>
        <p className={styles.subtitle}>
          Verify your identity using one of your registered methods
        </p>

        {/* Method Selection */}
        <div className={styles.methodSelector}>
          {mfaMethods.email && (
            <button
              type="button"
              className={`${styles.methodButton} ${selectedMethod === 'email' ? styles.active : ''}`}
              onClick={() => handleMethodChange('email')}
            >
              <span className={styles.icon}>📧</span>
              <span>Email</span>
            </button>
          )}

          {mfaMethods.sms && (
            <button
              type="button"
              className={`${styles.methodButton} ${selectedMethod === 'sms' ? styles.active : ''}`}
              onClick={() => handleMethodChange('sms')}
            >
              <span className={styles.icon}>💬</span>
              <span>Text Message</span>
            </button>
          )}

          <button
            type="button"
            className={`${styles.methodButton} ${selectedMethod === 'backup' ? styles.active : ''}`}
            onClick={() => handleMethodChange('backup')}
          >
            <span className={styles.icon}>🔑</span>
            <span>Backup Code</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && <div className={styles.errorAlert}>{error}</div>}
        {statusMessage && <div className={styles.infoAlert}>{statusMessage}</div>}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className={styles.form}>
          {selectedMethod === 'email' && (
            <div className={styles.inputGroup}>
              <label>Enter code sent to your email</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ''))
                }
                className={styles.codeInput}
              />
              {!otpSent && (
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Send Code to Email
                </button>
              )}
              {otpSent && resendTimer > 0 && (
                <p className={styles.resendInfo}>
                  Resend code in {resendTimer}s
                </p>
              )}
              {otpSent && resendTimer === 0 && resendCount > 0 && (
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Resend Code
                </button>
              )}
            </div>
          )}

          {selectedMethod === 'sms' && (
            <div className={styles.inputGroup}>
              <label>Enter code sent to your phone</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ''))
                }
                className={styles.codeInput}
              />
              {!otpSent && (
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Send Code via SMS
                </button>
              )}
              {otpSent && resendTimer > 0 && (
                <p className={styles.resendInfo}>
                  Resend code in {resendTimer}s
                </p>
              )}
              {otpSent && resendTimer === 0 && resendCount > 0 && (
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Resend Code
                </button>
              )}
            </div>
          )}

          {selectedMethod === 'backup' && (
            <div className={styles.inputGroup}>
              <label>Enter one of your backup codes</label>
              <input
                type="text"
                placeholder="XXXX-XXXX"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                className={styles.backupCodeInput}
              />
              <p className={styles.backupCodeInfo}>
                Backup codes are 8-character codes. Using a backup code will reduce the number
                of remaining codes.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={loading || !verificationCode}
              className={styles.verifyButton}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>

        <p className={styles.securityNote}>
          🔒 Your authentication method is secure and encrypted
        </p>
      </div>
    </div>
  )
}
