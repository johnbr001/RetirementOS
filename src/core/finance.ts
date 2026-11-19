export type ForecastInput = {
  startAge: number; endAge: number; monthlyExpense: number | ((age: number, years: number) => number); inflation: number; annualReturn: number;
  annualIncome: number | ((age: number) => number); incomeStartAge: number; incomeEndAge?: number; startingAssets: number;
}
export type ForecastYear = { age: number; nominalExpense: number; realExpense: number; income: number; gap: number; beginningAssets: number; endingAssets: number }

export function futureValue(principal: number, annualRate: number, years: number): number {
  return principal * Math.pow(1 + annualRate, years)
}

export function monthlyContributionFutureValue(principal: number, contribution: number, annualRate: number, months: number): number {
  const rate = Math.pow(1 + annualRate, 1 / 12) - 1
  const existing = principal * Math.pow(1 + rate, months)
  const additions = rate === 0 ? contribution * months : contribution * ((Math.pow(1 + rate, months) - 1) / rate)
  return existing + additions
}

export function forecast(input: ForecastInput): ForecastYear[] {
  const rows: ForecastYear[] = []
  let assets = Math.max(0, input.startingAssets)
  for (let age = input.startAge; age <= input.endAge; age++) {
    const years = age - input.startAge
    const monthlyExpense = typeof input.monthlyExpense === 'function' ? input.monthlyExpense(age, years) : input.monthlyExpense * Math.pow(1 + input.inflation, years)
    const expense = monthlyExpense * 12
    const incomeActive = age >= input.incomeStartAge && (input.incomeEndAge === undefined || age <= input.incomeEndAge)
    const income = incomeActive ? (typeof input.annualIncome === 'function' ? input.annualIncome(age) : input.annualIncome) : 0
    const gap = Math.max(0, expense - income)
    const beginningAssets = assets
    const endingAssets = Math.max(0, beginningAssets * (1 + input.annualReturn) - gap)
    rows.push({ age, nominalExpense: expense, realExpense: expense / Math.pow(1 + input.inflation, years), income, gap, beginningAssets, endingAssets })
    assets = endingAssets
  }
  return rows
}

export function dividendProjection(shares: number, annualPerShare: number, years: number, growth: number, taxRate: number): number {
  return shares * annualPerShare * Math.pow(1 + growth, years) * (1 - taxRate)
}
