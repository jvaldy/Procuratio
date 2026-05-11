import { apiRequest } from './client';

export function listLoyaltyAccounts() {
  return apiRequest<{ data: Array<{
    id: number;
    customerId: number;
    customerName: string;
    customerEmail: string;
    pointsBalance: number;
    isActive: boolean;
    subscriptionName: string | null;
    subscriptionStatus: string;
    subscriptionStartedAt: string | null;
    subscriptionEndsAt: string | null;
    visitCardName: string | null;
    visitCardTarget: number | null;
    visitCardUsed: number;
    visitCardActive: boolean;
    updatedAt: string;
  }> }>('/api/v1/crm/loyalty/accounts');
}

export function createLoyaltyEvent(payload: { customerId: number; type: 'earn' | 'redeem'; points: number; reason?: string }) {
  return apiRequest('/api/v1/crm/loyalty/events', { method: 'POST', body: JSON.stringify(payload) });
}

export function createBulkLoyaltyEvent(payload: { customerIds: number[]; type: 'earn' | 'redeem'; points: number; reason?: string }) {
  return apiRequest('/api/v1/crm/loyalty/events/bulk', { method: 'POST', body: JSON.stringify(payload) });
}

export function configureLoyaltyAccount(payload: {
  customerId: number;
  subscriptionName?: string;
  subscriptionStatus?: 'inactive' | 'active' | 'expired';
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  visitCardName?: string;
  visitCardTarget?: number;
  visitCardUsed?: number;
  visitCardActive?: boolean;
}) {
  return apiRequest('/api/v1/crm/loyalty/accounts/configure', { method: 'POST', body: JSON.stringify(payload) });
}

export function listCampaigns() {
  return apiRequest<{ data: Array<{ id: number; name: string; channel: string; status: string; targetCount: number; sentCount: number; failedCount: number }> }>('/api/v1/crm/campaigns');
}

export function createCampaign(payload: { name: string; channel: string; messageTemplate: string; segment: Record<string, unknown> }) {
  return apiRequest('/api/v1/crm/campaigns', { method: 'POST', body: JSON.stringify(payload) });
}

export function launchCampaign(id: number) {
  return apiRequest(`/api/v1/crm/campaigns/${id}/launch`, { method: 'POST' });
}

export function launchCampaignsBulk(payload: { campaignIds: number[] }) {
  return apiRequest('/api/v1/crm/campaigns/launch-bulk', { method: 'POST', body: JSON.stringify(payload) });
}

export function listGiftVouchers() {
  return apiRequest<{ data: Array<{ id: number; code: string; customerId: number | null; status: string; initialAmount: number; balanceAmount: number }> }>('/api/v1/crm/gift-vouchers');
}

export function createGiftVoucher(payload: { amount: number; customerId?: number; expiresAt?: string }) {
  return apiRequest('/api/v1/crm/gift-vouchers', { method: 'POST', body: JSON.stringify(payload) });
}

export function consumeGiftVoucher(id: number, amount: number) {
  return apiRequest(`/api/v1/crm/gift-vouchers/${id}/consume`, { method: 'POST', body: JSON.stringify({ amount }) });
}

export function sendGiftVouchersBulk(payload: { voucherIds: number[]; toEmail: string; message?: string }) {
  return apiRequest('/api/v1/crm/gift-vouchers/send-bulk', { method: 'POST', body: JSON.stringify(payload) });
}

export function listReminderRules() {
  return apiRequest<{ data: Array<{ id: number; name: string; channel: string; offsetHours: number; isActive: boolean }> }>('/api/v1/crm/reminder-rules');
}

export function createReminderRule(payload: { name: string; channel: string; offsetHours: number; isActive: boolean }) {
  return apiRequest('/api/v1/crm/reminder-rules', { method: 'POST', body: JSON.stringify(payload) });
}

export function runReminders() {
  return apiRequest<{ status: string; sent: number }>('/api/v1/crm/reminders/run', { method: 'POST' });
}

export function listNotificationLogs() {
  return apiRequest<{ data: Array<{ id: number; kind: string; channel: string; status: string; createdAt: string; customerId?: number; campaignId?: number; appointmentId?: number }> }>('/api/v1/crm/notification-logs');
}
