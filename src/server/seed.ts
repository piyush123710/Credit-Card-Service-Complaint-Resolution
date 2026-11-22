import type {
  AuditLogEntry,
  CustomerAccount,
  LedgerTransaction,
  OperatorRole,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  ServiceRequest,
  ValidationCategory,
  ValidationScenario,
} from '../shared/types.ts';

const CUSTOMER_PROFILES = [
  { name: 'Elena Vance', email: 'elena.vance@northstar-mail.com', phone: '(415) 555-0142', network: 'Visa' as const, tier: 'Visa Signature Reserve', limit: 28000, apr: 19.99, zip: '94107', addr: '412 Townsend St, Apt 6B, San Francisco, CA 94107', dob: '1986-04-18', ssn: '4821' },
  { name: 'Marcus Thorne', email: 'm.thorne@oakridge-tech.io', phone: '(312) 555-0189', network: 'Mastercard' as const, tier: 'World Elite Rewards', limit: 35000, apr: 18.49, zip: '60611', addr: '215 E Chestnut St, Suite 1402, Chicago, IL 60611', dob: '1979-11-03', ssn: '7394' },
  { name: 'Priya Nair', email: 'priya.nair@cloudcrest.org', phone: '(206) 555-0114', network: 'Visa' as const, tier: 'Cashback Plus', limit: 14500, apr: 22.99, zip: '98101', addr: '1420 5th Ave, Unit 910, Seattle, WA 98101', dob: '1992-08-27', ssn: '1905' },
  { name: 'David Kowalski', email: 'dkowalski@midwestfreight.com', phone: '(614) 555-0163', network: 'Amex' as const, tier: 'Corporate Travel Gold', limit: 42000, apr: 17.24, zip: '43215', addr: '88 N High St, Apt 304, Columbus, OH 43215', dob: '1981-01-14', ssn: '6620' },
  { name: 'Hannah Lindqvist', email: 'hannah.l@nordicstudio.co', phone: '(617) 555-0198', network: 'Visa' as const, tier: 'Visa Signature Reserve', limit: 24000, apr: 20.49, zip: '02116', addr: '310 Newbury St, Fl 3, Boston, MA 02116', dob: '1988-06-22', ssn: '3318' },
  { name: 'Carlos Mendoza', email: 'cmendoza@sunbeltlogistics.net', phone: '(512) 555-0177', network: 'Mastercard' as const, tier: 'Platinum Select', limit: 18000, apr: 21.99, zip: '78701', addr: '601 Congress Ave, Apt 1105, Austin, TX 78701', dob: '1990-09-09', ssn: '8542' },
  { name: 'Rachel Greenwald', email: 'rgreenwald@harborlegal.com', phone: '(212) 555-0135', network: 'Amex' as const, tier: 'Executive Preferred', limit: 50000, apr: 16.99, zip: '10013', addr: '74 Leonard St, Apt 8A, New York, NY 10013', dob: '1976-12-30', ssn: '5017' },
  { name: 'Trevor Okonkwo', email: 'tokonkwo@atlantamed.org', phone: '(404) 555-0156', network: 'Visa' as const, tier: 'Cashback Plus', limit: 12000, apr: 24.99, zip: '30308', addr: '715 Peachtree St NE, Unit 412, Atlanta, GA 30308', dob: '1994-03-11', ssn: '2783' },
  { name: 'Mei-Ling Zhou', email: 'meiling.zhou@pacificventures.com', phone: '(408) 555-0128', network: 'Mastercard' as const, tier: 'World Elite Rewards', limit: 32000, apr: 18.99, zip: '95113', addr: '150 S 1st St, Suite 702, San Jose, CA 95113', dob: '1985-07-19', ssn: '9104' },
  { name: 'Jonathan Vance-Miller', email: 'jvmiller@denverarch.io', phone: '(303) 555-0181', network: 'Visa' as const, tier: 'Platinum Select', limit: 19500, apr: 21.49, zip: '80202', addr: '1644 Platte St, Unit 208, Denver, CO 80202', dob: '1983-05-05', ssn: '4490' },
  { name: 'Sofia Castellanos', email: 'scastellanos@miamifinearts.org', phone: '(305) 555-0149', network: 'Amex' as const, tier: 'Executive Preferred', limit: 45000, apr: 17.99, zip: '33131', addr: '801 Brickell Key Dr, Apt 1904, Miami, FL 33131', dob: '1989-10-15', ssn: '6139' },
  { name: 'Benjamin Hayes', email: 'bhayes@raleighbio.com', phone: '(919) 555-0166', network: 'Visa' as const, tier: 'Cashback Plus', limit: 15000, apr: 23.49, zip: '27601', addr: '227 Fayetteville St, Apt 502, Raleigh, NC 27601', dob: '1991-02-24', ssn: '7751' },
  { name: 'Nadia Al-Mansoor', email: 'nadia.m@crescentenergy.co', phone: '(713) 555-0192', network: 'Mastercard' as const, tier: 'World Elite Rewards', limit: 38000, apr: 18.24, zip: '77002', addr: '1100 Louisiana St, Unit 2201, Houston, TX 77002', dob: '1984-08-08', ssn: '3086' },
  { name: 'Lucas Bergstrom', email: 'lbergstrom@twincitiesdesign.com', phone: '(612) 555-0121', network: 'Visa' as const, tier: 'Platinum Select', limit: 16500, apr: 22.49, zip: '55401', addr: '318 N 2nd Ave, Loft 4C, Minneapolis, MN 55401', dob: '1993-11-28', ssn: '5462' },
  { name: 'Claire Beaumont', email: 'cbeaumont@nola-hospitality.com', phone: '(504) 555-0173', network: 'Amex' as const, tier: 'Corporate Travel Gold', limit: 29000, apr: 19.49, zip: '70130', addr: '620 Poydras St, Apt 904, New Orleans, LA 70130', dob: '1980-03-17', ssn: '8924' },
  { name: 'Samuel Osei', email: 'sosei@phillyhealth.org', phone: '(215) 555-0144', network: 'Visa' as const, tier: 'Cashback Plus', limit: 11000, apr: 25.99, zip: '19103', addr: '1835 Market St, Apt 1210, Philadelphia, PA 19103', dob: '1995-07-02', ssn: '1247' },
  { name: 'Grace Nakamura', email: 'gnakamura@portlandcraft.co', phone: '(503) 555-0158', network: 'Mastercard' as const, tier: 'World Elite Rewards', limit: 27500, apr: 19.24, zip: '97209', addr: '925 NW Flanders St, Unit 311, Portland, OR 97209', dob: '1987-01-21', ssn: '6391' },
  { name: 'Owen Gallagher', email: 'ogallagher@phoenixsolar.net', phone: '(602) 555-0185', network: 'Visa' as const, tier: 'Platinum Select', limit: 21000, apr: 20.99, zip: '85004', addr: '450 N 3rd St, Apt 709, Phoenix, AZ 85004', dob: '1982-09-12', ssn: '4175' },
  { name: 'Amara Patel', email: 'apatel@njfintech.io', phone: '(201) 555-0131', network: 'Amex' as const, tier: 'Executive Preferred', limit: 48000, apr: 17.49, zip: '07302', addr: '90 Hudson St, Suite 1803, Jersey City, NJ 07302', dob: '1986-12-06', ssn: '9830' },
  { name: 'Victor Alvarez', email: 'valvarez@sandiegomarine.com', phone: '(619) 555-0169', network: 'Visa' as const, tier: 'Visa Signature Reserve', limit: 26000, apr: 20.19, zip: '92101', addr: '550 W C St, Unit 1502, San Diego, CA 92101', dob: '1978-05-29', ssn: '2508' },
  { name: 'Isabelle Moreau', email: 'imoreau@vermontfoods.co', phone: '(802) 555-0117', network: 'Mastercard' as const, tier: 'Platinum Select', limit: 17000, apr: 21.74, zip: '05401', addr: '115 College St, Apt 2A, Burlington, VT 05401', dob: '1991-06-14', ssn: '7146' },
  { name: 'Kenneth Park', email: 'kpark@va-cybersec.com', phone: '(703) 555-0194', network: 'Visa' as const, tier: 'Visa Signature Reserve', limit: 34000, apr: 18.74, zip: '22201', addr: '3100 Clarendon Blvd, Apt 815, Arlington, VA 22201', dob: '1984-04-04', ssn: '3652' },
  { name: 'Diana Rossi', email: 'drossi@saltlakemedtech.com', phone: '(801) 555-0152', network: 'Amex' as const, tier: 'Corporate Travel Gold', limit: 31000, apr: 19.89, zip: '84101', addr: '257 E 200 S, Unit 604, Salt Lake City, UT 84101', dob: '1989-08-23', ssn: '5901' },
  { name: 'Arthur Pendelton', email: 'apendelton@nashvilleaudio.co', phone: '(615) 555-0179', network: 'Mastercard' as const, tier: 'Cashback Plus', limit: 13500, apr: 23.99, zip: '37201', addr: '211 Commerce St, Apt 407, Nashville, TN 37201', dob: '1993-10-01', ssn: '8214' },
];

