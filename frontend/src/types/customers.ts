export type CustomerListItem = {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  birthDate: string | null;
  preferredStore?: { id: number; name: string } | null;
};

export type CustomerFile = {
  customer: CustomerListItem;
  summary: {
    salesCount: number;
    ordersCount: number;
    upcomingAppointmentsCount: number;
    pastAppointmentsCount: number;
    loyaltyPoints: number;
    giftVoucherCount: number;
  };
  sales: Array<{
    id: number;
    receiptNumber: string | null;
    status: string;
    paymentStatus: string;
    total: number;
    sellerEmail: string | null;
    createdAt: string;
    items: Array<{
      id: number;
      label: string;
      itemType: string;
      quantity: number;
      lineTotal: number;
    }>;
    payments: Array<{
      id: number;
      method: string;
      amount: number;
      status: string;
      paidAt: string;
    }>;
  }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    total: number;
    pickupInStore: boolean;
    pickupSlot: string | null;
    giftVoucherAmount: number;
    createdAt: string;
    items: Array<{
      id: number;
      productName: string;
      quantity: number;
      lineTotal: number;
    }>;
  }>;
  appointments: {
    upcoming: Array<{
      id: number;
      status: string;
      paymentMode: string | null;
      paymentStatus: string | null;
      startAt: string;
      endAt: string;
      notes: string | null;
      employee: { id: number; fullName: string };
      services: Array<{
        id: number;
        serviceName: string;
        quantity: number;
        durationMinutes: number;
      }>;
    }>;
    past: Array<{
      id: number;
      status: string;
      paymentMode: string | null;
      paymentStatus: string | null;
      startAt: string;
      endAt: string;
      notes: string | null;
      employee: { id: number; fullName: string };
      services: Array<{
        id: number;
        serviceName: string;
        quantity: number;
        durationMinutes: number;
      }>;
    }>;
    history: Array<{
      id: number;
      fromStatus: string | null;
      toStatus: string;
      changedBy: string;
      reason: string | null;
      createdAt: string;
    }>;
  };
  loyalty: {
    account: {
      id: number;
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
    } | null;
    events: Array<{
      id: number;
      eventType: string;
      pointsDelta: number;
      balanceAfter: number;
      reason: string | null;
      createdAt: string;
    }>;
  };
  giftVouchers: Array<{
    id: number;
    code: string;
    status: string;
    purchaserName: string | null;
    recipientName: string | null;
    serviceLabel: string | null;
    initialAmount: number;
    balanceAmount: number;
    effectiveAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
  notifications: Array<{
    id: number;
    kind: string;
    channel: string;
    status: string;
    createdAt: string;
  }>;
};
