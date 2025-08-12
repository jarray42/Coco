const fs = require('fs');
const path = require('path');

// Function to add dynamic export to API route files
function addDynamicExport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if dynamic export already exists
    if (content.includes('export const dynamic')) {
      console.log(`✅ ${filePath} - Already has dynamic export`);
      return;
    }
    
    // Add dynamic export after imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the last import line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      }
    }
    
    // Insert dynamic export
    lines.splice(insertIndex, 0, '', '// Force dynamic rendering - prevent static analysis during build', 'export const dynamic = \'force-dynamic\'', '');
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ ${filePath} - Added dynamic export`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively find and process API route files
function processApiRoutes(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processApiRoutes(fullPath);
    } else if (item === 'route.ts' || item === 'route.tsx') {
      addDynamicExport(fullPath);
    }
  }
}

// Start processing from the app/api directory
const apiDir = path.join(__dirname, '..', 'app', 'api');
if (fs.existsSync(apiDir)) {
  console.log('🔧 Adding dynamic exports to API routes...');
  processApiRoutes(apiDir);
  console.log('✅ Finished processing API routes');
} else {
  console.log('❌ API directory not found');
}