const REQUEST_TEMPLATES: Record<
  RequestCategory,
  Array<{
    subcategory: string;
    subject: string;
    description: string;
    baseAmount: number;
    defaultRole: OperatorRole;
  }>
> = {
  'Billing Inquiry': [
    {
      subcategory: 'Late Fee Waiver',
      subject: 'Requesting courtesy waiver on late payment fee assessed on statement',
      description: 'Customer reports payment was scheduled before 5 PM cutoff on due date; $39.00 late fee posted on statement close.',
      baseAmount: 39.0,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'APR & Interest Calculation',
      subject: 'Unexpected purchase interest charge after paying statement balance',
      description: 'Cardholder paid full prior statement balance yet trailing residual interest of $64.20 appeared on current cycle.',
      baseAmount: 64.2,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Foreign Transaction Fee',
      subject: '3% foreign transaction fee charged on Visa Signature Reserve tier',
      description: 'Product tier includes zero foreign transaction fees, but international hotel booking incurred an FX surcharge.',
      baseAmount: 48.75,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Annual Fee Adjustment',
      subject: 'Annual membership fee billed prior to agreed retention credit',
      description: 'Customer accepted retention offer last month; $195.00 annual fee posted without accompanying statement credit.',
      baseAmount: 195.0,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Minimum Due Discrepancy',
      subject: 'Minimum payment due exceeds 2% balance calculation formula',
      description: 'Customer requests breakdown of minimum payment jump following promotional 0% balance transfer expiration.',
      baseAmount: 112.5,
      defaultRole: 'Support Agent',
    },
  ],
  'Payment Issue': [
    {
      subcategory: 'ACH Autopay Failure',
      subject: 'Scheduled autopay failed to draft despite sufficient checking funds',
      description: 'Automated clearing house draft returned R01/R03 mismatch after bank routing transition; customer requests reinstatement.',
      baseAmount: 840.0,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Duplicate Payment Hold',
      subject: 'Two identical online payments debited from linked bank account',
      description: 'Portal timeout caused double submission of $1,250.00 payment; customer requests immediate reversal of duplicate draft.',
      baseAmount: 1250.0,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Unapplied Wire / Check',
      subject: 'Payoff check cleared bank 6 business days ago, not reflected on balance',
      description: 'Certified bank payment of $3,400.00 cleared issuing bank; card available credit remains frozen.',
      baseAmount: 3400.0,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Credit Balance Refund',
      subject: 'Overpayment created negative balance; requesting ACH refund',
      description: 'Merchant refund after full statement payoff left -$620.40 credit balance; customer requests direct deposit refund.',
      baseAmount: 620.4,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Payment Allocation Dispute',
      subject: 'Excess payment applied to 0% promo balance instead of 24.99% APR tier',
      description: 'Payment above minimum due should allocate to highest APR balance per CARD Act rules.',
      baseAmount: 450.0,
      defaultRole: 'Dispute Specialist',
    },
  ],
  'Transaction Dispute': [
    {
      subcategory: 'Unauthorized CNP Charge',
      subject: 'Unrecognized online electronics charge flagged by cardholder',
      description: 'Cardholder reports no knowledge of $789.99 e-commerce transaction; physical card remains in possession.',
      baseAmount: 789.99,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Duplicate POS Capture',
      subject: 'Restaurant settled tip-adjusted authorization twice on same date',
      description: 'Both $142.30 and $142.30 identical auth codes converted from pending to posted on merchant batch.',
      baseAmount: 142.3,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Merchant Non-Delivery',
      subject: 'Airline / event ticket canceled by vendor without refund after 30 days',
      description: 'Supporting cancellation email provided; merchant stopped responding to refund inquiries.',
      baseAmount: 1180.0,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Cancelled Subscription Billed',
      subject: 'Recurring SaaS membership charged after written cancellation',
      description: 'Customer holds cancellation confirmation number from 14 days prior to billing cycle renewal.',
      baseAmount: 89.0,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Incorrect Settlement Amount',
      subject: 'Car rental final invoice posted $265 higher than signed contract',
      description: 'Merchant added unapproved refueling and damage waiver fees post-return.',
      baseAmount: 265.4,
      defaultRole: 'Dispute Specialist',
    },
  ],
  'Card Complaint': [
    {
      subcategory: 'EMV Chip / Tap Failure',
      subject: 'Contactless NFC and EMV chip failing across multiple terminals',
      description: 'Cardholder experiencing repeated chip read errors; requests expedited replacement with same card number if possible.',
      baseAmount: 0,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Rewards Points Miscalculation',
      subject: '3x dining & travel multiplier points missing from recent statement',
      description: 'Merchant MCC code categorized as general retail instead of restaurant; missing 2,840 bonus points.',
      baseAmount: 28.4,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Unexpected Security Freeze',
      subject: 'Account placed on precautionary travel lock despite prior notice',
      description: 'Customer registered international travel itinerary 5 days prior; card declined at airport terminal.',
      baseAmount: 0,
      defaultRole: 'Dispute Specialist',
    },
    {
      subcategory: 'Replacement Card Delay',
      subject: 'Expedited replacement card courier tracking stalled for 4 days',
      description: 'Lost card replaced 4 days ago; overnight courier label created with no transit scan.',
      baseAmount: 0,
      defaultRole: 'Support Agent',
    },
    {
      subcategory: 'Credit Limit Reduction Complaint',
      subject: 'Sudden credit line decrease without 45-day adverse action notice',
      description: 'Customer contests unannounced reduction from $24,000 to $12,000 impacting credit utilization.',
      baseAmount: 0,
      defaultRole: 'Compliance Admin',
    },
  ],
};

