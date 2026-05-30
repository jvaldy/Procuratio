import { useState } from 'react';
import { updateCurrentUserPassword } from '../auth/auth';

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

type AccountPasswordFormProps = {
  currentPasswordId: string;
  newPasswordId: string;
  confirmPasswordId: string;
  onSubmitStart?: () => void;
  onSaved: (message: string) => void;
  onError: (message: string | null) => void;
};

export function AccountPasswordForm({
  currentPasswordId,
  newPasswordId,
  confirmPasswordId,
  onSubmitStart,
  onSaved,
  onError,
}: AccountPasswordFormProps) {
  const [form, setForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [isSaving, setIsSaving] = useState(false);

  async function savePassword() {
    setIsSaving(true);
    onSubmitStart?.();
    onError(null);

    try {
      if (form.newPassword !== form.confirmPassword) {
        throw new Error('The new password confirmation does not match.');
      }

      await updateCurrentUserPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(EMPTY_PASSWORD_FORM);
      onSaved('Your password has been updated.');
    } catch (reason) {
      onError((reason as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="form-field form-field-full profile-password-section">
      <div className="profile-password-header">
        <span className="eyebrow">Security</span>
        <h3>Password</h3>
      </div>
      <div className="profile-password-block">
        <label htmlFor={currentPasswordId}>Current password</label>
        <input
          id={currentPasswordId}
          type="password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          placeholder="Current password"
          autoComplete="current-password"
        />
        <div className="profile-password-grid">
          <div className="form-field">
            <label htmlFor={newPasswordId}>New password</label>
            <input
              id={newPasswordId}
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              placeholder="New secure password"
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label htmlFor={confirmPasswordId}>Confirm new password</label>
            <input
              id={confirmPasswordId}
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="profile-password-warning">
          If you are still using the password provided when your account was created, you must change it immediately.
        </p>
        <div className="profile-inline-action">
          <button type="button" className="btn btn-primary" onClick={savePassword} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save new password'}
          </button>
        </div>
      </div>
    </div>
  );
}
