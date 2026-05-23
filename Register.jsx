import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import logoHorizontal from "../assets/logo-horizontal.svg"

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required."
    if (!form.username.trim()) newErrors.username = "Username is required."
    else if (form.username.length < 3) newErrors.username = "Username must be at least 3 characters."
    if (!form.email.trim()) newErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Enter a valid email address."
    if (!form.password) newErrors.password = "Password is required."
    else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters."
    if (!form.confirmPassword) newErrors.confirmPassword = "Please confirm your password."
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match."
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError("")

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      await register(form.fullName, form.username, form.email, form.password)
      setSubmitted(true)
      setTimeout(() => navigate("/"), 1800)
    } catch (error) {
      setServerError(error.message || "Registration failed.")
    }
  }

  const fieldStyle = (name) => ({
    width: "100%",
    padding: "0.75rem 1rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    transition: "all 0.2s",
    backgroundColor: "#f9fafb",
    boxSizing: "border-box",
    outline: "none",
    color: "#111827",
    borderColor: errors[name] ? "#ef4444" : "#e5e7eb"
  })

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      padding: "1.5rem"
    }}>
      <div style={{
        background: "white",
        borderRadius: "1rem",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        padding: "2.5rem",
        maxWidth: "460px",
        width: "100%",
        animation: "fadeInUp 0.6s ease-out"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src={logoHorizontal}
            alt="EduHub"
            style={{
              width: "100%",
              maxWidth: "300px",
              height: "auto",
              margin: "0 auto 1rem",
              display: "block"
            }}
          />
          <p style={{ color: "#6b7280", fontSize: "1.05rem", fontWeight: "500" }}>
            Create your account
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", animation: "fadeInUp 0.4s ease-out" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎉</div>
            <h2 style={{ color: "#15803d", fontWeight: "700", fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Account Created!
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <>
            {serverError && (
              <div style={{ padding: "1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", marginBottom: "1rem" }}>
                {serverError}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  style={fieldStyle("fullName")}
                  onFocus={(e) => applyFocus(e, !!errors.fullName)}
                  onBlur={(e) => applyBlur(e, !!errors.fullName)}
                />
                {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
              </div>

              <div>
                <label style={labelStyle}>Username</label>
                <input
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  style={fieldStyle("username")}
                  onFocus={(e) => applyFocus(e, !!errors.username)}
                  onBlur={(e) => applyBlur(e, !!errors.username)}
                />
                {errors.username && <p style={errorStyle}>{errors.username}</p>}
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  style={fieldStyle("email")}
                  onFocus={(e) => applyFocus(e, !!errors.email)}
                  onBlur={(e) => applyBlur(e, !!errors.email)}
                />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password (min. 6 characters)"
                  style={fieldStyle("password")}
                  onFocus={(e) => applyFocus(e, !!errors.password)}
                  onBlur={(e) => applyBlur(e, !!errors.password)}
                />
                {errors.password && <p style={errorStyle}>{errors.password}</p>}
                {form.password && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "2px" }}>
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          style={{
                            flex: 1,
                            height: "4px",
                            borderRadius: "9999px",
                            background: getStrengthColor(form.password, bar),
                            transition: "background 0.3s"
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: getStrengthLabel(form.password).color, margin: 0 }}>
                      {getStrengthLabel(form.password).text}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  style={fieldStyle("confirmPassword")}
                  onFocus={(e) => applyFocus(e, !!errors.confirmPassword)}
                  onBlur={(e) => applyBlur(e, !!errors.confirmPassword)}
                />
                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
                {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                  <p style={{ fontSize: "0.78rem", color: "#22c55e", marginTop: "0.3rem" }}>
                    ✓ Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 6px -1px rgba(34,197,94,0.3)",
                  marginTop: "0.25rem"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)"
                  e.target.style.boxShadow = "0 10px 15px -3px rgba(34,197,94,0.3)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)"
                  e.target.style.boxShadow = "0 4px 6px -1px rgba(34,197,94,0.3)"
                }}
              >
                Create Account
              </button>
            </form>
          </>
        )}

        {!submitted && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Already have an account?
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                style={{
                  background: "white",
                  border: "2px solid #22c55e",
                  color: "#22c55e",
                  padding: "0.5rem 1.5rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { e.target.style.background = "#f0fdf4" }}
                onMouseLeave={(e) => { e.target.style.background = "white" }}
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const labelStyle = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "0.4rem"
}

const errorStyle = {
  fontSize: "0.78rem",
  color: "#ef4444",
  marginTop: "0.3rem"
}

function applyFocus(e, hasError) {
  e.target.style.borderColor = hasError ? "#ef4444" : "#22c55e"
  e.target.style.backgroundColor = "white"
  e.target.style.boxShadow = hasError ? "0 0 0 3px rgba(239,68,68,0.1)" : "0 0 0 3px rgba(34,197,94,0.1)"
}

function applyBlur(e, hasError) {
  e.target.style.borderColor = hasError ? "#ef4444" : "#e5e7eb"
  e.target.style.backgroundColor = "#f9fafb"
  e.target.style.boxShadow = "none"
}

function getStrengthColor(password, bar) {
  const score = getPasswordStrength(password)
  if (score === 0) return "#e5e7eb"
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"]
  return bar <= score ? colors[score - 1] : "#e5e7eb"
}

function getStrengthLabel(password) {
  const score = getPasswordStrength(password)
  const labels = [
    { text: "Too weak", color: "#ef4444" },
    { text: "Weak", color: "#f97316" },
    { text: "Fair", color: "#eab308" },
    { text: "Strong", color: "#22c55e" }
  ]
  return labels[Math.max(0, score - 1)] || labels[0]
}

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}
