const fs = require('fs');
const path = require('path');

// Target file path for the environment config
const targetPath = path.join(__dirname, 'src', 'app', 'environment.ts');

// Read variables from Cloudflare Pages environment variables (or fall back to empty strings)
const spreadsheetId = process.env.SPREADSHEET_ID || '';
const apiKey = process.env.API_KEY || '';

const envConfigFile = `// This file is auto-generated during the Cloudflare Pages build process
export const environment = {
  spreadsheetId: '${spreadsheetId}',
  apiKey: '${apiKey}'
};
`;

// Write the file
fs.writeFileSync(targetPath, envConfigFile);
console.log('✅ environment.ts generated successfully for Cloudflare Pages build!');
