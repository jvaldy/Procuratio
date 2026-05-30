import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { hasRole } from '../../../auth/auth';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import {
  configureLoyaltyAccount,
  consumeGiftVoucher,
  createBulkLoyaltyEvent,
  createCampaign,
  createGiftVoucher,
  createLoyaltyEvent,
  createReminderRule,
  launchCampaign,
  launchCampaignsBulk,
  listCampaigns,
  listGiftVouchers,
  listLoyaltyAccounts,
  listNotificationLogs,
  listReminderRules,
  runReminders,
  sendGiftVouchersBulk,
} from '../../../api/crm';
import { searchCustomers } from '../../../api/pos';
import { InlineNotification } from '../../../ui/InlineNotification';

type ModalKey = 'loyalty' | 'campaigns' | 'vouchers' | 'rules' | 'logs' | null;
type SortDirection = 'asc' | 'desc';

type LoyaltyRow = {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  pointsBalance: number;
  subscriptionName: string | null;
  subscriptionStatus: string;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  visitCardName: string | null;
  visitCardTarget: number | null;
  visitCardUsed: number;
  visitCardActive: boolean;
};
type CampaignRow = { id: number; name: string; channel: string; status: string; sentCount: number; targetCount: number };
type VoucherRow = { id: number; code: string; status: string; balanceAmount: number };
type RuleRow = { id: number; name: string; channel: string; offsetHours: number };
type LogRow = { id: number; kind: string; channel: string; status: string; createdAt: string };
type CustomerSearchRow = { id: number; fullName: string; email: string; phoneNumber: string | null };

const EMPTY_EVENT_FORM = { customerId: '', type: 'earn', points: '', reason: '' };
const EMPTY_PROGRAM_FORM = {
  customerId: '',
  subscriptionName: '',
  subscriptionStatus: 'inactive',
  subscriptionStartedAt: '',
  subscriptionEndsAt: '',
  visitCardName: '',
  visitCardTarget: '',
  visitCardUsed: '0',
  visitCardActive: false,
};
const EMPTY_CAMPAIGN_FORM = { name: '', channel: 'email', minPoints: '', messageTemplate: '' };
const EMPTY_VOUCHER_FORM = { amount: '', customerId: '', expiresAt: '' };
const EMPTY_RULE_FORM = { name: 'Reminder D-1', channel: 'email', offsetHours: '24' };

function sortRows<T>(rows: T[], key: keyof T, direction: SortDirection): T[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key] as unknown;
    const bv = b[key] as unknown;

    if (typeof av === 'number' && typeof bv === 'number') {
      return av - bv;
    }

    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv, 'en', { sensitivity: 'base' });
    }

    return String(av).localeCompare(String(bv), 'en', { sensitivity: 'base' });
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

function useCustomerMatches(term: string) {
  const [matches, setMatches] = useState<CustomerSearchRow[]>([]);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setMatches([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchCustomers(query)
        .then((res) => setMatches(res.data))
        .catch(() => setMatches([]));
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [term]);

  return matches;
}

type CustomerAutocompleteFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  matches: CustomerSearchRow[];
  onChange: (value: string) => void;
};

