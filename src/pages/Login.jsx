import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import logoHorizontal from "../assets/logo-horizontal.svg"
import styles from "./Login.module.css"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login, user } = useAuth()

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
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