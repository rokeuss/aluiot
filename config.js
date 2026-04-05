// ═══════════════════════════════════════════════════════════
//  CONFIGURATION  —  Edit the file paths below
//  CSVs live in the /data folder of this same repository.
//  To update 2026: just overwrite data/2026.csv and push.
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // Password (hashed at runtime — change '1507' here to update)
  PIN: '1507',

  // Account display name
  accountName: 'NIMROD JAUL',
  accountIBAN: 'CY · EUR · 357033371360',

  // CSV files — key = year label, value = relative path (or full URL)
  // Add more years as you accumulate history
  files: {
    '2022': 'data/2022.csv',
    '2023': 'data/2023.csv',
    '2024': 'data/2024.csv',
    '2025': 'data/2025.csv',
    '2026': 'data/2026.csv',   // ← updated monthly
  },

  // Default year shown on load
  defaultYear: '2026',
};
