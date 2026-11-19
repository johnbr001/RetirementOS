CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  birthDate TEXT NOT NULL,
  retirementAge INTEGER NOT NULL,
  lifeExpectancy INTEGER NOT NULL,
  source TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  ticker TEXT,
  kind TEXT NOT NULL,
  quantity REAL NOT NULL,
  marketValue REAL NOT NULL,
  currency TEXT NOT NULL,
  annualDividend REAL NOT NULL,
  dividendFrequency TEXT NOT NULL,
  dividendGrowth REAL NOT NULL,
  taxRate REAL NOT NULL,
  source TEXT NOT NULL,
  valuationDate TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider TEXT,
  balance REAL NOT NULL,
  monthlyContribution REAL NOT NULL,
  monthlyAmount REAL NOT NULL,
  startAge INTEGER NOT NULL,
  endAge INTEGER,
  basis TEXT NOT NULL,
  source TEXT NOT NULL,
  sourceUrl TEXT,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  monthlyAmount REAL NOT NULL,
  startAge INTEGER NOT NULL,
  endAge INTEGER NOT NULL,
  inflationLinked INTEGER NOT NULL,
  source TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
