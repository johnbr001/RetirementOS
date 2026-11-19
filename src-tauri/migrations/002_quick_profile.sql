CREATE TABLE IF NOT EXISTS quick_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  monthlyIncome REAL NOT NULL,
  workYears REAL NOT NULL,
  propertyValue REAL NOT NULL,
  propertyRegion TEXT NOT NULL,
  propertyType TEXT NOT NULL,
  monthlyRent REAL NOT NULL,
  stocksJson TEXT NOT NULL
);
