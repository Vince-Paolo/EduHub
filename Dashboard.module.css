import { useNavigate } from "react-router-dom"
import { useState } from "react"
import logoHorizontal from "../assets/logo-horizontal.svg"
import styles from "./Login.module.css"

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = (e) => {
    e.preventDefault()
    if (username.trim()) {
      localStorage.setItem("currentUser", JSON.stringify({
        name: username,
        email: `${username}@eduhub.com`,
        loginTime: new Date().toISOString()
      }))
      navigate("/dashboard")
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

        {/* Form */}
        <form onSubmit={handleLogin} className={styles.form}>
          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className={styles.input}
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

          {/* Sign In Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)"
              e.target.style.boxShadow = "0 10px 15px -3px rgba(34, 197, 94, 0.3)"
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "0 4px 6px -1px rgba(34, 197, 94, 0.3)"
            }}
          >
            Sign In
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
          <p className={styles.signUpText}>
            Don't have an account?
          </p>
          <button
            type="button"
            className={styles.signUpBtn}
            onClick={() => navigate("/register")}
            onMouseEnter={(e) => {
              e.target.style.background = "#f0fdf4"
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white"
            }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}