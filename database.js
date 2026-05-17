/* Login Page Styles */
.loginContainer {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 1rem;
  animation: fadeIn 0.8s ease-out;
}

.loginCard {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2.5rem;
  max-width: 420px;
  width: 100%;
  animation: slideUp 0.6s ease-out;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  width: 100%;
  max-width: 300px;
  height: auto;
  margin: 0 auto 1rem;
  display: block;
}

.subtitle {
  color: #6b7280;
  font-size: 1.125rem;
  font-weight: 500;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.formGroup {
  display: flex;
  flex-direction: column;
}

.label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #f9fafb;
  box-sizing: border-box;
  outline: none;
}

.input:focus {
  border-color: #22c55e;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.input:hover {
  background-color: white;
}

.submitBtn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.3);
  margin-top: 0.5rem;
}

.submitBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3);
}

.submitBtn:active {
  transform: translateY(0);
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: #d1d5db;
}

.dividerLine {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.dividerText {
  font-size: 0.875rem;
  color: #9ca3af;
}

.signUpSection {
  text-align: center;
}

.signUpText {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.signUpBtn {
  background: white;
  border: 2px solid #22c55e;
  color: #22c55e;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.signUpBtn:hover {
  background: #f0fdf4;
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
