import { FormEvent, useEffect, useMemo, useState } from 'react';
import { hasRole } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import {
  consumeGiftVoucher,
  createCampaign,
  createGiftVoucher,
  createLoyaltyEvent,
  createReminderRule,
  launchCampaign,
  listCampaigns,
  listGiftVouchers,
  listLoyaltyAccounts,
  listNotificationLogs,
  listReminderRules,
  runReminders,
} from '../../../api/crm';
import { searchCustomers } from '../../../api/pos';
import { InlineNotification } from '../../../ui/InlineNotification';

type ModalKey = 'loyalty' | 'campaigns' | 'vouchers' | 'rules' | 'logs' | null;
type SortDirection = 'asc' | 'desc';

type LoyaltyRow = { id: number; customerId: number; customerName: string; pointsBalance: number };
type CampaignRow = { id: number; name: string; channel: string; status: string; sentCount: number; targetCount: number };
type VoucherRow = { id: number; code: string; status: string; balanceAmount: number };
type RuleRow = { id: number; name: string; channel: string; offsetHours: number };
type LogRow = { id: number; kind: string; channel: string; status: string; createdAt: string };
type CustomerSearchRow = { id: number; fullName: string; email: string; phoneNumber: string | null };

const EMPTY_EVENT_FORM = { customerId: '', type: 'earn', points: '', reason: '' };
const EMPTY_CAMPAIGN_FORM = { name: '', channel: 'email', minPoints: '', messageTemplate: '' };
const EMPTY_VOUCHER_FORM = { amount: '', customerId: '', expiresAt: '' };
const EMPTY_RULE_FORM = { name: 'Rappel J-1', channel: 'email', offsetHours: '24' };

