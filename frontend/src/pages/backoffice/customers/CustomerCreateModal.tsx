import type { StoreSummary } from '../../../api/stores';

type CustomerCreateFormState = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  preferredStoreId: string;
};

type CustomerCreateModalProps = {
  createForm: CustomerCreateFormState;
  isOpen: boolean;
  mode?: 'create' | 'edit';
  stores: StoreSummary[];
  onClose: () => void;
  onCreate: () => void;
  onFormChange: (nextValue: CustomerCreateFormState) => void;
};

export function CustomerCreateModal({
  createForm,
  isOpen,
  mode = 'create',
  stores,
  onClose,
  onCreate,
  onFormChange,
}: CustomerCreateModalProps) {
  if (!isOpen) {
    return null;
  }

  const isEdit = mode === 'edit';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card crm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="row crm-modal-head">
          <h3>{isEdit ? 'Edit customer' : 'Create customer'}</h3>
          <button type="button" className="btn-soft" onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <div className="form-field"><label>Full name</label><input value={createForm.fullName} onChange={(event) => onFormChange({ ...createForm, fullName: event.target.value })} placeholder="Sarah Miller" /></div>
          <div className="form-field"><label>Email</label><input value={createForm.email} onChange={(event) => onFormChange({ ...createForm, email: event.target.value })} placeholder="sarah@customer.com" /></div>
          <div className="form-field"><label>Password</label><input type="password" value={createForm.password} onChange={(event) => onFormChange({ ...createForm, password: event.target.value })} placeholder={isEdit ? 'Leave empty to keep current password' : 'Customer2026!'} /></div>
          <div className="form-field"><label>Phone number</label><input value={createForm.phoneNumber} onChange={(event) => onFormChange({ ...createForm, phoneNumber: event.target.value })} placeholder="+33612345678" /></div>
          <div className="form-field"><label>Birth date</label><input type="date" value={createForm.birthDate} onChange={(event) => onFormChange({ ...createForm, birthDate: event.target.value })} /></div>
          <div className="form-field"><label>Preferred store</label><select value={createForm.preferredStoreId} onChange={(event) => onFormChange({ ...createForm, preferredStoreId: event.target.value })}><option value="">No preferred store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>
        </div>
        <div className="row">
          <button className="planning-action-btn planning-action-btn-primary" onClick={onCreate}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
