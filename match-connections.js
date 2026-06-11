#!/usr/bin/env node
const fs = require('fs');
const csv = require('csv-parse/sync');

// Load connections
let data = fs.readFileSync('./Connections.csv', 'utf-8');
// Skip LinkedIn's weird header notes (first 4 lines)
data = data.split('\n').slice(3).join('\n');
const records = csv.parse(data, {
  columns: true,
  skip_empty_lines: true
});

// Build company -> connections map
const connections = {};
records.forEach(r => {
  const company = r.Company?.trim().toLowerCase();
  const name = `${r['First Name']} ${r['Last Name']}`.trim();
  const position = r.Position?.trim();
  
  if (company && name) {
    if (!connections[company]) connections[company] = [];
    connections[company].push({ name, position, url: r.URL });
  }
});

// Export functions
function getConnectionsAtCompany(companyName) {
  const key = companyName.trim().toLowerCase();
  return connections[key] || [];
}

function allCompanies() {
  return Object.keys(connections).sort();
}

// CLI usage
if (require.main === module) {
  const query = process.argv[2];
  
  if (!query) {
    console.log(`Usage: node match-connections.js "<company name>"`);
    console.log(`\nYou have connections at ${Object.keys(connections).length} companies.\n`);
    console.log('Sample companies:');
    allCompanies().slice(0, 10).forEach(c => {
      const conns = connections[c];
      console.log(`  ${c} — ${conns.length} connection(s)`);
    });
  } else {
    const matches = getConnectionsAtCompany(query);
    if (matches.length > 0) {
      console.log(`Found ${matches.length} connection(s) at "${query}":\n`);
      matches.forEach(m => {
        console.log(`  • ${m.name}`);
        console.log(`    Position: ${m.position}`);
        console.log(`    ${m.url}`);
        console.log();
      });
    } else {
      console.log(`No connections found at "${query}"`);
      console.log('\nDid you mean one of these?');
      const partial = allCompanies().filter(c => c.includes(query.toLowerCase()));
      if (partial.length > 0) {
        partial.slice(0, 5).forEach(c => console.log(`  • ${c}`));
      } else {
        console.log('  (no matches)');
      }
    }
  }
}

module.exports = { getConnectionsAtCompany, allCompanies };
