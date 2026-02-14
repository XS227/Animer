export const LEAD_STATUSES = ['open', 'meeting', 'offer_sent', 'approved', 'won', 'lost'];
export const AMBASSADOR_STATUSES = ['Pending', 'Active', 'Paused'];

export const demoDb = {
  ambassadors: [
    {
      id: 'AMB123',
      name: 'Mina N.',
      email: 'mina@eksempel.no',
      status: 'Active',
      commissionRate: 0.1,
      createdAt: '2026-01-02T10:00:00.000Z'
    },
    {
      id: 'AMB987',
      name: 'Lars B.',
      email: 'lars@eksempel.no',
      status: 'Pending',
      commissionRate: 0.1,
      createdAt: '2026-01-18T12:00:00.000Z'
    }
  ],
  referralClicks: [],
  leads: [
    {
      id: 'lead-001',
      name: 'Kari Hansen',
      company: 'Elkjøp',
      email: 'kari@elkjop.no',
      ambassadorId: 'AMB123',
      status: 'open',
      dealValue: 0,
      value: 0,
      commissionRate: 0.1,
      commissionAmount: 0,
      createdAt: '2026-02-01T09:00:00.000Z'
    },
    {
      id: 'lead-002',
      name: 'Nils Pedersen',
      company: 'Power Norge',
      email: 'nils@power.no',
      ambassadorId: null,
      status: 'meeting',
      dealValue: 0,
      value: 0,
      commissionRate: 0.1,
      commissionAmount: 0,
      createdAt: '2026-02-03T09:00:00.000Z'
    },
    {
      id: 'lead-003',
      name: 'Sara Olsen',
      company: 'XXL Sport',
      email: 'sara@xxl.no',
      ambassadorId: 'AMB123',
      status: 'approved',
      dealValue: 120000,
      value: 120000,
      commissionRate: 0.1,
      commissionAmount: 12000,
      createdAt: '2026-02-06T09:00:00.000Z'
    }
  ],
  payouts: [
    { ambassadorId: 'AMB123', paidOut: 5000 }
  ]
};

export function currency(value) {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function calculateAmbassadorTotals(ambassadorId) {
  const ambassadorLeads = demoDb.leads.filter((lead) => lead.ambassadorId === ambassadorId);
  const approvedLeads = ambassadorLeads.filter((lead) => ['won', 'approved'].includes(String(lead.status || '').toLowerCase()));
  const pipelineLeads = ambassadorLeads.filter((lead) => !['won', 'approved', 'lost'].includes(String(lead.status || '').toLowerCase()));
  const revenue = approvedLeads.reduce((sum, lead) => sum + Number(lead.dealValue || lead.value || 0), 0);
  const earned = approvedLeads.reduce((sum, lead) => sum + Number(lead.commissionAmount || 0), 0);
  const paidOut = demoDb.payouts
    .filter((payout) => payout.ambassadorId === ambassadorId)
    .reduce((sum, payout) => sum + Number(payout.paidOut || 0), 0);

  return {
    leads: ambassadorLeads.length,
    won: approvedLeads.length,
    pipeline: pipelineLeads.length,
    revenue,
    earned,
    paidOut,
    available: earned - paidOut
  };
}
