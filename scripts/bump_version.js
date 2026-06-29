const fs = require('fs');
const path = require('path');

const versionJsonPath = path.join(__dirname, '..', 'version.json');
const appJsPath = path.join(__dirname, '..', 'app.js');
const indexHtmlPath = path.join(__dirname, '..', 'index.html');

// Get current date in Asia/Seoul timezone
const now = new Date();
const seoulTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).formatToParts(now);

const yy = seoulTime.find(p => p.type === 'year').value.slice(-2);
const mm = seoulTime.find(p => p.type === 'month').value;
const dd = seoulTime.find(p => p.type === 'day').value;
const todayDateStr = `${yy}${mm}${dd}`; // YYMMDD

let nextVersion = `a${todayDateStr}01`;

// Read current version.json
if (fs.existsSync(versionJsonPath)) {
  try {
    const raw = fs.readFileSync(versionJsonPath, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.build === 'string') {
      const match = data.build.match(/^a(\d{6})(\d{2})$/);
      if (match) {
        const fileDate = match[1];
        const fileSeq = parseInt(match[2], 10);
        if (fileDate === todayDateStr) {
          const nextSeq = String(fileSeq + 1).padStart(2, '0');
          nextVersion = `a${todayDateStr}${nextSeq}`;
        }
      }
    }
  } catch (err) {
    console.error('Error parsing version.json:', err);
  }
}

console.log('New build version:', nextVersion);

// 1. Write version.json
fs.writeFileSync(versionJsonPath, JSON.stringify({ build: nextVersion }), 'utf8');
console.log('Updated version.json');

// 2. Update app.js (BUILD_VERSION constant)
if (fs.existsSync(appJsPath)) {
  let content = fs.readFileSync(appJsPath, 'utf8');
  content = content.replace(/const BUILD_VERSION = "[^"]+";/, `const BUILD_VERSION = "${nextVersion}";`);
  fs.writeFileSync(appJsPath, content, 'utf8');
  console.log('Updated app.js');
}

// 3. Update index.html (script query parameter)
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  content = content.replace(/app\.js\?v=[^"]+/, `app.js?v=${nextVersion}`);
  fs.writeFileSync(indexHtmlPath, content, 'utf8');
  console.log('Updated index.html');
}