function CustomerAutocompleteField({ id, label, value, placeholder, matches, onChange }: CustomerAutocompleteFieldProps) {
  const [dismissedValue, setDismissedValue] = useState<string | null>(null);
  const showMatches = dismissedValue !== value && value.trim().length >= 2 && matches.length > 0;

  const handleInputChange = (nextValue: string) => {
    setDismissedValue(null);
    onChange(nextValue);
  };

  const handleSuggestionClick = (selectedEmail: string) => {
    setDismissedValue(selectedEmail);
    onChange(selectedEmail);
  };

  return (
    <div className="form-field crm-customer-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} placeholder={placeholder} value={value} onChange={(e) => handleInputChange(e.target.value)} autoComplete="off" />
      {showMatches && (
        <div className="crm-customer-results">
          {matches.slice(0, 6).map((customer) => (
            <button key={customer.id} type="button" className="crm-customer-result" onClick={() => handleSuggestionClick(customer.email)}>
              <strong>{customer.fullName}</strong>
              <span>{customer.email}</span>
              <small>#{customer.id}{customer.phoneNumber ? ` · ${customer.phoneNumber}` : ''}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM_FORM);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [voucherForm, setVoucherForm] = useState(EMPTY_VOUCHER_FORM);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);
  const [selectedLoyaltyIds, setSelectedLoyaltyIds] = useState<number[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<number[]>([]);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<number[]>([]);
  const [bulkVoucherEmail, setBulkVoucherEmail] = useState('');
  const [bulkVoucherMessage, setBulkVoucherMessage] = useState('Here is your Procuratio gift voucher.');
  const loyaltyEventCustomerMatches = useCustomerMatches(eventForm.customerId);
  const loyaltyProgramCustomerMatches = useCustomerMatches(programForm.customerId);
  const voucherCustomerMatches = useCustomerMatches(voucherForm.customerId);
  const loyaltyFilterCustomerMatches = useCustomerMatches(loyaltyFilters.customer);

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
      setMessage('Loyalty event saved.');
      setEventForm(EMPTY_EVENT_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onConfigureProgram(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      const resolvedCustomerId = await resolveCustomerIdInput(programForm.customerId);
      await configureLoyaltyAccount({
        customerId: resolvedCustomerId,
        subscriptionName: programForm.subscriptionName || undefined,
        subscriptionStatus: programForm.subscriptionStatus as 'inactive' | 'active' | 'expired',
        subscriptionStartedAt: programForm.subscriptionStartedAt || undefined,
        subscriptionEndsAt: programForm.subscriptionEndsAt || undefined,
        visitCardName: programForm.visitCardName || undefined,
        visitCardTarget: programForm.visitCardTarget === '' ? undefined : Number(programForm.visitCardTarget),
        visitCardUsed: programForm.visitCardUsed === '' ? undefined : Number(programForm.visitCardUsed),
        visitCardActive: programForm.visitCardActive,
      });
      setMessage('Membership and visit card settings saved.');
      setProgramForm(EMPTY_PROGRAM_FORM);
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
      setMessage('Campaign created.');
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
      setMessage('Gift voucher created.');
      setVoucherForm(EMPTY_VOUCHER_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function resolveCustomerIdInput(rawValue: string): Promise<number> {
    const value = rawValue.trim();
    if (!value) {
      throw new Error('Please enter a customer using an email, name or id.');
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

    throw new Error(`No customer was found for "${value}" (email, name, id).`);
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
      setMessage('Reminder rule added.');
      setRuleForm(EMPTY_RULE_FORM);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function toggleSelection(setter: (value: number[] | ((current: number[]) => number[])) => void, value: number) {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  async function onBulkLoyaltyEvent() {
    if (!canManage || selectedLoyaltyIds.length === 0) return;
    setError(null);
    setMessage(null);
    try {
      await createBulkLoyaltyEvent({
        customerIds: selectedLoyaltyIds,
        type: eventForm.type as 'earn' | 'redeem',
        points: Number(eventForm.points),
        reason: eventForm.reason || undefined,
      });
      setSelectedLoyaltyIds([]);
      setMessage('The loyalty event has been applied to the selected customers.');
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onBulkLaunchCampaigns() {
    if (!canManage || selectedCampaignIds.length === 0) return;
    setError(null);
    setMessage(null);
    try {
      await launchCampaignsBulk({ campaignIds: selectedCampaignIds });
      setSelectedCampaignIds([]);
      setMessage('The selected campaigns have been launched.');
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onBulkSendVouchers() {
    if (!canManage || selectedVoucherIds.length === 0) return;
    setError(null);
    setMessage(null);
    try {
      await sendGiftVouchersBulk({
        voucherIds: selectedVoucherIds,
        toEmail: bulkVoucherEmail,
        message: bulkVoucherMessage || undefined,
      });
      setSelectedVoucherIds([]);
      setMessage('The selected gift vouchers have been sent.');
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
    if (customerQuery !== '' && loyaltyFilterCustomerMatches.length > 0) {
      const exactEmailIds = loyaltyFilterCustomerMatches
        .filter((c) => c.email.toLowerCase() === lowerQuery)
        .map((c) => c.id);
      const emailContainsIds = loyaltyFilterCustomerMatches
        .filter((c) => c.email.toLowerCase().includes(lowerQuery))
        .map((c) => c.id);
      const exactNameIds = loyaltyFilterCustomerMatches
        .filter((c) => c.fullName.toLowerCase() === lowerQuery)
        .map((c) => c.id);
      const nameContainsIds = loyaltyFilterCustomerMatches
        .filter((c) => c.fullName.toLowerCase().includes(lowerQuery))
        .map((c) => c.id);
      const idExactIds = /^\d+$/.test(customerQuery)
        ? loyaltyFilterCustomerMatches.filter((c) => c.id === Number(customerQuery)).map((c) => c.id)
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
  }), [loyalty, loyaltyFilters, loyaltyFilterCustomerMatches]);

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
  const filteredLoyaltyCustomerIds = useMemo(() => Array.from(new Set(sortedLoyalty.map((item) => item.customerId))), [sortedLoyalty]);
  const filteredCampaignIds = useMemo(() => sortedCampaigns.map((item) => item.id), [sortedCampaigns]);
  const filteredVoucherIds = useMemo(() => sortedVouchers.map((item) => item.id), [sortedVouchers]);
  const allFilteredLoyaltySelected =
    filteredLoyaltyCustomerIds.length > 0 && filteredLoyaltyCustomerIds.every((id) => selectedLoyaltyIds.includes(id));
  const allFilteredCampaignsSelected =
    filteredCampaignIds.length > 0 && filteredCampaignIds.every((id) => selectedCampaignIds.includes(id));
  const allFilteredVouchersSelected =
    filteredVoucherIds.length > 0 && filteredVoucherIds.every((id) => selectedVoucherIds.includes(id));
  const someFilteredLoyaltySelected =
    !allFilteredLoyaltySelected && filteredLoyaltyCustomerIds.some((id) => selectedLoyaltyIds.includes(id));
  const someFilteredCampaignsSelected =
    !allFilteredCampaignsSelected && filteredCampaignIds.some((id) => selectedCampaignIds.includes(id));
  const someFilteredVouchersSelected =
    !allFilteredVouchersSelected && filteredVoucherIds.some((id) => selectedVoucherIds.includes(id));
  const selectAllLoyaltyRef = useRef<HTMLInputElement | null>(null);
  const selectAllCampaignsRef = useRef<HTMLInputElement | null>(null);
  const selectAllVouchersRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectAllLoyaltyRef.current) {
      selectAllLoyaltyRef.current.indeterminate = someFilteredLoyaltySelected;
    }
  }, [someFilteredLoyaltySelected]);

  useEffect(() => {
    if (selectAllCampaignsRef.current) {
      selectAllCampaignsRef.current.indeterminate = someFilteredCampaignsSelected;
    }
  }, [someFilteredCampaignsSelected]);

  useEffect(() => {
    if (selectAllVouchersRef.current) {
      selectAllVouchersRef.current.indeterminate = someFilteredVouchersSelected;
    }
  }, [someFilteredVouchersSelected]);

  function toggleAllFilteredLoyaltySelection() {
    setSelectedLoyaltyIds((current) => {
      if (allFilteredLoyaltySelected) {
        return current.filter((id) => !filteredLoyaltyCustomerIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredLoyaltyCustomerIds]));
    });
  }

  function toggleAllFilteredCampaignSelection() {
    setSelectedCampaignIds((current) => {
      if (allFilteredCampaignsSelected) {
        return current.filter((id) => !filteredCampaignIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredCampaignIds]));
    });
  }

  function toggleAllFilteredVoucherSelection() {
    setSelectedVoucherIds((current) => {
      if (allFilteredVouchersSelected) {
        return current.filter((id) => !filteredVoucherIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredVoucherIds]));
    });
  }

  function toggleSort<T>(current: { key: keyof T; dir: SortDirection }, setter: (v: { key: keyof T; dir: SortDirection }) => void, key: keyof T) {
    if (current.key === key) {
      setter({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    setter({ key, dir: 'asc' });
  }

  function sortArrow(active: boolean, dir: SortDirection): string {
    if (!active) return '\u2195';
    return dir === 'asc' ? '\u2191' : '\u2193';
  }

  return (
    <div className="stack">
      {message && <InlineNotification tone="success" title="Saved" message={message} />}
      {info && <InlineNotification tone="info" title="Information" message={info} />}
      {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Loyalty points</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('loyalty')}>Open list</button>
        </div>
        {canManage && (
          <form className="crm-entry-form" onSubmit={onCreateEvent}>
            <CustomerAutocompleteField
              id="crm-loyalty-customer-id"
              label="Customer"
              placeholder="Email, name or ID"
              value={eventForm.customerId}
              matches={loyaltyEventCustomerMatches}
              onChange={(value) => setEventForm({ ...eventForm, customerId: value })}
            />
            <div className="form-field">
              <label htmlFor="crm-loyalty-type">Operation type</label>
              <select id="crm-loyalty-type" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
                <option value="earn">Earn</option>
                <option value="redeem">Redeem</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-loyalty-points">Points</label>
              <input id="crm-loyalty-points" placeholder="10" value={eventForm.points} onChange={(e) => setEventForm({ ...eventForm, points: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-loyalty-reason">Reason</label>
              <input id="crm-loyalty-reason" placeholder="welcome bonus" value={eventForm.reason} onChange={(e) => setEventForm({ ...eventForm, reason: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button type="submit">Save event</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Memberships and visit cards</h3>
        </div>
        {canManage && (
          <form className="crm-entry-form" onSubmit={onConfigureProgram}>
            <CustomerAutocompleteField
              id="crm-program-customer-id"
              label="Customer"
              placeholder="Email, name or ID"
              value={programForm.customerId}
              matches={loyaltyProgramCustomerMatches}
              onChange={(value) => setProgramForm({ ...programForm, customerId: value })}
            />
            <div className="form-field">
              <label htmlFor="crm-program-subscription-name">Subscription name</label>
              <input id="crm-program-subscription-name" placeholder="Premium Color Club" value={programForm.subscriptionName} onChange={(e) => setProgramForm({ ...programForm, subscriptionName: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-subscription-status">Subscription status</label>
              <select id="crm-program-subscription-status" value={programForm.subscriptionStatus} onChange={(e) => setProgramForm({ ...programForm, subscriptionStatus: e.target.value })}>
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-subscription-start">Starts on</label>
              <input id="crm-program-subscription-start" type="datetime-local" value={programForm.subscriptionStartedAt} onChange={(e) => setProgramForm({ ...programForm, subscriptionStartedAt: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-subscription-end">Ends on</label>
              <input id="crm-program-subscription-end" type="datetime-local" value={programForm.subscriptionEndsAt} onChange={(e) => setProgramForm({ ...programForm, subscriptionEndsAt: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-visit-card-name">Visit card name</label>
              <input id="crm-program-visit-card-name" placeholder="10 visits facial card" value={programForm.visitCardName} onChange={(e) => setProgramForm({ ...programForm, visitCardName: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-visit-card-target">Visit goal</label>
              <input id="crm-program-visit-card-target" placeholder="10" value={programForm.visitCardTarget} onChange={(e) => setProgramForm({ ...programForm, visitCardTarget: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-visit-card-used">Visits used</label>
              <input id="crm-program-visit-card-used" placeholder="3" value={programForm.visitCardUsed} onChange={(e) => setProgramForm({ ...programForm, visitCardUsed: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-program-visit-card-active">Visit card state</label>
              <select id="crm-program-visit-card-active" value={programForm.visitCardActive ? 'active' : 'inactive'} onChange={(e) => setProgramForm({ ...programForm, visitCardActive: e.target.value === 'active' })}>
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button type="submit">Save program</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Campaigns</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('campaigns')}>Open list</button>
        </div>
        {canManage && (
          <form className="crm-entry-form" onSubmit={onCreateCampaign}>
            <div className="form-field">
              <label htmlFor="crm-campaign-name">Campaign name</label>
              <input id="crm-campaign-name" placeholder="VIP Christmas" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-campaign-channel">Channel</label>
              <select id="crm-campaign-channel" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-campaign-min-points">Minimum points</label>
              <input id="crm-campaign-min-points" placeholder="Optional, for example 100" value={campaignForm.minPoints} onChange={(e) => setCampaignForm({ ...campaignForm, minPoints: e.target.value })} />
            </div>
            <div className="form-field crm-field-wide">
              <label htmlFor="crm-campaign-message">Message</label>
              <input id="crm-campaign-message" placeholder="exclusive weekend offer" value={campaignForm.messageTemplate} onChange={(e) => setCampaignForm({ ...campaignForm, messageTemplate: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button type="submit">Create</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Gift vouchers</h3>
          <button type="button" className="btn-soft" onClick={() => setActiveModal('vouchers')}>Open list</button>
        </div>
        {canManage && (
          <form className="crm-entry-form" onSubmit={onCreateVoucher}>
            <div className="form-field">
              <label htmlFor="crm-voucher-amount">Amount</label>
              <input id="crm-voucher-amount" placeholder="50" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} />
            </div>
            <CustomerAutocompleteField
              id="crm-voucher-customer-id"
              label="Customer"
              placeholder="Optional email, name or ID"
              value={voucherForm.customerId}
              matches={voucherCustomerMatches}
              onChange={(value) => setVoucherForm({ ...voucherForm, customerId: value })}
            />
            <div className="form-field">
              <label htmlFor="crm-voucher-expires-at">Expires on</label>
              <input id="crm-voucher-expires-at" type="datetime-local" placeholder="Optional date and time" value={voucherForm.expiresAt} onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button type="submit">Create</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel stack">
        <div className="row crm-panel-head">
          <h3>Automatic reminders</h3>
          <div className="row">
            <button type="button" className="btn-soft" onClick={() => setActiveModal('rules')}>Open rules</button>
            <button type="button" className="btn-soft" onClick={() => setActiveModal('logs')}>Open logs</button>
          </div>
        </div>
        {canManage && (
          <form className="crm-entry-form" onSubmit={onCreateRule}>
            <div className="form-field">
              <label htmlFor="crm-reminder-name">Rule name</label>
              <input id="crm-reminder-name" placeholder="reminder D-1" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="crm-reminder-channel">Channel</label>
              <select id="crm-reminder-channel" value={ruleForm.channel} onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}>
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="crm-reminder-offset">Offset</label>
              <input id="crm-reminder-offset" placeholder="Hours, for example 24" value={ruleForm.offsetHours} onChange={(e) => setRuleForm({ ...ruleForm, offsetHours: e.target.value })} />
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button type="submit">Add rule</button>
            </div>
            <div className="form-field form-field-actions">
              <label className="sr-only">Action</label>
              <button
                type="button"
                className="btn-soft"
                onClick={async () => {
                  setError(null);
                  setMessage(null);
                  try {
                    const result = await runReminders();
                    setInfo(`Reminders executed: ${result.sent}`);
                    await loadAll();
                  } catch (err) {
                    setInfo(null);
                    setError((err as Error).message);
                  }
                }}
              >
                Run now
              </button>
            </div>
          </form>
        )}
      </div>

      {activeModal === 'loyalty' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Loyalty accounts</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button></div>
            <div className="crm-filters">
              <CustomerAutocompleteField
                id="loyalty-filter-customer"
                label="Customer"
                placeholder="Email, name or ID"
                value={loyaltyFilters.customer}
                matches={loyaltyFilterCustomerMatches}
                onChange={(value) => { setLoyaltyFilters({ ...loyaltyFilters, customer: value }); setLoyaltyPage(1); }}
              />
              <div className="form-field">
                <label htmlFor="loyalty-filter-points">Minimum points</label>
                <input id="loyalty-filter-points" placeholder="100" value={loyaltyFilters.pointsMin} onChange={(e) => { setLoyaltyFilters({ ...loyaltyFilters, pointsMin: e.target.value }); setLoyaltyPage(1); }} />
              </div>
            </div>
            {canManage && (
              <div className="crm-filters">
                <div className="form-field">
                  <label htmlFor="crm-bulk-loyalty-type">Bulk action</label>
                  <select id="crm-bulk-loyalty-type" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value, customerId: '' })}>
                    <option value="earn">Add points</option>
                    <option value="redeem">Redeem points</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="crm-bulk-loyalty-points">Points</label>
                  <input id="crm-bulk-loyalty-points" value={eventForm.points} onChange={(e) => setEventForm({ ...eventForm, points: e.target.value })} />
                </div>
                <div className="form-field crm-field-wide">
                  <label htmlFor="crm-bulk-loyalty-reason">Reason</label>
                  <input id="crm-bulk-loyalty-reason" value={eventForm.reason} onChange={(e) => setEventForm({ ...eventForm, reason: e.target.value })} />
                </div>
                <div className="form-field form-field-actions">
                  <label className="sr-only">Action</label>
                  <button type="button" className="planning-action-btn planning-action-btn-primary" disabled={selectedLoyaltyIds.length === 0} onClick={onBulkLoyaltyEvent}>
                    Apply to selected
                  </button>
                </div>
              </div>
            )}
            <p className="crm-sort-hint">Sort: click a column header</p>
            <div className="row crm-bulk-selection-bar">
              <button type="button" className="btn-soft" onClick={toggleAllFilteredLoyaltySelection} disabled={filteredLoyaltyCustomerIds.length === 0}>
                {allFilteredLoyaltySelected ? 'Clear all filtered' : `Select all filtered (${filteredLoyaltyCustomerIds.length})`}
              </button>
              {selectedLoyaltyIds.length > 0 && <span className="muted">{selectedLoyaltyIds.length} selected</span>}
            </div>
            <table>
              <thead><tr><th><input ref={selectAllLoyaltyRef} type="checkbox" aria-label="Select all filtered loyalty accounts" checked={allFilteredLoyaltySelected} disabled={filteredLoyaltyCustomerIds.length === 0} onChange={toggleAllFilteredLoyaltySelection} /></th><th><button type="button" className="th-sort" onClick={() => toggleSort(loyaltySort, setLoyaltySort, 'customerName')}>Customer {sortArrow(loyaltySort.key === 'customerName', loyaltySort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(loyaltySort, setLoyaltySort, 'pointsBalance')}>Points balance {sortArrow(loyaltySort.key === 'pointsBalance', loyaltySort.dir)}</button></th><th>Membership</th><th>Visit card</th></tr></thead>
              <tbody>{pagedLoyalty.map((a) => <tr key={a.id}><td><input type="checkbox" aria-label={`Select loyalty account for ${a.customerName}`} checked={selectedLoyaltyIds.includes(a.customerId)} onChange={() => toggleSelection(setSelectedLoyaltyIds, a.customerId)} /></td><td>{a.customerName} (#{a.customerId})</td><td>{a.pointsBalance}</td><td>{a.subscriptionName ? `${a.subscriptionName} - ${a.subscriptionStatus}` : '-'}</td><td>{a.visitCardName ? `${a.visitCardUsed}/${a.visitCardTarget ?? 0}` : '-'}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={loyaltyPage <= 1} onClick={() => setLoyaltyPage((p) => p - 1)}>Previous</button><span>Page {loyaltyPage}/{loyaltyPageCount}</span><button className="btn-soft" disabled={loyaltyPage >= loyaltyPageCount} onClick={() => setLoyaltyPage((p) => p + 1)}>Next</button></div>
          </div>
        </div>
      )}

      {activeModal === 'campaigns' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Campaign list</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button></div>
            <div className="crm-filters">
              <div className="form-field">
                <label htmlFor="campaign-filter-name">Campaign name</label>
                <input id="campaign-filter-name" placeholder="Christmas" value={campaignFilters.name} onChange={(e) => { setCampaignFilters({ ...campaignFilters, name: e.target.value }); setCampaignPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="campaign-filter-channel">Channel</label>
                <select id="campaign-filter-channel" value={campaignFilters.channel} onChange={(e) => { setCampaignFilters({ ...campaignFilters, channel: e.target.value }); setCampaignPage(1); }}>
                  <option value="">All channels</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="campaign-filter-status">Status</label>
                <input id="campaign-filter-status" placeholder="running" value={campaignFilters.status} onChange={(e) => { setCampaignFilters({ ...campaignFilters, status: e.target.value }); setCampaignPage(1); }} />
              </div>
              {canManage && (
                <div className="form-field form-field-actions">
                  <label className="sr-only">Action</label>
                  <button type="button" className="planning-action-btn planning-action-btn-primary" disabled={selectedCampaignIds.length === 0} onClick={onBulkLaunchCampaigns}>
                    Launch selected
                  </button>
                </div>
              )}
            </div>
            <p className="crm-sort-hint">Sort: click a column header</p>
            <div className="row crm-bulk-selection-bar">
              <button type="button" className="btn-soft" onClick={toggleAllFilteredCampaignSelection} disabled={filteredCampaignIds.length === 0}>
                {allFilteredCampaignsSelected ? 'Clear all filtered' : `Select all filtered (${filteredCampaignIds.length})`}
              </button>
              {selectedCampaignIds.length > 0 && <span className="muted">{selectedCampaignIds.length} selected</span>}
            </div>
            <table>
              <thead><tr><th><input ref={selectAllCampaignsRef} type="checkbox" aria-label="Select all filtered campaigns" checked={allFilteredCampaignsSelected} disabled={filteredCampaignIds.length === 0} onChange={toggleAllFilteredCampaignSelection} /></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'name')}>Name {sortArrow(campaignSort.key === 'name', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'channel')}>Channel {sortArrow(campaignSort.key === 'channel', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'status')}>Status {sortArrow(campaignSort.key === 'status', campaignSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(campaignSort, setCampaignSort, 'sentCount')}>Sent {sortArrow(campaignSort.key === 'sentCount', campaignSort.dir)}</button></th><th>Action</th></tr></thead>
              <tbody>
                {pagedCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td><input type="checkbox" aria-label={`Select campaign ${c.name}`} checked={selectedCampaignIds.includes(c.id)} onChange={() => toggleSelection(setSelectedCampaignIds, c.id)} /></td>
                    <td>{c.name}</td><td>{c.channel}</td><td>{c.status}</td><td>{c.sentCount}/{c.targetCount}</td>
                    <td>{canManage ? <button onClick={() => launchCampaign(c.id).then(loadAll)}>Launch</button> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={campaignPage <= 1} onClick={() => setCampaignPage((p) => p - 1)}>Previous</button><span>Page {campaignPage}/{campaignPageCount}</span><button className="btn-soft" disabled={campaignPage >= campaignPageCount} onClick={() => setCampaignPage((p) => p + 1)}>Next</button></div>
          </div>
        </div>
      )}

      {activeModal === 'vouchers' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Gift voucher list</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button></div>
              <div className="crm-filters">
              <div className="form-field">
                <label htmlFor="voucher-filter-code">Voucher code</label>
                <input id="voucher-filter-code" placeholder="GIFT-UK-2026" value={voucherFilters.code} onChange={(e) => { setVoucherFilters({ ...voucherFilters, code: e.target.value }); setVoucherPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="voucher-filter-status">Status</label>
                <input id="voucher-filter-status" placeholder="active" value={voucherFilters.status} onChange={(e) => { setVoucherFilters({ ...voucherFilters, status: e.target.value }); setVoucherPage(1); }} />
              </div>
              {canManage && (
                <>
                  <div className="form-field">
                    <label htmlFor="voucher-bulk-email">Send to email</label>
                    <input id="voucher-bulk-email" type="email" placeholder="recipient@mail.com" value={bulkVoucherEmail} onChange={(e) => setBulkVoucherEmail(e.target.value)} />
                  </div>
                    <div className="form-field crm-field-wide">
                      <label htmlFor="voucher-bulk-message">Email message</label>
                      <input id="voucher-bulk-message" value={bulkVoucherMessage} onChange={(e) => setBulkVoucherMessage(e.target.value)} />
                    </div>
                  <div className="form-field form-field-actions">
                    <label className="sr-only">Action</label>
                    <button type="button" className="planning-action-btn planning-action-btn-primary" disabled={selectedVoucherIds.length === 0} onClick={onBulkSendVouchers}>
                      Send selected
                    </button>
                  </div>
                </>
              )}
            </div>
            <p className="crm-sort-hint">Sort: click a column header</p>
            <div className="row crm-bulk-selection-bar">
              <button type="button" className="btn-soft" onClick={toggleAllFilteredVoucherSelection} disabled={filteredVoucherIds.length === 0}>
                {allFilteredVouchersSelected ? 'Clear all filtered' : `Select all filtered (${filteredVoucherIds.length})`}
              </button>
              {selectedVoucherIds.length > 0 && <span className="muted">{selectedVoucherIds.length} selected</span>}
            </div>
            <table>
              <thead><tr><th><input ref={selectAllVouchersRef} type="checkbox" aria-label="Select all filtered gift vouchers" checked={allFilteredVouchersSelected} disabled={filteredVoucherIds.length === 0} onChange={toggleAllFilteredVoucherSelection} /></th><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'code')}>Code {sortArrow(voucherSort.key === 'code', voucherSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'status')}>Status {sortArrow(voucherSort.key === 'status', voucherSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(voucherSort, setVoucherSort, 'balanceAmount')}>Balance {sortArrow(voucherSort.key === 'balanceAmount', voucherSort.dir)}</button></th><th>Action</th></tr></thead>
              <tbody>
                {pagedVouchers.map((v) => (
                  <tr key={v.id}>
                    <td><input type="checkbox" aria-label={`Select voucher ${v.code}`} checked={selectedVoucherIds.includes(v.id)} onChange={() => toggleSelection(setSelectedVoucherIds, v.id)} /></td>
                    <td>{v.code}</td><td>{v.status}</td><td>{v.balanceAmount}</td>
                    <td>{canManage ? <button onClick={() => consumeGiftVoucher(v.id, 10).then(loadAll)}>Redeem 10</button> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={voucherPage <= 1} onClick={() => setVoucherPage((p) => p - 1)}>Previous</button><span>Page {voucherPage}/{voucherPageCount}</span><button className="btn-soft" disabled={voucherPage >= voucherPageCount} onClick={() => setVoucherPage((p) => p + 1)}>Next</button></div>
          </div>
        </div>
      )}

      {activeModal === 'rules' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Reminder rules</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button></div>
              <div className="crm-filters">
              <div className="form-field">
                <label htmlFor="rule-filter-name">Rule name</label>
                <input id="rule-filter-name" placeholder="reminder D-1" value={ruleFilters.name} onChange={(e) => { setRuleFilters({ ...ruleFilters, name: e.target.value }); setRulePage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="rule-filter-channel">Channel</label>
                <select id="rule-filter-channel" value={ruleFilters.channel} onChange={(e) => { setRuleFilters({ ...ruleFilters, channel: e.target.value }); setRulePage(1); }}>
                  <option value="">All channels</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
            </div>
            <p className="crm-sort-hint">Sort: click a column header</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'name')}>Name {sortArrow(ruleSort.key === 'name', ruleSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'channel')}>Channel {sortArrow(ruleSort.key === 'channel', ruleSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(ruleSort, setRuleSort, 'offsetHours')}>Offset hours {sortArrow(ruleSort.key === 'offsetHours', ruleSort.dir)}</button></th></tr></thead>
              <tbody>{pagedRules.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.channel}</td><td>{r.offsetHours}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={rulePage <= 1} onClick={() => setRulePage((p) => p - 1)}>Previous</button><span>Page {rulePage}/{rulePageCount}</span><button className="btn-soft" disabled={rulePage >= rulePageCount} onClick={() => setRulePage((p) => p + 1)}>Next</button></div>
          </div>
        </div>
      )}

      {activeModal === 'logs' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row crm-modal-head"><h3>Notification logs</h3><button type="button" className="btn-soft" onClick={() => setActiveModal(null)}>Close</button></div>
              <div className="crm-filters">
              <div className="form-field">
                <label htmlFor="log-filter-kind">Notification type</label>
                <input id="log-filter-kind" placeholder="campaign" value={logFilters.kind} onChange={(e) => { setLogFilters({ ...logFilters, kind: e.target.value }); setLogPage(1); }} />
              </div>
              <div className="form-field">
                <label htmlFor="log-filter-channel">Channel</label>
                <select id="log-filter-channel" value={logFilters.channel} onChange={(e) => { setLogFilters({ ...logFilters, channel: e.target.value }); setLogPage(1); }}>
                  <option value="">All channels</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="log-filter-status">Status</label>
                <input id="log-filter-status" placeholder="sent" value={logFilters.status} onChange={(e) => { setLogFilters({ ...logFilters, status: e.target.value }); setLogPage(1); }} />
              </div>
            </div>
            <p className="crm-sort-hint">Sort: click a column header</p>
            <table>
              <thead><tr><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'kind')}>Type {sortArrow(logSort.key === 'kind', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'channel')}>Channel {sortArrow(logSort.key === 'channel', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'status')}>Status {sortArrow(logSort.key === 'status', logSort.dir)}</button></th><th><button type="button" className="th-sort" onClick={() => toggleSort(logSort, setLogSort, 'createdAt')}>Date {sortArrow(logSort.key === 'createdAt', logSort.dir)}</button></th></tr></thead>
              <tbody>{pagedLogs.map((l) => <tr key={l.id}><td>{l.kind}</td><td>{l.channel}</td><td>{l.status}</td><td>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div className="crm-pager row"><button className="btn-soft" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>Previous</button><span>Page {logPage}/{logPageCount}</span><button className="btn-soft" disabled={logPage >= logPageCount} onClick={() => setLogPage((p) => p + 1)}>Next</button></div>
          </div>
        </div>
      )}
    </div>
  );
}


