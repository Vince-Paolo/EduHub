import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import MFAVerification from "../components/MFAVerification"
import logoHorizontal from "../assets/logo-horizontal.svg"
import styles from "./Login.module.css"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false)
  const [tempUser, setTempUser] = useState(null)
  const [mfaMethods, setMfaMethods] = useState({})
  const [initialOtpSent, setInitialOtpSent] = useState(false)
  const [mfaMessage, setMfaMessage] = useState('')

  // Ref that stays true for the entire MFA flow, preventing the useEffect
  // from redirecting while MFA state transitions are mid-flight (e.g. between
  // setMfaRequired(false) and navigate() in handleMFASuccess).
  const mfaFlowActive = useRef(false)

  const { login, user } = useAuth()

  useEffect(() => {
    // Guard: never redirect while the MFA flow is active — even if mfaRequired
    // is momentarily false during the handleMFASuccess state transition — and
    // require tempUser to be cleared so a stale auth-context user can't sneak
    // past an in-progress MFA challenge.
    if (user && !mfaRequired && !mfaFlowActive.current && tempUser === null) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, navigate, mfaRequired, tempUser])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await login(email.trim(), password)

      if (data?.mfaRequired) {
        if (!data.user?.id) {
          throw new Error("Server returned MFA required but no user — please try again.")
        }
        mfaFlowActive.current = true   // block useEffect redirects for entire MFA flow
        setTempUser(data.user)
        setMfaMethods(data.mfaMethods || {})
        setInitialOtpSent(Boolean(data.otpSent))
        setMfaMessage(data.message || '')
        setMfaRequired(true)
        return
      }

      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  const handleMFASuccess = (verifiedUser) => {
    // MFA fully verified: lock out the useEffect redirect guard, clear all MFA
    // state synchronously, then navigate. The ref prevents any async render
    // cycle between setMfaRequired(false) and navigate() from redirecting via
    // the effect with a partially-reset state.
    if (!verifiedUser?.id) {
      // Defensive: onSuccess should never be called without a valid user object.
      setError("Authentication error — please try again.")
      handleMFACancel()
      return
    }
    mfaFlowActive.current = false
    setMfaRequired(false)
    setTempUser(null)
    navigate("/dashboard", { replace: true })
  }

  const handleMFACancel = () => {
    mfaFlowActive.current = false
    setMfaRequired(false)
    setTempUser(null)
    setMfaMethods({})
    setInitialOtpSent(false)
    setMfaMessage('')
    setError("")
  }

  if (mfaRequired && tempUser) {
    return (
      <MFAVerification
        userId={tempUser.id}
        mfaMethods={mfaMethods}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        email={tempUser.email}
        initialOtpSent={initialOtpSent}
        initialStatusMessage={mfaMessage}
      />
    )
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div className={styles.header}>
          <img src={logoHorizontal} alt="EduHub" className={styles.logo} />
          <p className={styles.subtitle}>Learn anywhere, anytime</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className={styles.form}>
          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={styles.input}
              required
              autoComplete="email"
              onFocus={(e) => {
                e.target.style.borderColor = "#22c55e"
                e.target.style.backgroundColor = "white"
                e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb"
                e.target.style.backgroundColor = "#f9fafb"
                e.target.style.boxShadow = "none"
              }}
            />
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={styles.input}
              required
              autoComplete="current-password"
              onFocus={(e) => {
                e.target.style.borderColor = "#22c55e"
                e.target.style.backgroundColor = "white"
                e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb"
                e.target.style.backgroundColor = "#f9fafb"
                e.target.style.boxShadow = "none"
              }}
            />
          </div>

          {/* Forgot Password */}
          <div className={styles.forgotPassword}>
            <button
              type="button"
              className={styles.forgotBtn}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)"
                e.target.style.boxShadow = "0 10px 15px -3px rgba(34, 197, 94, 0.3)"
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>or</span>
          <div className={styles.dividerLine}></div>
        </div>

        {/* Sign Up */}
        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>Don't have an account?</p>
          <button
            type="button"
            className={styles.signUpBtn}
            onClick={() => navigate("/register")}
            onMouseEnter={(e) => { e.target.style.background = "#f0fdf4" }}
            onMouseLeave={(e) => { e.target.style.background = "white" }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}