const OPERATORS: Record<OperatorRole, string[]> = {
  'Support Agent': ['Sarah Jenkins', 'Liam Mercer', 'Tessa Morales'],
  'Dispute Specialist': ['Evelyn Brooks', 'Noah Takahashi'],
  'Compliance Admin': ['Morgan Sterling'],
};

const MERCHANTS = [
  'Delta Air Lines',
  'Whole Foods Market',
  'Amazon Marketplace',
  'Marriott International',
  'Apple Store Online',
  'Chevron Fuel Station',
  'Uber Trip',
  'CloudHost Infrastructure',
  'Equinox Fitness',
  'Blue Bottle Coffee',
  'Target Retail #1402',
  'Hertz Car Rental',
];

function deterministicOffset(seed: number, mod: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.floor(Math.abs(x)) % mod;
}

function isoHoursAgo(hours: number): string {
  const base = new Date('2026-11-21T23:00:00.000Z').getTime();
  return new Date(base - hours * 3600 * 1000).toISOString();
}

function isoHoursFromNow(hours: number): string {
  const base = new Date('2026-11-21T23:00:00.000Z').getTime();
  return new Date(base + hours * 3600 * 1000).toISOString();
}

export interface SeedDataset {
  customers: CustomerAccount[];
  transactions: LedgerTransaction[];
  requests: ServiceRequest[];
  scenarios: ValidationScenario[];
  auditLogs: AuditLogEntry[];
}

