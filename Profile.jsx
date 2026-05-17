/* Upload Modal Styles */
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  max-width: 32rem;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.closeBtn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s ease;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closeBtn:hover {
  color: #1f2937;
}

.closeBtn svg {
  width: 100%;
  height: 100%;
}

.content {
  padding: 1.5rem;
}

.formGroup {
  margin-bottom: 1.5rem;
}

.label {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.dropZone {
  position: relative;
}

.fileInput {
  display: none;
}

.dropZoneLabel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 0.5rem;
}

.dropZoneLabel:hover {
  border-color: #22c55e;
  background: #f0fdf4;
}

.dropZoneLabel svg {
  width: 2rem;
  height: 2rem;
  color: #22c55e;
}

.dropZoneLabel span {
  color: #1f2937;
  font-weight: 500;
  font-size: 0.875rem;
}

.dropZoneLabel small {
  color: #6b7280;
  font-size: 0.75rem;
}

.selectedFile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.selectedFile svg {
  width: 1.25rem;
  height: 1.25rem;
  color: #22c55e;
  flex-shrink: 0;
}

.fileName {
  color: #15803d;
  font-weight: 500;
  margin: 0;
  word-break: break-all;
  font-size: 0.875rem;
}

.errorMessage {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.errorMessage svg {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.cancelBtn {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.cancelBtn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.uploadBtn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.uploadBtn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.3);
}

.uploadBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uploading {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Drag Active State */
.dropZone.dragActive .dropZoneLabel {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

/* Dark Mode Styles */
[data-theme="dark"] .modal {
  background: #1f2937;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

[data-theme="dark"] .header {
  border-bottom-color: #374151;
}

[data-theme="dark"] .header h2 {
  color: #f3f4f6;
}

[data-theme="dark"] .closeBtn {
  color: #9ca3af;
}

[data-theme="dark"] .closeBtn:hover {
  color: #f3f4f6;
}

[data-theme="dark"] .label {
  color: #f3f4f6;
}

[data-theme="dark"] .input {
  background: #111827;
  color: #f3f4f6;
  border-color: #374151;
}

[data-theme="dark"] .input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

[data-theme="dark"] .input:disabled {
  background: #111827;
  color: #9ca3af;
}

[data-theme="dark"] .dropZoneLabel {
  background: #111827;
  border-color: #374151;
}

[data-theme="dark"] .dropZoneLabel:hover {
  background: #1f2937;
  border-color: #22c55e;
}

[data-theme="dark"] .dropZoneLabel span {
  color: #f3f4f6;
}

[data-theme="dark"] .dropZoneLabel small {
  color: #9ca3af;
}

[data-theme="dark"] .dropZone.dragActive .dropZoneLabel {
  border-color: #22c55e;
  background: #1f2937;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

[data-theme="dark"] .selectedFile {
  background: #111827;
  border-color: #374151;
}

[data-theme="dark"] .selectedFile svg {
  color: #22c55e;
}

[data-theme="dark"] .fileName {
  color: #86efac;
}

[data-theme="dark"] .errorMessage {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fee2e2;
}

[data-theme="dark"] .footer {
  border-top-color: #374151;
}

[data-theme="dark"] .cancelBtn {
  background: #111827;
  border-color: #374151;
  color: #d1d5db;
}

[data-theme="dark"] .cancelBtn:hover:not(:disabled) {
  background: #1f2937;
  border-color: #4b5563;
}

@media (max-width: 768px) {
  .modal {
    max-width: 90%;
  }

  .footer {
    grid-template-columns: 1fr;
  }
}