function sortRows<T>(rows: T[], key: keyof T, direction: SortDirection): T[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key] as unknown;
    const bv = b[key] as unknown;

    if (typeof av === 'number' && typeof bv === 'number') {
      return av - bv;
    }

    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv, 'fr', { sensitivity: 'base' });
    }

    return String(av).localeCompare(String(bv), 'fr', { sensitivity: 'base' });
  });

  return direction === 'asc' ? sorted : sorted.reverse();
}

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CrmPage() {
  const { user } = useCurrentUser();
  const canManage = user ? hasRole(user.roles, 'ROLE_ADMIN') : false;

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  const [loyalty, setLoyalty] = useState<LoyaltyRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loyaltyCustomerMatches, setLoyaltyCustomerMatches] = useState<CustomerSearchRow[]>([]);

  const [loyaltyFilters, setLoyaltyFilters] = useState(() => getStored('crm.loyaltyFilters', { customer: '', pointsMin: '' }));
  const [campaignFilters, setCampaignFilters] = useState(() => getStored('crm.campaignFilters', { name: '', channel: '', status: '' }));
  const [voucherFilters, setVoucherFilters] = useState(() => getStored('crm.voucherFilters', { code: '', status: '' }));
  const [ruleFilters, setRuleFilters] = useState(() => getStored('crm.ruleFilters', { name: '', channel: '' }));
  const [logFilters, setLogFilters] = useState(() => getStored('crm.logFilters', { kind: '', channel: '', status: '' }));

  const [loyaltySort, setLoyaltySort] = useState(() => getStored<{ key: keyof LoyaltyRow; dir: SortDirection }>('crm.loyaltySort', { key: 'customerName', dir: 'asc' }));
  const [campaignSort, setCampaignSort] = useState(() => getStored<{ key: keyof CampaignRow; dir: SortDirection }>('crm.campaignSort', { key: 'name', dir: 'asc' }));
  const [voucherSort, setVoucherSort] = useState(() => getStored<{ key: keyof VoucherRow; dir: SortDirection }>('crm.voucherSort', { key: 'code', dir: 'asc' }));
  const [ruleSort, setRuleSort] = useState(() => getStored<{ key: keyof RuleRow; dir: SortDirection }>('crm.ruleSort', { key: 'name', dir: 'asc' }));
  const [logSort, setLogSort] = useState(() => getStored<{ key: keyof LogRow; dir: SortDirection }>('crm.logSort', { key: 'createdAt', dir: 'desc' }));

  const [loyaltyPage, setLoyaltyPage] = useState(1);
  const [campaignPage, setCampaignPage] = useState(1);
  const [voucherPage, setVoucherPage] = useState(1);
  const [rulePage, setRulePage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const pageSize = 8;

  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [voucherForm, setVoucherForm] = useState(EMPTY_VOUCHER_FORM);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);

  function toIsoFromLocalDateTime(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
  }

  async function loadAll() {
    const [l, c, v, r, n] = await Promise.all([
      listLoyaltyAccounts(),
      listCampaigns(),
      listGiftVouchers(),
      listReminderRules(),
      listNotificationLogs(),
    ]);
    setLoyalty(l.data);
    setCampaigns(c.data);
    setVouchers(v.data);
    setRules(r.data);
    setLogs(n.data);
  }

  useEffect(() => {
    loadAll().catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const term = loyaltyFilters.customer.trim();
    if (term.length < 2) {
      setLoyaltyCustomerMatches([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchCustomers(term)
        .then((res) => setLoyaltyCustomerMatches(res.data))
        .catch(() => setLoyaltyCustomerMatches([]));
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [loyaltyFilters.customer]);

  useEffect(() => { window.localStorage.setItem('crm.loyaltyFilters', JSON.stringify(loyaltyFilters)); }, [loyaltyFilters]);
  useEffect(() => { window.localStorage.setItem('crm.campaignFilters', JSON.stringify(campaignFilters)); }, [campaignFilters]);
  useEffect(() => { window.localStorage.setItem('crm.voucherFilters', JSON.stringify(voucherFilters)); }, [voucherFilters]);
  useEffect(() => { window.localStorage.setItem('crm.ruleFilters', JSON.stringify(ruleFilters)); }, [ruleFilters]);
  useEffect(() => { window.localStorage.setItem('crm.logFilters', JSON.stringify(logFilters)); }, [logFilters]);

  useEffect(() => { window.localStorage.setItem('crm.loyaltySort', JSON.stringify(loyaltySort)); }, [loyaltySort]);
  useEffect(() => { window.localStorage.setItem('crm.campaignSort', JSON.stringify(campaignSort)); }, [campaignSort]);
  useEffect(() => { window.localStorage.setItem('crm.voucherSort', JSON.stringify(voucherSort)); }, [voucherSort]);
  useEffect(() => { window.localStorage.setItem('crm.ruleSort', JSON.stringify(ruleSort)); }, [ruleSort]);
  useEffect(() => { window.localStorage.setItem('crm.logSort', JSON.stringify(logSort)); }, [logSort]);

  async function onCreateEvent(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      const resolvedCustomerId = await resolveCustomerIdInput(eventForm.customerId);
      await createLoyaltyEvent({
        customerId: resolvedCustomerId,
        type: eventForm.type as 'earn' | 'redeem',
        points: Number(eventForm.points),
        reason: eventForm.reason || undefined,
      });
      setMessage('Evenement fidelite enregistre.');
      setEventForm(EMPTY_EVENT_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onCreateCampaign(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      await createCampaign({
        name: campaignForm.name,
        channel: campaignForm.channel,
        messageTemplate: campaignForm.messageTemplate,
        segment: campaignForm.minPoints ? { minPoints: Number(campaignForm.minPoints) } : {},
      });
      setMessage('Campagne creee.');
      setCampaignForm(EMPTY_CAMPAIGN_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onCreateVoucher(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      const resolvedCustomerId = voucherForm.customerId.trim() !== ''
        ? await resolveCustomerIdInput(voucherForm.customerId)
        : undefined;
      await createGiftVoucher({
        amount: Number(voucherForm.amount),
        customerId: resolvedCustomerId,
        expiresAt: voucherForm.expiresAt ? toIsoFromLocalDateTime(voucherForm.expiresAt) : undefined,
      });
      setMessage('Bon cadeau cree.');
      setVoucherForm(EMPTY_VOUCHER_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function resolveCustomerIdInput(rawValue: string): Promise<number> {
    const value = rawValue.trim();
    if (!value) {
      throw new Error('Veuillez renseigner un client: email, nom, id.');
    }

    const response = await searchCustomers(value);
    const candidates = response.data;

    const exactEmail = candidates.find((c) => c.email.toLowerCase() === value.toLowerCase());
    if (exactEmail) return exactEmail.id;

    const emailContains = candidates.find((c) => c.email.toLowerCase().includes(value.toLowerCase()));
    if (emailContains) return emailContains.id;

    const exactName = candidates.find((c) => c.fullName.toLowerCase() === value.toLowerCase());
    if (exactName) return exactName.id;

    const nameContains = candidates.find((c) => c.fullName.toLowerCase().includes(value.toLowerCase()));
    if (nameContains) return nameContains.id;

    if (/^\d+$/.test(value)) {
      return Number(value);
    }

    throw new Error(`Aucun client trouve pour "${value}" (email, nom, id).`);
  }

  async function onCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      await createReminderRule({
        name: ruleForm.name,
        channel: ruleForm.channel,
        offsetHours: Number(ruleForm.offsetHours),
        isActive: true,
      });
      setMessage('Regle de rappel ajoutee.');
      setRuleForm(EMPTY_RULE_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filteredLoyalty = useMemo(() => loyalty.filter((item) => {
    const customerQuery = loyaltyFilters.customer.trim();
    const lowerQuery = customerQuery.toLowerCase();
    const byName = customerQuery === '' || item.customerName.toLowerCase().includes(lowerQuery);
    const byId = customerQuery === '' || String(item.customerId).includes(customerQuery);

    let byResolvedMatch = false;
    if (customerQuery !== '' && loyaltyCustomerMatches.length > 0) {
      const exactEmailIds = loyaltyCustomerMatches
        .filter((c) => c.email.toLowerCase() === lowerQuery)
        .map((c) => c.id);
      const emailContainsIds = loyaltyCustomerMatches
        .filter((c) => c.email.toLowerCase().includes(lowerQuery))
        .map((c) => c.id);
      const exactNameIds = loyaltyCustomerMatches
        .filter((c) => c.fullName.toLowerCase() === lowerQuery)
        .map((c) => c.id);
      const nameContainsIds = loyaltyCustomerMatches
        .filter((c) => c.fullName.toLowerCase().includes(lowerQuery))
        .map((c) => c.id);
      const idExactIds = /^\d+$/.test(customerQuery)
        ? loyaltyCustomerMatches.filter((c) => c.id === Number(customerQuery)).map((c) => c.id)
        : [];

      const priorityIds = exactEmailIds.length > 0
        ? exactEmailIds
        : emailContainsIds.length > 0
          ? emailContainsIds
          : exactNameIds.length > 0
            ? exactNameIds
            : nameContainsIds.length > 0
              ? nameContainsIds
              : idExactIds;

      byResolvedMatch = priorityIds.includes(item.customerId);
    }

    const byCustomer = customerQuery === '' || byResolvedMatch || byName || byId;
    const minPoints = loyaltyFilters.pointsMin.trim() === '' ? null : Number(loyaltyFilters.pointsMin);
    const byPoints = minPoints === null || Number.isNaN(minPoints) || item.pointsBalance >= minPoints;
    return byCustomer && byPoints;
  }), [loyalty, loyaltyFilters, loyaltyCustomerMatches]);

  const filteredCampaigns = useMemo(() => campaigns.filter((item) => {
    const byName = campaignFilters.name.trim() === '' || item.name.toLowerCase().includes(campaignFilters.name.toLowerCase());
    const byChannel = campaignFilters.channel.trim() === '' || item.channel === campaignFilters.channel;
    const byStatus = campaignFilters.status.trim() === '' || item.status.toLowerCase().includes(campaignFilters.status.toLowerCase());
    return byName && byChannel && byStatus;
  }), [campaigns, campaignFilters]);

  const filteredVouchers = useMemo(() => vouchers.filter((item) => {
    const byCode = voucherFilters.code.trim() === '' || item.code.toLowerCase().includes(voucherFilters.code.toLowerCase());
    const byStatus = voucherFilters.status.trim() === '' || item.status.toLowerCase().includes(voucherFilters.status.toLowerCase());
    return byCode && byStatus;
  }), [vouchers, voucherFilters]);

  const filteredRules = useMemo(() => rules.filter((item) => {
    const byName = ruleFilters.name.trim() === '' || item.name.toLowerCase().includes(ruleFilters.name.toLowerCase());
    const byChannel = ruleFilters.channel.trim() === '' || item.channel === ruleFilters.channel;
    return byName && byChannel;
  }), [rules, ruleFilters]);

  const filteredLogs = useMemo(() => logs.filter((item) => {
    const byKind = logFilters.kind.trim() === '' || item.kind.toLowerCase().includes(logFilters.kind.toLowerCase());
    const byChannel = logFilters.channel.trim() === '' || item.channel === logFilters.channel;
    const byStatus = logFilters.status.trim() === '' || item.status.toLowerCase().includes(logFilters.status.toLowerCase());
    return byKind && byChannel && byStatus;
  }), [logs, logFilters]);

  const sortedLoyalty = useMemo(() => sortRows(filteredLoyalty, loyaltySort.key, loyaltySort.dir), [filteredLoyalty, loyaltySort]);
  const sortedCampaigns = useMemo(() => sortRows(filteredCampaigns, campaignSort.key, campaignSort.dir), [filteredCampaigns, campaignSort]);
  const sortedVouchers = useMemo(() => sortRows(filteredVouchers, voucherSort.key, voucherSort.dir), [filteredVouchers, voucherSort]);
  const sortedRules = useMemo(() => sortRows(filteredRules, ruleSort.key, ruleSort.dir), [filteredRules, ruleSort]);
  const sortedLogs = useMemo(() => sortRows(filteredLogs, logSort.key, logSort.dir), [filteredLogs, logSort]);

  const loyaltyPageCount = Math.max(1, Math.ceil(sortedLoyalty.length / pageSize));
  const campaignPageCount = Math.max(1, Math.ceil(sortedCampaigns.length / pageSize));
  const voucherPageCount = Math.max(1, Math.ceil(sortedVouchers.length / pageSize));
  const rulePageCount = Math.max(1, Math.ceil(sortedRules.length / pageSize));
  const logPageCount = Math.max(1, Math.ceil(sortedLogs.length / pageSize));

  const pagedLoyalty = sortedLoyalty.slice((loyaltyPage - 1) * pageSize, loyaltyPage * pageSize);
  const pagedCampaigns = sortedCampaigns.slice((campaignPage - 1) * pageSize, campaignPage * pageSize);
  const pagedVouchers = sortedVouchers.slice((voucherPage - 1) * pageSize, voucherPage * pageSize);
  const pagedRules = sortedRules.slice((rulePage - 1) * pageSize, rulePage * pageSize);
  const pagedLogs = sortedLogs.slice((logPage - 1) * pageSize, logPage * pageSize);

  function toggleSort<T>(current: { key: keyof T; dir: SortDirection }, setter: (v: { key: keyof T; dir: SortDirection }) => void, key: keyof T) {
    if (current.key === key) {
      setter({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    setter({ key, dir: 'asc' });
  }

  function sortArrow(active: boolean, dir: SortDirection): string {
    if (!active) return '↕';
    return dir === 'asc' ? '↑' : '↓';
  }

  return (
    <div className="stack">
      <h1 className="page-title">CRM Avance</h1>
      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {info && <InlineNotification tone="info" title="Information" message={info} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Fidelite</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('loyalty')}>Voir la liste</button>
        </div>
        {canManage && (
          <form className="row crm-entry-form" onSubmit={onCreateEvent}>
            <div className="form-field">
              <label htmlFor="crm-loyalty-customer-id">Client (email, nom, id)</label>
              <input id="crm-loyalty-customer-id" placeholder="ex: client@mail.com" value={eventForm.customerId} onChange={(e) => setEventForm({ ...eventForm, customerId: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-loyalty-type">Type d'operation</label>
              <select id="crm-loyalty-type" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
                <option value="earn">Gagner</option>
                <option value="redeem">Consommer</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-loyalty-points">Points</label>
              <input id="crm-loyalty-points" placeholder="ex: 10" value={eventForm.points} onChange={(e) => setEventForm({ ...eventForm, points: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-loyalty-reason">Raison</label>
              <input id="crm-loyalty-reason" placeholder="ex: nouveau client" value={eventForm.reason} onChange={(e) => setEventForm({ ...eventForm, reason: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label>&nbsp;</label>
              <button type="submit">Valider</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Campagnes</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('campaigns')}>Voir la liste</button>
        </div>
        {canManage && (
          <form className="row crm-entry-form" onSubmit={onCreateCampaign}>
            <div className="form-field">
              <label htmlFor="crm-campaign-name">Nom campagne</label>
              <input id="crm-campaign-name" placeholder="ex: noel vip" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-campaign-channel">Canal</label>
              <select id="crm-campaign-channel" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-campaign-min-points">Points minimum (optionnel)</label>
              <input id="crm-campaign-min-points" placeholder="ex: 100" value={campaignForm.minPoints} onChange={(e) => setCampaignForm({ ...campaignForm, minPoints: e.target.value })} />
            </div>
            <div className="form-field grow">
              <label htmlFor="crm-campaign-message">Message</label>
              <input id="crm-campaign-message" className="grow" placeholder="ex: offre speciale du weekend" value={campaignForm.messageTemplate} onChange={(e) => setCampaignForm({ ...campaignForm, messageTemplate: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label>&nbsp;</label>
              <button type="submit">Creer</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Bons cadeaux</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('vouchers')}>Voir la liste</button>
        </div>
        {canManage && (
          <form className="row crm-entry-form" onSubmit={onCreateVoucher}>
            <div className="form-field">
              <label htmlFor="crm-voucher-amount">Montant</label>
              <input id="crm-voucher-amount" placeholder="ex: 50" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-voucher-customer-id">Client (email, nom, id, optionnel)</label>
              <input id="crm-voucher-customer-id" placeholder="ex: client@mail.com" value={voucherForm.customerId} onChange={(e) => setVoucherForm({ ...voucherForm, customerId: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-voucher-expires-at">Expire le (date et heure, optionnel)</label>
              <input id="crm-voucher-expires-at" type="datetime-local" value={voucherForm.expiresAt} onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label>&nbsp;</label>
              <button type="submit">Creer</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Rappels automatiques</h3>
          <div className="row">
            <button type="button" className="btn-soft" onClick={() => setActiveModal('rules')}>Voir les regles</button>
            <button type="button" className="btn-soft" onClick={() => setActiveModal('logs')}>Voir les logs</button>
          </div>
        </div>
        {canManage && (
          <form className="row crm-entry-form" onSubmit={onCreateRule}>
            <div className="form-field">
              <label htmlFor="crm-reminder-name">Nom regle</label>
              <input id="crm-reminder-name" placeholder="ex: rappel j-1" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-reminder-channel">Canal</label>
              <select id="crm-reminder-channel" value={ruleForm.channel} onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}>
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-reminder-offset">Offset (heures)</label>
              <input id="crm-reminder-offset" placeholder="ex: 24" value={ruleForm.offsetHours} onChange={(e) => setRuleForm({ ...ruleForm, offsetHours: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label>&nbsp;</label>
              <button type="submit">Ajouter</button>
            </div>
            <div className="form-field form-field-actions">
              <label>&nbsp;</label>
              <button
                type="button"
                className="btn-soft"
                onClick={async () => {
                  setError(null);
                  setMessage(null);
                  try {
                    const result = await runReminders();
                    setInfo(`Rappels executes: ${result.sent}`);
                    await loadAll();
                  } catch (err) {
                    setInfo(null);
                    setError((err as Error).message);
                  }
                }}
              >
                Executer maintenant
              </button>
            </div>
          </form>
        )}
      </div>

      {activeModal === 'loyalty' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Liste fidelite</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Fermer</button></div>
            <div className="crm-filters row">
              <div className="form-field">
                <label htmlFor="loyalty-filter-customer">Client (email, nom, id)</label>
                <input id="loyalty-filter-customer" placeholder="ex: client@mail.com" value={loyaltyFilters.customer} onChange={(e) => { setLoyaltyFilters({ ...loyaltyFilters, customer: e.target.value }); setLoyaltyPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="loyalty-filter-points">Points minimum</label>
                <input id="loyalty-filter-points" placeholder="ex: 100" value={loyaltyFilters.pointsMin} onChange={(e) => { setLoyaltyFilters({ ...loyaltyFilters, pointsMin: e.target.value }); setLoyaltyPage(1); }} />
              </div>
            </div>
            <p className="crm-sort-hint">Tri: cliquez sur un en-tete de colonne</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(loyaltySort, setLoyaltySort, 'customerName')}>Client {sortArrow(loyaltySort.key === 'customerName', loyaltySort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(loyaltySort, setLoyaltySort, 'pointsBalance')}>Solde points {sortArrow(loyaltySort.key === 'pointsBalance', loyaltySort.dir)}</button></th></tr></thead>
              <tbody>{pagedLoyalty.map((a) => <tr key={a.id}><td>{a.customerName} (#{a.customerId})</td><td>{a.pointsBalance}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={loyaltyPage <= 1} onClick={() => setLoyaltyPage((p) => p - 1)}>Precedent</button><span>Page {loyaltyPage}/{loyaltyPageCount}</span><button className="btn-soft" disabled={loyaltyPage >= loyaltyPageCount} onClick={() => setLoyaltyPage((p) => p + 1)}>Suivant</button></div>
          </div>
        </div>
      )}

      {activeModal === 'campaigns' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Liste campagnes</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Fermer</button></div>
            <div className="crm-filters row">
              <div className="form-field">
                <label htmlFor="campaign-filter-name">Nom campagne</label>
                <input id="campaign-filter-name" placeholder="ex: noel" value={campaignFilters.name} onChange={(e) => { setCampaignFilters({ ...campaignFilters, name: e.target.value }); setCampaignPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="campaign-filter-channel">Canal</label>
                <select id="campaign-filter-channel" value={campaignFilters.channel} onChange={(e) => { setCampaignFilters({ ...campaignFilters, channel: e.target.value }); setCampaignPage(1); }}>
                  <option value="">Tous canaux</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="campaign-filter-status">Statut</label>
                <input id="campaign-filter-status" placeholder="ex: running" value={campaignFilters.status} onChange={(e) => { setCampaignFilters({ ...campaignFilters, status: e.target.value }); setCampaignPage(1); }} />
              </div>
            </div>
            <p className="crm-sort-hint">Tri: cliquez sur un en-tete de colonne</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'name')}>Nom {sortArrow(campaignSort.key === 'name', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'channel')}>Canal {sortArrow(campaignSort.key === 'channel', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'status')}>Statut {sortArrow(campaignSort.key === 'status', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'sentCount')}>Envois {sortArrow(campaignSort.key === 'sentCount', campaignSort.dir)}</button></th><th>Action</th></tr></thead>
              <tbody>
                {pagedCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td><td>{c.channel}</td><td>{c.status}</td><td>{c.sentCount}/{c.targetCount}</td>
                    <td>{canManage ? <button onClick={() => launchCampaign(c.id).then(loadAll)}>Lancer</button> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={campaignPage <= 1} onClick={() => setCampaignPage((p) => p - 1)}>Precedent</button><span>Page {campaignPage}/{campaignPageCount}</span><button className="btn-soft" disabled={campaignPage >= campaignPageCount} onClick={() => setCampaignPage((p) => p + 1)}>Suivant</button></div>
          </div>
        </div>
      )}

      {activeModal === 'vouchers' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Liste bons cadeaux</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Fermer</button></div>
            <div className="crm-filters row">
              <div className="form-field">
                <label htmlFor="voucher-filter-code">Code voucher</label>
                <input id="voucher-filter-code" placeholder="ex: GIFT-" value={voucherFilters.code} onChange={(e) => { setVoucherFilters({ ...voucherFilters, code: e.target.value }); setVoucherPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="voucher-filter-status">Statut</label>
                <input id="voucher-filter-status" placeholder="ex: active" value={voucherFilters.status} onChange={(e) => { setVoucherFilters({ ...voucherFilters, status: e.target.value }); setVoucherPage(1); }} />
              </div>
            </div>
            <p className="crm-sort-hint">Tri: cliquez sur un en-tete de colonne</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'code')}>Code {sortArrow(voucherSort.key === 'code', voucherSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'status')}>Statut {sortArrow(voucherSort.key === 'status', voucherSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'balanceAmount')}>Solde {sortArrow(voucherSort.key === 'balanceAmount', voucherSort.dir)}</button></th><th>Action</th></tr></thead>
              <tbody>
                {pagedVouchers.map((v) => (
                  <tr key={v.id}>
                    <td>{v.code}</td><td>{v.status}</td><td>{v.balanceAmount}</td>
                    <td>{canManage ? <button onClick={() => consumeGiftVoucher(v.id, 10).then(loadAll)}>Consommer 10</button> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={voucherPage <= 1} onClick={() => setVoucherPage((p) => p - 1)}>Precedent</button><span>Page {voucherPage}/{voucherPageCount}</span><button className="btn-soft" disabled={voucherPage >= voucherPageCount} onClick={() => setVoucherPage((p) => p + 1)}>Suivant</button></div>
          </div>
        </div>
      )}

      {activeModal === 'rules' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Liste regles de rappel</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Fermer</button></div>
            <div className="crm-filters row">
              <div className="form-field">
                <label htmlFor="rule-filter-name">Nom regle</label>
                <input id="rule-filter-name" placeholder="ex: rappel j-1" value={ruleFilters.name} onChange={(e) => { setRuleFilters({ ...ruleFilters, name: e.target.value }); setRulePage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="rule-filter-channel">Canal</label>
                <select id="rule-filter-channel" value={ruleFilters.channel} onChange={(e) => { setRuleFilters({ ...ruleFilters, channel: e.target.value }); setRulePage(1); }}>
                  <option value="">Tous canaux</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
            </div>
            <p className="crm-sort-hint">Tri: cliquez sur un en-tete de colonne</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'name')}>Nom {sortArrow(ruleSort.key === 'name', ruleSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'channel')}>Canal {sortArrow(ruleSort.key === 'channel', ruleSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'offsetHours')}>Offset heures {sortArrow(ruleSort.key === 'offsetHours', ruleSort.dir)}</button></th></tr></thead>
              <tbody>{pagedRules.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.channel}</td><td>{r.offsetHours}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={rulePage <= 1} onClick={() => setRulePage((p) => p - 1)}>Precedent</button><span>Page {rulePage}/{rulePageCount}</span><button className="btn-soft" disabled={rulePage >= rulePageCount} onClick={() => setRulePage((p) => p + 1)}>Suivant</button></div>
          </div>
        </div>
      )}

      {activeModal === 'logs' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Logs notifications</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Fermer</button></div>
            <div className="crm-filters row">
              <div className="form-field">
                <label htmlFor="log-filter-kind">Type notification</label>
                <input id="log-filter-kind" placeholder="ex: campaign" value={logFilters.kind} onChange={(e) => { setLogFilters({ ...logFilters, kind: e.target.value }); setLogPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="log-filter-channel">Canal</label>
                <select id="log-filter-channel" value={logFilters.channel} onChange={(e) => { setLogFilters({ ...logFilters, channel: e.target.value }); setLogPage(1); }}>
                  <option value="">Tous canaux</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="log-filter-status">Statut</label>
                <input id="log-filter-status" placeholder="ex: sent" value={logFilters.status} onChange={(e) => { setLogFilters({ ...logFilters, status: e.target.value }); setLogPage(1); }} />
              </div>
            </div>
            <p className="crm-sort-hint">Tri: cliquez sur un en-tete de colonne</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'kind')}>Type {sortArrow(logSort.key === 'kind', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'channel')}>Canal {sortArrow(logSort.key === 'channel', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'status')}>Statut {sortArrow(logSort.key === 'status', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'createdAt')}>Date {sortArrow(logSort.key === 'createdAt', logSort.dir)}</button></th></tr></thead>
              <tbody>{pagedLogs.map((l) => <tr key={l.id}><td>{l.kind}</td><td>{l.channel}</td><td>{l.status}</td><td>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>Precedent</button><span>Page {logPage}/{logPageCount}</span><button className="btn-soft" disabled={logPage >= logPageCount} onClick={() => setLogPage((p) => p + 1)}>Suivant</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
