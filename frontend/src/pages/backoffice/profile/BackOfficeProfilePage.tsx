import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateCurrentUserPreferences, type CurrentUser } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { InlineNotification } from '../../../ui/InlineNotification';

function getRoleLabel(user: CurrentUser): string {
  if (user.roles.includes('ROLE_ADMIN')) {
    return 'Manager';
  }
  if (user.roles.includes('ROLE_EMPLOYEE')) {
    return 'Employee';
  }
  return user.primaryRole.replace('ROLE_', '').toLowerCase();
}

export function BackOfficeProfilePage() {
  useDocumentMeta({
    title: 'Procuratio - Back Office Profile',
    description: 'Manage your back-office account, preferences and contact details.',
  });

  const { user, loading } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    setPhoneNumber(user?.phoneNumber || '');
  }, [user?.phoneNumber]);

  const roleLabel = useMemo(() => (user ? getRoleLabel(user) : ''), [user]);

  async function savePreference(payload: Parameters<typeof updateCurrentUserPreferences>[0]) {
    setError(null);

    try {
      await updateCurrentUserPreferences(payload);
      window.location.reload();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function savePhoneNumber() {
    setPhoneSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateCurrentUserPreferences({ phoneNumber: phoneNumber.trim() || null });
      setMessage('Your phone number has been updated.');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPhoneSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel profile-card profile-card-compact">
        <div className="profile-card-header">
          <div>
            <h2 className="ecommerce-title">Your account</h2>
            <p className="muted">Keep your back-office preferences and contact details up to date.</p>
          </div>
          {user && <span className="status-badge active">{roleLabel}</span>}
        </div>

        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
        {loading && <p className="muted">Loading your profile...</p>}

        {!loading && user && (
          <>
            <div className="profile-grid profile-grid-compact">
              <div className="profile-item">
                <span>Name</span>
                <strong>{user.displayName}</strong>
              </div>
              <div className="profile-item">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="profile-item">
                <span>Phone</span>
                <strong>{user.phoneNumber || 'Not provided yet'}</strong>
              </div>
              <div className="profile-item">
                <span>Store</span>
                <strong>{user.preferredStore?.name || 'Managed from employee records'}</strong>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="bo-profile-theme">Theme</label>
                <select
                  id="bo-profile-theme"
                  value={user.preferences.theme}
                  onChange={(event) => {
                    savePreference({ theme: event.target.value });
                  }}
                >
                  <option value="soft">Soft</option>
                  <option value="ocean">Ocean</option>
                  <option value="sunset">Sunset</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="bo-profile-font-size">Font size</label>
                <select
                  id="bo-profile-font-size"
                  value={user.preferences.fontSize}
                  onChange={(event) => {
                    savePreference({ fontSize: event.target.value });
                  }}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="bo-profile-phone">Phone number</label>
                <input
                  id="bo-profile-phone"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+33612345678"
                />
                <div className="profile-inline-action">
                  <button type="button" className="btn btn-primary" onClick={savePhoneNumber} disabled={phoneSaving}>
                    {phoneSaving ? 'Saving...' : 'Save phone number'}
                  </button>
                </div>
              </div>
            </div>

            <div className="profile-mini-grid">
              <article className="customer-file-item-card">
                <span className="muted">Workspace summary</span>
                <strong>{roleLabel}</strong>
                <span>{user.preferredStore?.name || 'Store managed from employee records'}</span>
                <span>{user.preferences.theme} theme · {user.preferences.fontSize} text</span>
              </article>

              <article className="customer-file-item-card">
                <span className="muted">Quick access</span>
                <Link to="/backoffice/pos" className="cta-link cta-link-secondary">Open cash</Link>
                <Link to="/backoffice/planning" className="cta-link cta-link-secondary">Open planning</Link>
                <Link to="/backoffice/warehouse" className="cta-link cta-link-secondary">Open warehouse</Link>
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