export function generateSeedDataset(): SeedDataset {
  const customers: CustomerAccount[] = CUSTOMER_PROFILES.map((p, idx) => {
    const numSuffix = String(1000 + ((idx * 379 + 4121) % 8999));
    const fullPan = `${p.network === 'Visa' ? '4532' : p.network === 'Mastercard' ? '5412' : '3782'} ${String(1000 + idx * 111).slice(0, 4)} ${String(2200 + idx * 137).slice(0, 4)} ${numSuffix}`;
    const currentBalance = Number((p.limit * (0.14 + (idx % 6) * 0.09)).toFixed(2));
    const statementBalance = Number((currentBalance * 0.88).toFixed(2));
    const availableCredit = Number((p.limit - currentBalance).toFixed(2));
    const isExpiredAnomaly = idx === 7; // Scenario anomaly: expired card still active

    return {
      id: `cust-${String(idx + 1).padStart(3, '0')}`,
      customerCode: `MC-${40100 + idx}`,
      fullName: p.name,
      email: p.email,
      phone: p.phone,
      cardLast4: numSuffix,
      fullPan,
      cardNetwork: p.network,
      cardTier: p.tier,
      cardExpiry: isExpiredAnomaly ? '08/25' : `${String((idx % 12) + 1).padStart(2, '0')}/${28 + (idx % 3)}`,
      accountStatus: isExpiredAnomaly ? 'Expired-Active Anomaly' : idx === 11 ? 'Frozen' : 'Active',
      creditLimit: p.limit,
      currentBalance,
      statementBalance,
      availableCredit,
      apr: p.apr,
      rewardPoints: 12400 + idx * 3450,
      ssnLast4: p.ssn,
      dob: p.dob,
      billingAddress: p.addr,
      billingZip: p.zip,
      kbaVerified: false,
      kbaVerifiedAt: null,
      kbaVerifiedBy: null,
    };
  });

  // Intentionally introduce realistic data anomalies in specific customer records for our validation scenarios
  // Scenario 2: Available credit calculation error on cust-003 (availableCredit doesn't equal creditLimit - currentBalance)
  customers[2].availableCredit = Number((customers[2].availableCredit - 410.25).toFixed(2));
  // Scenario 5: Over-limit balance anomaly on cust-016
  customers[15].currentBalance = 11640.0;
  customers[15].availableCredit = -640.0;
  // Scenario 9: Statement balance mismatch on cust-005
  customers[4].statementBalance = Number((customers[4].statementBalance + 142.8).toFixed(2));
  // Scenario 12: Negative reward points drift on cust-010
  customers[9].rewardPoints = -1450;

  const transactions: LedgerTransaction[] = [];
  for (let i = 0; i < 64; i++) {
    const cust = customers[i % customers.length];
    const merchant = MERCHANTS[i % MERCHANTS.length];
    const baseAmt = Number((28.5 + ((i * 73.19) % 920)).toFixed(2));
    const isPayment = i % 7 === 0;
    const isRefund = i === 19 || i === 33;
    const isForeign = i % 9 === 0 && !isPayment;

    transactions.push({
      id: `tx-${String(i + 1).padStart(4, '0')}`,
      txRef: `TXN-2026-${String(88100 + i * 17)}`,
      customerId: cust.id,
      merchant: isPayment ? 'ACH Online Payment — Thank You' : merchant,
      category: isPayment ? 'Payment' : i % 3 === 0 ? 'Travel & Transit' : i % 2 === 0 ? 'Retail' : 'Dining',
      amount: baseAmt,
      currency: isForeign ? 'EUR' : 'USD',
      fxRate: isForeign ? 1.09 : 1.0,
      postedAmountUsd: isForeign ? Number((baseAmt * 1.09).toFixed(2)) : baseAmt,
      type: isPayment ? 'Payment' : isRefund ? 'Refund' : 'Purchase',
      status: i % 11 === 0 ? 'Disputed' : i % 13 === 0 ? 'Pending' : 'Posted',
      postedAt: isoHoursAgo(6 + i * 14),
      cardLast4: cust.cardLast4,
      authCode: `A${String(10420 + i * 31).slice(0, 5)}`,
    });
  }

  // Inject specific transaction-level anomalies tied to validation scenarios
  // Duplicate posting: tx-0004 & tx-0005 identical merchant/amount/authCode on same customer
  transactions[4].customerId = transactions[3].customerId;
  transactions[4].merchant = transactions[3].merchant;
  transactions[4].amount = transactions[3].amount;
  transactions[4].postedAmountUsd = transactions[3].postedAmountUsd;
  transactions[4].authCode = transactions[3].authCode;
  transactions[4].cardLast4 = transactions[3].cardLast4;
  transactions[4].postedAt = transactions[3].postedAt;

  // FX calculation mismatch on tx-0010 (index 9)
  transactions[9].currency = 'GBP';
  transactions[9].fxRate = 1.27;
  transactions[9].amount = 400.0;
  transactions[9].postedAmountUsd = 548.0; // Should be 508.00 (+$40 error)

  // Refund posted with Purchase debit type on tx-0020 (index 19)
  transactions[19].merchant = 'Delta Air Lines — Ticket Refund';
  transactions[19].type = 'Purchase'; // Incorrect: should be 'Refund'

  // Orphan pending auth > 14 days old on tx-0027 (index 26)
  transactions[26].status = 'Pending';
  transactions[26].postedAt = isoHoursAgo(24 * 16);

  // Generate 168 Service Requests across all 4 categories
  const categories: RequestCategory[] = [
    'Billing Inquiry',
    'Payment Issue',
    'Transaction Dispute',
    'Card Complaint',
  ];
  const statuses: RequestStatus[] = ['Open', 'In Review', 'Pending Customer', 'Escalated', 'Resolved'];
  const priorities: RequestPriority[] = ['Critical', 'High', 'Medium', 'Low'];

  const requests: ServiceRequest[] = [];
  for (let i = 0; i < 168; i++) {
    const category = categories[i % 4];
    const templates = REQUEST_TEMPLATES[category];
    const tpl = templates[Math.floor(i / 4) % templates.length];
    const cust = customers[(i * 5 + deterministicOffset(i, 7)) % customers.length];

    // Weighted realistic status distribution
    let status: RequestStatus;
    const mod = i % 12;
    if (mod <= 3) status = 'Open';
    else if (mod <= 6) status = 'In Review';
    else if (mod === 7) status = 'Pending Customer';
    else if (mod === 8) status = 'Escalated';
    else status = 'Resolved';

    const priority: RequestPriority =
      status === 'Escalated'
        ? 'Critical'
        : tpl.baseAmount > 1000
          ? 'High'
          : priorities[(i + deterministicOffset(i, 4)) % priorities.length];

    const assignedRole = status === 'Escalated' ? 'Compliance Admin' : tpl.defaultRole;
    const opList = OPERATORS[assignedRole];
    const assignedOperator = opList[i % opList.length];

    const variance = ((i * 19.37) % 140) - 35;
    const amountDisputed = tpl.baseAmount > 0 ? Math.max(12, Number((tpl.baseAmount + variance).toFixed(2))) : 0;
    const createdHoursAgo = 4 + i * 3.5;
    const createdAt = isoHoursAgo(createdHoursAgo);
    const updatedAt = isoHoursAgo(Math.max(0.5, createdHoursAgo - 2));
    const slaDueAt = status === 'Resolved' ? isoHoursAgo(1) : isoHoursFromNow(4 + (i % 48));

    const timeline = [
      {
        id: `tl-${i}-1`,
        timestamp: createdAt,
        actor: cust.fullName,
        role: 'Customer' as const,
        action: 'Service Request Submitted',
        note: `Submitted via ${i % 3 === 0 ? 'Cardholder Mobile Portal' : i % 3 === 1 ? 'Phone IVR Queue' : 'Secure Web Message'} regarding card ending in ${cust.cardLast4}.`,
      },
      {
        id: `tl-${i}-2`,
        timestamp: isoHoursAgo(Math.max(1, createdHoursAgo - 1)),
        actor: assignedOperator,
        role: assignedRole,
        action: 'Ticket Triaged & Assigned',
        note: `Routed to ${assignedRole} queue (${tpl.subcategory}). Confidentiality mask active pending KBA verification.`,
      },
    ];

    if (status === 'Resolved') {
      timeline.push({
        id: `tl-${i}-3`,
        timestamp: updatedAt,
        actor: assignedOperator,
        role: assignedRole,
        action: 'Resolution Completed',
        note:
          amountDisputed > 0
            ? `Verified account ledger and issued $${amountDisputed.toFixed(2)} adjustment/credit to card ending in ${cust.cardLast4}.`
            : 'Completed cardholder account remediation and confirmed delivery/status update.',
      });
    } else if (status === 'Escalated') {
      timeline.push({
        id: `tl-${i}-3`,
        timestamp: updatedAt,
        actor: 'Evelyn Brooks',
        role: 'Dispute Specialist',
        action: 'Escalated to Compliance Admin',
        note: 'Requires secondary ledger audit and Reg Z timeline review before final determination.',
      });
    }

    requests.push({
      id: `req-${String(i + 1).padStart(4, '0')}`,
      ticketNumber: `SR-${260101 + i}`,
      customerId: cust.id,
      customerName: cust.fullName,
      cardLast4: cust.cardLast4,
      cardNetwork: cust.cardNetwork,
      category,
      subcategory: tpl.subcategory,
      subject: tpl.subject,
      description: `${tpl.description} Account ref: ${cust.customerCode}.`,
      status,
      priority,
      amountDisputed,
      assignedRole,
      assignedOperator,
      slaDueAt,
      createdAt,
      updatedAt,
      provisionalCreditIssued:
        category === 'Transaction Dispute' && (status === 'In Review' || status === 'Resolved') && amountDisputed > 0
          ? amountDisputed
          : 0,
      resolutionSummary:
        status === 'Resolved'
          ? `Closed with confirmed adjustment and cardholder notification sent to ${cust.email}.`
          : null,
      timeline,
    });
  }

  // Generate 46 Transaction & Account Validation Scenarios (14 Failed anomalies + 32 Passed checks)
  const validationBlueprints: Array<{
    category: ValidationCategory;
    title: string;
    severity: 'Critical' | 'High' | 'Medium';
    targetType: 'Transaction' | 'Account';
    targetIndex: number;
    ruleDescription: string;
    expectedValue: string;
    actualValue: string;
    discrepancyAmount: number;
    status: 'Failed' | 'Passed';
    remediationAction: string;
  }> = [
    {
      category: 'Duplicate Posting',
      title: 'Duplicate merchant settlement sharing identical authCode & timestamp',
      severity: 'Critical',
      targetType: 'Transaction',
      targetIndex: 4,
      ruleDescription: 'No two posted transactions may share identical customerId, amount, merchant, and authCode within a 24h settlement window.',
      expectedValue: '1 posted settlement ($' + transactions[3].postedAmountUsd.toFixed(2) + ')',
      actualValue: '2 posted settlements ($' + (transactions[3].postedAmountUsd * 2).toFixed(2) + ')',
      discrepancyAmount: transactions[3].postedAmountUsd,
      status: 'Failed',
      remediationAction: 'Reverse duplicate settlement record and restore available credit balance.',
    },
    {
      category: 'Credit Limit',
      title: 'Available credit arithmetic drift vs. limit minus current balance',
      severity: 'High',
      targetType: 'Account',
      targetIndex: 2,
      ruleDescription: 'Account availableCredit must strictly equal creditLimit - currentBalance within $0.01 rounding tolerance.',
      expectedValue: '$' + (customers[2].creditLimit - customers[2].currentBalance).toFixed(2),
      actualValue: '$' + customers[2].availableCredit.toFixed(2),
      discrepancyAmount: 410.25,
      status: 'Failed',
      remediationAction: 'Recalculate availableCredit directly from verified ledger creditLimit - currentBalance.',
    },
    {
      category: 'Card Lifecycle',
      title: 'Expired card PAN remains in Active authorization state',
      severity: 'Critical',
      targetType: 'Account',
      targetIndex: 7,
      ruleDescription: 'Cards with cardExpiry earlier than current billing month (11/26) must transition to Restricted/Expired.',
      expectedValue: 'Restricted (Expiry 08/25)',
      actualValue: 'Expired-Active Anomaly (Expiry 08/25)',
      discrepancyAmount: 0,
      status: 'Failed',
      remediationAction: 'Transition account status to Restricted and trigger renewal card re-issuance.',
    },
    {
      category: 'FX & Fees',
      title: 'GBP-to-USD foreign exchange spread overcharge beyond card rate',
      severity: 'High',
      targetType: 'Transaction',
      targetIndex: 9,
      ruleDescription: 'postedAmountUsd must match amount * fxRate within +/- $0.05 conversion tolerance.',
      expectedValue: '$508.00 (400.00 GBP × 1.27)',
      actualValue: '$548.00 (+$40.00 variance)',
      discrepancyAmount: 40.0,
      status: 'Failed',
      remediationAction: 'Correct postedAmountUsd to $508.00 and credit $40.00 FX variance.',
    },
    {
      category: 'Credit Limit',
      title: 'Current balance exceeds authorized credit limit without over-limit flag',
      severity: 'High',
      targetType: 'Account',
      targetIndex: 15,
      ruleDescription: 'Accounts exceeding 100% creditLimit require explicit Over-Limit authorization or zero floor on availableCredit.',
      expectedValue: 'Balance <= $11,000.00',
      actualValue: '$11,640.00 (Available: -$640.00)',
      discrepancyAmount: 640.0,
      status: 'Failed',
      remediationAction: 'Cap current balance exposure and flag account for temporary limit review.',
    },
    {
      category: 'Balance Mismatch',
      title: 'Statement balance exceeds current ledger balance on closing snapshot',
      severity: 'High',
      targetType: 'Account',
      targetIndex: 4,
      ruleDescription: 'Statement close snapshot cannot drift above verified posted cycle balance without pending reversals.',
      expectedValue: '$' + (customers[4].statementBalance - 142.8).toFixed(2),
      actualValue: '$' + customers[4].statementBalance.toFixed(2),
      discrepancyAmount: 142.8,
      status: 'Failed',
      remediationAction: 'Synchronize statementBalance with authoritative posted cycle sum.',
    },
    {
      category: 'Duplicate Posting',
      title: 'Refund credit misclassified as Purchase debit on airline settlement',
      severity: 'Critical',
      targetType: 'Transaction',
      targetIndex: 19,
      ruleDescription: 'Transactions containing merchant refund indicators must carry TransactionType = Refund.',
      expectedValue: 'Type: Refund (-$' + transactions[19].postedAmountUsd.toFixed(2) + ')',
      actualValue: 'Type: Purchase (+$' + transactions[19].postedAmountUsd.toFixed(2) + ')',
      discrepancyAmount: Number((transactions[19].postedAmountUsd * 2).toFixed(2)),
      status: 'Failed',
      remediationAction: 'Reclassify transaction type to Refund and reverse erroneous debit impact.',
    },
    {
      category: 'Rewards Ledger',
      title: 'Negative reward points balance caused by double redemption reversal',
      severity: 'Medium',
      targetType: 'Account',
      targetIndex: 9,
      ruleDescription: 'Cardholder rewardPoints balance must remain >= 0 across earn and redemption cycles.',
      expectedValue: '>= 0 pts (Baseline 1,250 pts)',
      actualValue: '-1,450 pts',
      discrepancyAmount: 27.0,
      status: 'Failed',
      remediationAction: 'Restore reward points ledger to verified positive earned balance (1,250 pts).',
    },
    {
      category: 'Reg Z Compliance',
      title: 'Pending authorization hold retained beyond 7-day merchant expiry window',
      severity: 'Medium',
      targetType: 'Transaction',
      targetIndex: 26,
      ruleDescription: 'Uncaptured Pending authorizations older than 7 days must auto-release from credit hold.',
      expectedValue: 'Released / Reversed (>7d)',
      actualValue: 'Pending (16 days elapsed)',
      discrepancyAmount: transactions[26].postedAmountUsd,
      status: 'Failed',
      remediationAction: 'Release stale authorization hold and restore cardholder available credit.',
    },
    {
      category: 'APR & Interest',
      title: 'Trailing interest assessed on grace-period account with zero prior carry',
      severity: 'High',
      targetType: 'Transaction',
      targetIndex: 12,
      ruleDescription: 'Accounts paying prior statement in full before due date qualify for interest grace period.',
      expectedValue: '$0.00 Interest',
      actualValue: '$54.60 Trailing Interest',
      discrepancyAmount: 54.6,
      status: 'Failed',
      remediationAction: 'Waive trailing interest assessment and restore grace-period flag.',
    },
    {
      category: 'FX & Fees',
      title: 'Foreign transaction fee assessed on zero-FX Visa Signature Reserve tier',
      severity: 'Medium',
      targetType: 'Account',
      targetIndex: 0,
      ruleDescription: 'Visa Signature Reserve and World Elite tiers carry 0% FX fee waiver.',
      expectedValue: '$0.00 FX Surcharge',
      actualValue: '$38.40 FX Surcharge',
      discrepancyAmount: 38.4,
      status: 'Failed',
      remediationAction: 'Credit $38.40 erroneous FX fee back to account balance.',
    },
    {
      category: 'Reg Z Compliance',
      title: 'Provisional credit issuance missed 10-business-day Reg Z acknowledgement',
      severity: 'Critical',
      targetType: 'Account',
      targetIndex: 6,
      ruleDescription: 'Disputes under investigation >10 business days require provisional credit posting.',
      expectedValue: 'Provisional Credit Active',
      actualValue: 'Pending Day 12',
      discrepancyAmount: 425.0,
      status: 'Failed',
      remediationAction: 'Post $425.00 provisional dispute credit and log Reg Z timestamp.',
    },
    {
      category: 'APR & Interest',
      title: 'Promotional 0% balance transfer APR reverted 30 days early',
      severity: 'High',
      targetType: 'Account',
      targetIndex: 13,
      ruleDescription: 'Promotional APR expiration date must match original disclosure schedule (12 billing cycles).',
      expectedValue: '0.00% Promo APR (Cycle 11/12)',
      actualValue: '22.49% Standard APR',
      discrepancyAmount: 82.15,
      status: 'Failed',
      remediationAction: 'Restore 0.00% promotional rate through Cycle 12 and credit $82.15 interest.',
    },
    {
      category: 'Balance Mismatch',
      title: 'ACH payment reversal posted twice to ledger balance',
      severity: 'Critical',
      targetType: 'Transaction',
      targetIndex: 35,
      ruleDescription: 'Returned ACH draft may generate at most one debit reversal per return trace number.',
      expectedValue: '1 Reversal Entry',
      actualValue: '2 Reversal Entries (+$310.00)',
      discrepancyAmount: 310.0,
      status: 'Failed',
      remediationAction: 'Remove duplicate ACH return fee/debit and reconcile cycle balance.',
    },
  ];

  const passingCategories: ValidationCategory[] = [
    'Balance Mismatch',
    'APR & Interest',
    'Card Lifecycle',
    'Credit Limit',
    'FX & Fees',
    'Rewards Ledger',
    'Reg Z Compliance',
    'Duplicate Posting',
  ];

  const scenarios: ValidationScenario[] = [];
  for (let i = 0; i < 46; i++) {
    if (i < validationBlueprints.length) {
      const bp = validationBlueprints[i];
      const cust =
        bp.targetType === 'Account'
          ? customers[bp.targetIndex]
          : customers.find((c) => c.id === transactions[bp.targetIndex].customerId) ?? customers[0];
      const targetId = bp.targetType === 'Account' ? cust.id : transactions[bp.targetIndex].id;
      const targetRef = bp.targetType === 'Account' ? cust.customerCode : transactions[bp.targetIndex].txRef;

      scenarios.push({
        id: `val-${String(i + 1).padStart(3, '0')}`,
        scenarioCode: `VAL-${String(101 + i)}`,
        title: bp.title,
        category: bp.category,
        severity: bp.severity,
        targetType: bp.targetType,
        targetId,
        targetRef,
        customerId: cust.id,
        customerName: cust.fullName,
        ruleDescription: bp.ruleDescription,
        expectedValue: bp.expectedValue,
        actualValue: bp.actualValue,
        discrepancyAmount: bp.discrepancyAmount,
        status: bp.status,
        remediationAction: bp.remediationAction,
        lastCheckedAt: isoHoursAgo(1),
        remediatedAt: null,
        remediatedBy: null,
      });
    } else {
      const cat = passingCategories[i % passingCategories.length];
      const useAccount = i % 2 === 0;
      const cust = customers[i % customers.length];
      const tx = transactions[i % transactions.length];
      const targetCust = useAccount ? cust : customers.find((c) => c.id === tx.customerId) ?? cust;

      scenarios.push({
        id: `val-${String(i + 1).padStart(3, '0')}`,
        scenarioCode: `VAL-${String(101 + i)}`,
        title: `${cat} integrity check — ${useAccount ? targetCust.customerCode : tx.txRef}`,
        category: cat,
        severity: i % 5 === 0 ? 'High' : 'Medium',
        targetType: useAccount ? 'Account' : 'Transaction',
        targetId: useAccount ? targetCust.id : tx.id,
        targetRef: useAccount ? targetCust.customerCode : tx.txRef,
        customerId: targetCust.id,
        customerName: targetCust.fullName,
        ruleDescription: `Automated ledger reconciliation rule verifying ${cat.toLowerCase()} consistency and regulatory tolerance.`,
        expectedValue: useAccount
          ? `Avail $${(targetCust.creditLimit - targetCust.currentBalance).toFixed(2)}`
          : `Posted $${tx.postedAmountUsd.toFixed(2)}`,
        actualValue: useAccount
          ? `Avail $${(targetCust.creditLimit - targetCust.currentBalance).toFixed(2)}`
          : `Posted $${tx.postedAmountUsd.toFixed(2)}`,
        discrepancyAmount: 0,
        status: 'Passed',
        remediationAction: 'No remediation required — record matches authoritative ledger.',
        lastCheckedAt: isoHoursAgo(1),
        remediatedAt: null,
        remediatedBy: null,
      });
    }
  }

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-001',
      timestamp: isoHoursAgo(3),
      actorName: 'Morgan Sterling',
      actorRole: 'Compliance Admin',
      action: 'Scheduled Ledger Validation Batch',
      targetType: 'Validation',
      targetId: 'BATCH-2026-1121',
      outcome: 'Allowed',
      details: 'Executed 46 transaction and account validation scenarios; 32 passed, 14 discrepancies flagged.',
    },
    {
      id: 'aud-002',
      timestamp: isoHoursAgo(2),
      actorName: 'Evelyn Brooks',
      actorRole: 'Dispute Specialist',
      action: 'Customer KBA Verification',
      targetType: 'Customer',
      targetId: 'cust-001',
      outcome: 'Verified',
      details: 'Verified DOB + Billing ZIP for ticket SR-260103 before reviewing dispute timeline.',
    },
    {
      id: 'aud-003',
      timestamp: isoHoursAgo(1.5),
      actorName: 'Sarah Jenkins',
      actorRole: 'Support Agent',
      action: 'Provisional Credit Issuance Attempt',
      targetType: 'Request',
      targetId: 'req-0007',
      outcome: 'Denied',
      details: 'Support Agent role blocked from issuing provisional dispute credits; routed to Dispute Specialist.',
    },
  ];

  return {
    customers,
    transactions,
    requests,
    scenarios,
    auditLogs,
  };
}
