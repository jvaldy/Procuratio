import { FormEvent, useEffect, useState } from 'react';
import {
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
  consumeGiftVoucher,
} from '../../../api/crm';

export function CrmPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<Array<{ id: number; customerId: number; customerName: string; pointsBalance: number }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; channel: string; status: string; sentCount: number; targetCount: number }>>([]);
  const [vouchers, setVouchers] = useState<Array<{ id: number; code: string; status: string; balanceAmount: number }>>([]);
  const [rules, setRules] = useState<Array<{ id: number; name: string; channel: string; offsetHours: number }>>([]);
  const [logs, setLogs] = useState<Array<{ id: number; kind: string; channel: string; status: string; createdAt: string }>>([]);

  const [eventForm, setEventForm] = useState({ customerId: '', type: 'earn', points: '', reason: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', channel: 'email', minPoints: '', messageTemplate: '' });
  const [voucherForm, setVoucherForm] = useState({ amount: '', customerId: '', expiresAt: '' });
  const [ruleForm, setRuleForm] = useState({ name: 'Rappel J-1', channel: 'email', offsetHours: '24' });

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

  async function onCreateEvent(e: FormEvent) {
    e.preventDefault();
    setError(null);
    await createLoyaltyEvent({
      customerId: Number(eventForm.customerId),
      type: eventForm.type as 'earn' | 'redeem',
      points: Number(eventForm.points),
      reason: eventForm.reason || undefined,
    });
    setMessage('Événement fidélité enregistré.');
    await loadAll();
  }

  async function onCreateCampaign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    await createCampaign({
      name: campaignForm.name,
      channel: campaignForm.channel,
      messageTemplate: campaignForm.messageTemplate,
      segment: campaignForm.minPoints ? { minPoints: Number(campaignForm.minPoints) } : {},
    });
    setMessage('Campagne créée.');
    await loadAll();
  }

  async function onCreateVoucher(e: FormEvent) {
    e.preventDefault();
    setError(null);
    await createGiftVoucher({
      amount: Number(voucherForm.amount),
      customerId: voucherForm.customerId ? Number(voucherForm.customerId) : undefined,
      expiresAt: voucherForm.expiresAt || undefined,
    });
    setMessage('Bon cadeau créé.');
    await loadAll();
  }

  async function onCreateRule(e: FormEvent) {
    e.preventDefault();
    setError(null);
    await createReminderRule({
      name: ruleForm.name,
      channel: ruleForm.channel,
      offsetHours: Number(ruleForm.offsetHours),
      isActive: true,
    });
    setMessage('Règle de rappel ajoutée.');
    await loadAll();
  }

  return (
    <div className="stack">
      <h1 className="page-title">CRM Avancé</h1>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}

      <div className="panel stack">
        <h3>Fidélité</h3>
        <form className="row" onSubmit={onCreateEvent}>
          <input placeholder="customerId" value={eventForm.customerId} onChange={(e) => setEventForm({ ...eventForm, customerId: e.target.value })} />
          <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
            <option value="earn">Gagner</option>
            <option value="redeem">Consommer</option>
          </select>
          <input placeholder="points" value={eventForm.points} onChange={(e) => setEventForm({ ...eventForm, points: e.target.value })} />
          <input placeholder="raison" value={eventForm.reason} onChange={(e) => setEventForm({ ...eventForm, reason: e.target.value })} />
          <button type="submit">Valider</button>
        </form>
        <table>
          <thead><tr><th>Client</th><th>Solde points</th></tr></thead>
          <tbody>{loyalty.map((a) => <tr key={a.id}><td>{a.customerName} (#{a.customerId})</td><td>{a.pointsBalance}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="panel stack">
        <h3>Campagnes</h3>
        <form className="row" onSubmit={onCreateCampaign}>
          <input placeholder="nom campagne" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
          <select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
            <option value="email">email</option>
            <option value="sms">sms</option>
          </select>
          <input placeholder="min points (optionnel)" value={campaignForm.minPoints} onChange={(e) => setCampaignForm({ ...campaignForm, minPoints: e.target.value })} />
          <input className="grow" placeholder="message" value={campaignForm.messageTemplate} onChange={(e) => setCampaignForm({ ...campaignForm, messageTemplate: e.target.value })} />
          <button type="submit">Créer</button>
        </form>
        <table>
          <thead><tr><th>Nom</th><th>Canal</th><th>Statut</th><th>Envois</th><th>Action</th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.channel}</td><td>{c.status}</td><td>{c.sentCount}/{c.targetCount}</td>
                <td><button onClick={() => launchCampaign(c.id).then(loadAll)}>Lancer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h3>Bons cadeaux</h3>
        <form className="row" onSubmit={onCreateVoucher}>
          <input placeholder="montant" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} />
          <input placeholder="customerId optionnel" value={voucherForm.customerId} onChange={(e) => setVoucherForm({ ...voucherForm, customerId: e.target.value })} />
          <input placeholder="expiresAt ISO optionnel" value={voucherForm.expiresAt} onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })} />
          <button type="submit">Créer</button>
        </form>
        <table>
          <thead><tr><th>Code</th><th>Statut</th><th>Solde</th><th>Action</th></tr></thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td>{v.code}</td><td>{v.status}</td><td>{v.balanceAmount}</td>
                <td><button onClick={() => consumeGiftVoucher(v.id, 10).then(loadAll)}>Consommer 10</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h3>Rappels automatiques</h3>
        <form className="row" onSubmit={onCreateRule}>
          <input placeholder="nom règle" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
          <select value={ruleForm.channel} onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}>
            <option value="email">email</option>
            <option value="sms">sms</option>
          </select>
          <input placeholder="offset heures" value={ruleForm.offsetHours} onChange={(e) => setRuleForm({ ...ruleForm, offsetHours: e.target.value })} />
          <button type="submit">Ajouter</button>
          <button type="button" className="btn-soft" onClick={() => runReminders().then(loadAll)}>Exécuter maintenant</button>
        </form>
        <div className="row">{rules.map((r) => <span key={r.id}>{r.name} ({r.channel}, +{r.offsetHours}h)</span>)}</div>
        <h4>Logs notifications</h4>
        <table>
          <thead><tr><th>Type</th><th>Canal</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td>{l.kind}</td><td>{l.channel}</td><td>{l.status}</td><td>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

