import Database from '@tauri-apps/plugin-sql'
import { emptyData, type AppData, type Person, type Holding, type Pension, type Expense } from './model'

const KEY = 'retirement-os-data-v1'
let db: Database | null = null
export const isDesktop = '__TAURI_INTERNALS__' in window

const schemas = [
  'CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, birthDate TEXT NOT NULL, retirementAge INTEGER NOT NULL, lifeExpectancy INTEGER NOT NULL, source TEXT NOT NULL, updatedAt TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS holdings (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, name TEXT NOT NULL, ticker TEXT, kind TEXT NOT NULL, quantity REAL NOT NULL, marketValue REAL NOT NULL, currency TEXT NOT NULL, annualDividend REAL NOT NULL, dividendFrequency TEXT NOT NULL, dividendGrowth REAL NOT NULL, taxRate REAL NOT NULL, source TEXT NOT NULL, valuationDate TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS pensions (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, kind TEXT NOT NULL, provider TEXT, balance REAL NOT NULL, monthlyContribution REAL NOT NULL, monthlyAmount REAL NOT NULL, startAge INTEGER NOT NULL, endAge INTEGER, basis TEXT NOT NULL, source TEXT NOT NULL, sourceUrl TEXT, updatedAt TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, monthlyAmount REAL NOT NULL, startAge INTEGER NOT NULL, endAge INTEGER NOT NULL, inflationLinked INTEGER NOT NULL, source TEXT NOT NULL, updatedAt TEXT NOT NULL)'
]

async function database() {
  if (!db) {
    db = await Database.load('sqlite:retirement-os.db')
    for (const schema of schemas) await db.execute(schema)
  }
  return db
}

export async function loadData(): Promise<AppData> {
  if (!isDesktop) {
    try { return { ...emptyData, ...JSON.parse(localStorage.getItem(KEY) || '{}') } }
    catch { return emptyData }
  }
  const d = await database()
  const [people, holdings, pensions, expenses] = await Promise.all([
    d.select<Person[]>('SELECT * FROM people ORDER BY id'), d.select<Holding[]>('SELECT * FROM holdings ORDER BY id'),
    d.select<Pension[]>('SELECT * FROM pensions ORDER BY id'), d.select<Expense[]>('SELECT * FROM expenses ORDER BY id')
  ])
  return { people, holdings, pensions, expenses }
}

export async function saveData(data: AppData) {
  if (!isDesktop) { localStorage.setItem(KEY, JSON.stringify(data)); return }
  const d = await database()
  await d.execute('BEGIN IMMEDIATE')
  try {
    await d.execute('DELETE FROM people'); await d.execute('DELETE FROM holdings'); await d.execute('DELETE FROM pensions'); await d.execute('DELETE FROM expenses')
    for (const p of data.people) await d.execute('INSERT INTO people (id,name,birthDate,retirementAge,lifeExpectancy,source,updatedAt) VALUES (?,?,?,?,?,?,?)', [p.id,p.name,p.birthDate,p.retirementAge,p.lifeExpectancy,p.source,p.updatedAt])
    for (const h of data.holdings) await d.execute('INSERT INTO holdings (id,owner,name,ticker,kind,quantity,marketValue,currency,annualDividend,dividendFrequency,dividendGrowth,taxRate,source,valuationDate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [h.id,h.owner,h.name,h.ticker,h.kind,h.quantity,h.marketValue,h.currency,h.annualDividend,h.dividendFrequency,h.dividendGrowth,h.taxRate,h.source,h.valuationDate])
    for (const p of data.pensions) await d.execute('INSERT INTO pensions (id,owner,kind,provider,balance,monthlyContribution,monthlyAmount,startAge,endAge,basis,source,sourceUrl,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [p.id,p.owner,p.kind,p.provider,p.balance,p.monthlyContribution,p.monthlyAmount,p.startAge,p.endAge,p.basis,p.source,p.sourceUrl,p.updatedAt])
    for (const e of data.expenses) await d.execute('INSERT INTO expenses (id,label,monthlyAmount,startAge,endAge,inflationLinked,source,updatedAt) VALUES (?,?,?,?,?,?,?,?)', [e.id,e.label,e.monthlyAmount,e.startAge,e.endAge,e.inflationLinked?1:0,e.source,e.updatedAt])
    await d.execute('COMMIT')
  } catch (error) {
    await d.execute('ROLLBACK')
    throw error
  }
}

export function downloadBackup(data: AppData) {
  const blob = new Blob([JSON.stringify({ format: 'retirement-os-backup-v1', exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `retirement-os-backup-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url)
}
