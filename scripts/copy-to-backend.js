import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../dist/index.html');
const destination = path.resolve(__dirname, '../backend/Index.html');

if (fs.existsSync(source)) {
  const content = fs.readFileSync(source, 'utf8');
  fs.writeFileSync(destination, content, 'utf8');
  console.log('✅ Successfully copied single-file bundle to backend/Index.html');
} else {
  console.error('❌ dist/index.html not found! Run npm run build first.');
}
