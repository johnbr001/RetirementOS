import Database from '@tauri-apps/plugin-sql'
import { emptyData, type AppData, type Person, type Holding, type Pension, type Expense } from './model'

const KEY = 'retirement-os-data-v1'
let db: Database | null = null
let desktopStoreLoaded = false
export const isDesktop = '__TAURI_INTERNALS__' in window

// Keep the SQLite URL and Tauri bundle identifier stable across releases.
// The SQL plugin resolves this relative path inside Tauri's per-user app config directory.
const DATABASE_URL = 'sqlite:retirement-os.db'

async function database() {
  if (!db) db = await Database.load(DATABASE_URL)
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
  desktopStoreLoaded = true
  return { people, holdings, pensions, expenses }
}

export async function saveData(data: AppData) {
  if (!isDesktop) { localStorage.setItem(KEY, JSON.stringify(data)); return }
  if (!desktopStoreLoaded) throw new Error('Database has not been loaded successfully; refusing to write.')
  const d = await database()
  // Each plugin call executes through a SQLx pool; do not span a SQL transaction
  // across calls because the pool may use a different SQLite connection each time.
  await syncRows(d, 'people', data.people, 'INSERT INTO people (id,name,birthDate,retirementAge,lifeExpectancy,source,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,birthDate=excluded.birthDate,retirementAge=excluded.retirementAge,lifeExpectancy=excluded.lifeExpectancy,source=excluded.source,updatedAt=excluded.updatedAt', p => [p.id,p.name,p.birthDate,p.retirementAge,p.lifeExpectancy,p.source,p.updatedAt])
  await syncRows(d, 'holdings', data.holdings, 'INSERT INTO holdings (id,owner,name,ticker,kind,quantity,marketValue,currency,annualDividend,dividendFrequency,dividendGrowth,taxRate,source,valuationDate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,name=excluded.name,ticker=excluded.ticker,kind=excluded.kind,quantity=excluded.quantity,marketValue=excluded.marketValue,currency=excluded.currency,annualDividend=excluded.annualDividend,dividendFrequency=excluded.dividendFrequency,dividendGrowth=excluded.dividendGrowth,taxRate=excluded.taxRate,source=excluded.source,valuationDate=excluded.valuationDate', h => [h.id,h.owner,h.name,h.ticker,h.kind,h.quantity,h.marketValue,h.currency,h.annualDividend,h.dividendFrequency,h.dividendGrowth,h.taxRate,h.source,h.valuationDate])
  await syncRows(d, 'pensions', data.pensions, 'INSERT INTO pensions (id,owner,kind,provider,balance,monthlyContribution,monthlyAmount,startAge,endAge,basis,source,sourceUrl,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,kind=excluded.kind,provider=excluded.provider,balance=excluded.balance,monthlyContribution=excluded.monthlyContribution,monthlyAmount=excluded.monthlyAmount,startAge=excluded.startAge,endAge=excluded.endAge,basis=excluded.basis,source=excluded.source,sourceUrl=excluded.sourceUrl,updatedAt=excluded.updatedAt', p => [p.id,p.owner,p.kind,p.provider,p.balance,p.monthlyContribution,p.monthlyAmount,p.startAge,p.endAge,p.basis,p.source,p.sourceUrl,p.updatedAt])
  await syncRows(d, 'expenses', data.expenses, 'INSERT INTO expenses (id,label,monthlyAmount,startAge,endAge,inflationLinked,source,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET label=excluded.label,monthlyAmount=excluded.monthlyAmount,startAge=excluded.startAge,endAge=excluded.endAge,inflationLinked=excluded.inflationLinked,source=excluded.source,updatedAt=excluded.updatedAt', e => [e.id,e.label,e.monthlyAmount,e.startAge,e.endAge,e.inflationLinked?1:0,e.source,e.updatedAt])
}

async function syncRows<T extends { id: number }>(
  database: Database,
  table: 'people' | 'holdings' | 'pensions' | 'expenses',
  rows: T[],
  upsert: string,
  values: (row: T) => unknown[],
) {
  const stored = await database.select<{ id: number }[]>(`SELECT id FROM ${table}`)
  const ids = new Set(rows.map(row => row.id))
  for (const row of stored) if (!ids.has(row.id)) await database.execute(`DELETE FROM ${table} WHERE id = $1`, [row.id])
  for (const row of rows) await database.execute(upsert, values(row))
}

export function downloadBackup(data: AppData) {
  const blob = new Blob([JSON.stringify({ format: 'retirement-os-backup-v1', exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `retirement-os-backup-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url)
}
