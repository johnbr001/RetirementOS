export type Person = { id: number; name: string; birthDate: string; retirementAge: number; lifeExpectancy: number; source: string; updatedAt: string }
export type Holding = { id: number; owner: string; name: string; ticker: string; kind: string; quantity: number; marketValue: number; currency: string; annualDividend: number; dividendFrequency: string; dividendGrowth: number; taxRate: number; source: string; valuationDate: string }
export type Pension = { id: number; owner: string; kind: string; provider: string; balance: number; monthlyContribution: number; monthlyAmount: number; startAge: number; endAge: number | null; basis: string; source: string; sourceUrl: string; updatedAt: string }
export type Expense = { id: number; label: string; monthlyAmount: number; startAge: number; endAge: number; inflationLinked: boolean; source: string; updatedAt: string }
export type QuickStock = { ticker: string; shares: number }
export type QuickProfile = { monthlyIncome: number; workYears: number; propertyValue: number; propertyRegion: string; propertyType: string; monthlyRent: number; stocks: QuickStock[] }
export type AppData = { people: Person[]; holdings: Holding[]; pensions: Pension[]; expenses: Expense[]; quickProfile: QuickProfile | null }
export const emptyData: AppData = { people: [], holdings: [], pensions: [], expenses: [], quickProfile: null }
