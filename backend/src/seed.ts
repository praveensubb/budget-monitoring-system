/**
 * Seed script: npm run seed
 * Creates realistic demo data: departments, users, budgets, expenditures,
 * monitoring rules, alerts (via the rule engine) and audit logs.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database';
import Department from './models/Department';
import User from './models/User';
import Budget from './models/Budget';
import Expenditure from './models/Expenditure';
import Alert from './models/Alert';
import AuditLog from './models/AuditLog';
import { evaluateAllBudgets } from './modules/monitoring/anomaly.service';
import { RulesService } from './modules/rules/rules.service';

const FY = '2025-26';

async function seed() {
  await connectDatabase();
  console.log('Clearing existing data...');
  await Promise.all([
    Department.deleteMany({}), User.deleteMany({}), Budget.deleteMany({}),
    Expenditure.deleteMany({}), Alert.deleteMany({}), AuditLog.deleteMany({}),
  ]);

  // ---------- Departments ----------
  const departments = await Department.insertMany([
    { name: 'Information Technology', code: 'IT', head: 'Dr. Ananya Deshmukh', description: 'IT infrastructure, software systems, digital services and cybersecurity.', status: 'ACTIVE' },
    { name: 'Finance', code: 'FIN', head: 'Shri Rajesh Iyer', description: 'Financial planning, accounting, taxation and treasury operations.', status: 'ACTIVE' },
    { name: 'Human Resources', code: 'HR', head: 'Smt. Meera Krishnan', description: 'Recruitment, training, payroll and employee welfare.', status: 'ACTIVE' },
    { name: 'Public Works', code: 'PWD', head: 'Er. Vikram Patil', description: 'Construction, maintenance of government buildings and public infrastructure.', status: 'ACTIVE' },
    { name: 'Education', code: 'EDU', head: 'Dr. Kavita Joshi', description: 'Schools, colleges, scholarships and educational programmes.', status: 'ACTIVE' },
    { name: 'Healthcare', code: 'HLT', head: 'Dr. Arjun Nair', description: 'Hospitals, public health programmes and medical equipment.', status: 'ACTIVE' },
  ]);
  const deptByCode: Record<string, any> = {};
  for (const d of departments) deptByCode[d.code] = d;

  // ---------- Users ----------
  const hash = await bcrypt.hash('Admin@123', 10);
  const [admin, finance] = await User.insertMany([
    { name: 'System Administrator', email: 'admin@budget.gov', passwordHash: hash, role: 'ADMIN', departmentId: null, status: 'ACTIVE' },
    { name: 'Smt. Latha Raman', email: 'finance@budget.gov', passwordHash: hash, role: 'FINANCE_OFFICER', departmentId: deptByCode['FIN']._id, status: 'ACTIVE' },
  ]);
  const headUsers = await User.insertMany([
    { name: 'Dr. Ananya Deshmukh', email: 'head@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['IT']._id, status: 'ACTIVE' },
    { name: 'Shri Rajesh Iyer', email: 'head.fin@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['FIN']._id, status: 'ACTIVE' },
    { name: 'Smt. Meera Krishnan', email: 'head.hr@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['HR']._id, status: 'ACTIVE' },
    { name: 'Er. Vikram Patil', email: 'head.pwd@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['PWD']._id, status: 'ACTIVE' },
    { name: 'Dr. Kavita Joshi', email: 'head.edu@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['EDU']._id, status: 'ACTIVE' },
    { name: 'Dr. Arjun Nair', email: 'head.hlt@budget.gov', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: deptByCode['HLT']._id, status: 'ACTIVE' },
  ]);
  const headByDept: Record<string, any> = {};
  headUsers.forEach(h => headByDept[String(h.departmentId)] = h);

  // ---------- Monitoring rules ----------
  const rulesService = new RulesService();
  await rulesService.seedDefaults();

  // ---------- Budgets ----------
  const mkBudget = (code: string, category: string, amount: number, description: string) => ({
    departmentId: deptByCode[code]._id,
    financialYear: FY,
    category,
    allocatedAmount: amount,
    description,
    status: 'ACTIVE',
    createdBy: admin._id,
    approvedBy: 'Budget Allocation Committee',
  });
  const budgets = await Budget.insertMany([
    mkBudget('IT', 'Infrastructure', 2500000, 'Servers, networking equipment and data centre upgrades.'),
    mkBudget('IT', 'Software and Services', 1500000, 'Licences, SaaS subscriptions and development contracts.'),
    mkBudget('FIN', 'Operations', 1200000, 'Day-to-day finance department operations.'),
    mkBudget('FIN', 'Audit and Compliance', 800000, 'Statutory audits and compliance programmes.'),
    mkBudget('HR', 'Training', 900000, 'Staff training and capacity building programmes.'),
    mkBudget('HR', 'Operations', 600000, 'HR operations and recruitment drives.'),
    mkBudget('PWD', 'Infrastructure', 4200000, 'Road resurfacing and public building construction.'),
    mkBudget('PWD', 'Maintenance', 1800000, 'Preventive maintenance of public infrastructure.'),
    mkBudget('EDU', 'Equipment', 2000000, 'Smart classrooms, lab equipment and library resources.'),
    mkBudget('EDU', 'Scholarships', 1000000, 'Merit and means-based scholarship disbursements.'),
    mkBudget('HLT', 'Equipment', 3000000, 'Medical equipment and diagnostic instruments.'),
    mkBudget('HLT', 'Public Health Programmes', 2200000, 'Immunisation drives and health camps.'),
  ]);

  // ---------- Expenditures ----------
  const D = (m: number, day: number) => new Date(2025, m - 1, day);
  const mkExp = (budgetIdx: number, amount: number, date: Date, description: string, vendor: string, invoice: string, category: string) => {
    const b: any = budgets[budgetIdx];
    return {
      budgetId: b._id,
      departmentId: b.departmentId,
      amount, date, description, vendor, invoiceNumber: invoice, category,
      status: 'RECORDED',
      createdBy: finance._id,
    };
  };

  const expenditures = await Expenditure.insertMany([
    // IT Infrastructure (₹25,00,000) -> ~92% (HIGH RISK)
    mkExp(0, 650000, D(4, 12), 'Procurement of rack servers for data centre', 'Dell Technologies India', 'IT/INV/2025-041', 'Infrastructure'),
    mkExp(0, 480000, D(6, 3), 'Core network switches and firewall renewal', 'Cisco Systems India', 'IT/INV/2025-118', 'Infrastructure'),
    mkExp(0, 320000, D(7, 21), 'UPS systems and power backup installation', 'APC by Schneider Electric', 'IT/INV/2025-203', 'Infrastructure'),
    mkExp(0, 285000, D(8, 15), 'Structured cabling for new office block', 'CommScope Networks', 'IT/INV/2025-267', 'Infrastructure'),
    mkExp(0, 350000, D(9, 2), 'Data centre cooling unit replacement', 'Blue Star Ltd', 'IT/INV/2025-312', 'Infrastructure'),
    mkExp(0, 280000, D(9, 5), 'Additional storage array expansion', 'NetApp India', 'IT/INV/2025-318', 'Infrastructure'),
    // IT Software (₹15,00,000) -> ~68% (normal, but one large tx)
    mkExp(1, 420000, D(5, 10), 'ERP licence renewal (annual)', 'SAP India Pvt Ltd', 'IT/INV/2025-097', 'Software and Services'),
    mkExp(1, 210000, D(7, 8), 'Cloud hosting subscription (6 months)', 'Amazon Web Services India', 'IT/INV/2025-189', 'Software and Services'),
    mkExp(1, 180000, D(8, 20), 'Custom module development - phase 1', 'Tata Consultancy Services', 'IT/INV/2025-245', 'Software and Services'),
    mkExp(1, 175000, D(9, 12), 'Antivirus and endpoint security suite', 'Quick Heal Technologies', 'IT/INV/2025-330', 'Software and Services'),
    // FIN Operations (₹12,00,000) -> ~45%
    mkExp(2, 320000, D(4, 22), 'Office automation equipment', 'Xerox India Ltd', 'FIN/INV/2025-052', 'Operations'),
    mkExp(2, 210000, D(7, 14), 'Record digitisation project', 'C-DAC Pune', 'FIN/INV/2025-171', 'Operations'),
    mkExp(2, 200000, D(9, 9), 'Printing and stationery (quarterly bulk)', 'Navneet Publications', 'FIN/INV/2025-298', 'Operations'),
    // FIN Audit (₹8,00,000) -> ~112% (CRITICAL - over budget)
    mkExp(3, 300000, D(5, 6), 'Statutory audit fees - Q1', 'Deloitte Haskins & Sells', 'FIN/INV/2025-081', 'Audit and Compliance'),
    mkExp(3, 260000, D(7, 29), 'Internal control review', 'KPMG Assurance', 'FIN/INV/2025-196', 'Audit and Compliance'),
    mkExp(3, 340000, D(9, 18), 'Special investigative audit - works division', 'Ernst & Young LLP', 'FIN/INV/2025-341', 'Audit and Compliance'),
    // HR Training (₹9,00,000) -> ~61%
    mkExp(4, 250000, D(5, 19), 'Leadership development programme', 'IIM Bangalore (MDP)', 'HR/INV/2025-064', 'Training'),
    mkExp(4, 180000, D(8, 6), 'Technical skills bootcamp for staff', 'NIIT Ltd', 'HR/INV/2025-222', 'Training'),
    mkExp(4, 120000, D(9, 25), 'Compliance and ethics e-learning licences', 'Skillsoft India', 'HR/INV/2025-360', 'Training'),
    // HR Operations (₹6,00,000) -> ~38%
    mkExp(5, 140000, D(6, 11), 'Recruitment portal subscription', 'Naukri.com (Info Edge)', 'HR/INV/2025-133', 'Operations'),
    mkExp(5, 90000, D(8, 27), 'Campus hiring drive expenses', 'Self (reimbursement)', 'HR/INV/2025-251', 'Operations'),
    // PWD Infrastructure (₹42,00,000) -> ~57%, one large transaction (30%)
    mkExp(6, 1250000, D(5, 15), 'Road resurfacing package - Ward 4 to 9', 'Larsen & Toubro Ltd', 'PWD/INV/2025-073', 'Infrastructure'),
    mkExp(6, 600000, D(7, 2), 'Community hall construction - phase 1', 'HCC Infrastructure', 'PWD/INV/2025-158', 'Infrastructure'),
    mkExp(6, 480000, D(8, 19), 'Drainage and culvert works', 'Patil Constructions', 'PWD/INV/2025-240', 'Infrastructure'),
    mkExp(6, 350000, D(9, 21), 'Footpath and street lighting package', 'Siemens Ltd (lighting)', 'PWD/INV/2025-349', 'Infrastructure'),
    // PWD Maintenance (₹18,00,000) -> ~44%
    mkExp(7, 420000, D(6, 25), 'Annual maintenance of government guest house', 'Jones Lang LaSalle', 'PWD/INV/2025-141', 'Maintenance'),
    mkExp(7, 310000, D(8, 30), 'Water pipeline repair works', 'Voltas Water Solutions', 'PWD/INV/2025-263', 'Maintenance'),
    // EDU Equipment (₹20,00,000) -> ~20% (UNDER-UTILIZED)
    mkExp(8, 260000, D(7, 16), 'Smart classroom pilot - 10 classrooms', 'Samsung Electronics (display)', 'EDU/INV/2025-175', 'Equipment'),
    mkExp(8, 140000, D(9, 4), 'Physics laboratory apparatus', 'Edunet Instruments', 'EDU/INV/2025-289', 'Equipment'),
    // EDU Scholarships (₹10,00,000) -> ~55%
    mkExp(9, 300000, D(6, 20), 'Merit scholarship disbursement - cycle 1', 'Direct Beneficiary Transfer', 'EDU/DBT/2025-110', 'Scholarships'),
    mkExp(9, 250000, D(9, 15), 'Means-based scholarship disbursement - cycle 2', 'Direct Beneficiary Transfer', 'EDU/DBT/2025-336', 'Scholarships'),
    // HLT Equipment (₹30,00,000) -> ~52%, includes suspicious cluster of 3 high-value txs in 5 days
    mkExp(10, 800000, D(5, 8), 'MRI machine installation and commissioning', 'Siemens Healthineers', 'HLT/INV/2025-067', 'Equipment'),
    mkExp(10, 360000, D(9, 2), 'Patient monitoring systems (ward batch)', 'Philips Healthcare', 'HLT/INV/2025-294', 'Equipment'),
    mkExp(10, 340000, D(9, 4), 'Ultrasound scanners - district hospital', 'GE Healthcare India', 'HLT/INV/2025-301', 'Equipment'),
    mkExp(10, 380000, D(9, 6), 'Laboratory analyser suite', 'Roche Diagnostics', 'HLT/INV/2025-307', 'Equipment'),
    // HLT Public Health (₹22,00,000) -> ~36%
    mkExp(11, 500000, D(6, 30), 'Immunisation drive - phase 2 logistics', 'HLL Lifecare', 'HLT/INV/2025-149', 'Public Health'),
    mkExp(11, 300000, D(8, 22), 'Health camp equipment and supplies', 'BPL Medical Technologies', 'HLT/INV/2025-255', 'Public Health'),
  ]);

  // ---------- Run anomaly engine to generate alerts ----------
  console.log('Running anomaly detection engine...');
  const alertCount = await evaluateAllBudgets();
  console.log(`Generated ${alertCount} alerts from monitoring rules.`);

  // ---------- Initial audit logs ----------
  await AuditLog.insertMany([
    { userId: admin._id, userName: admin.name, action: 'SYSTEM_SEED', entity: 'System', entityId: null, details: 'Database seeded with demo data for financial year 2025-26.', ipAddress: '127.0.0.1' },
    { userId: finance._id, userName: finance.name, action: 'LOGIN', entity: 'User', entityId: finance._id, details: 'Smt. Latha Raman logged in successfully.', ipAddress: '127.0.0.1' },
    ...budgets.map((b: any) => ({
      userId: admin._id, userName: admin.name, action: 'CREATE_BUDGET', entity: 'Budget', entityId: b._id,
      details: `Budget created: ${b.category} (${b.financialYear}) - ₹${b.allocatedAmount.toLocaleString('en-IN')}.`, ipAddress: '127.0.0.1',
    })),
    ...expenditures.slice(0, 10).map((e: any) => ({
      userId: finance._id, userName: finance.name, action: 'CREATE_EXPENDITURE', entity: 'Expenditure', entityId: e._id,
      details: `Expenditure of ₹${e.amount.toLocaleString('en-IN')} recorded.`, ipAddress: '127.0.0.1',
    })),
  ]);

  console.log('Seed completed successfully.');
  console.log('--------------------------------------------------');
  console.log('Demo accounts (password for all: Admin@123):');
  console.log('  ADMIN            : admin@budget.gov');
  console.log('  FINANCE OFFICER  : finance@budget.gov');
  console.log('  DEPARTMENT HEAD  : head@budget.gov (IT Department)');
  console.log('--------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
