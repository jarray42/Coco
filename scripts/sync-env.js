const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Syncing environment variables to Vercel...');

try {
  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    console.log('❌ .env.local file not found');
    process.exit(1);
  }

  // Check if project is linked
  try {
    execSync('vercel whoami', { stdio: 'pipe' });
  } catch (error) {
    console.log('❌ Project not linked to Vercel. Run "vercel link" first.');
    process.exit(1);
  }

  // Read .env.local file
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      return { key: key.trim(), value: value.trim() };
    })
    .filter(({ key, value }) => key && value);

  console.log(`📤 Adding ${envVars.length} environment variables to Vercel...`);

  // Add each environment variable
  for (const { key, value } of envVars) {
    try {
      console.log(`  Adding: ${key}`);
      execSync(`vercel env add ${key} production`, { 
        stdio: 'pipe',
        input: value + '\n'
      });
    } catch (error) {
      console.log(`  ⚠️  ${key} might already exist or failed to add`);
    }
  }
  
  console.log('✅ Environment variables synced successfully!');
  console.log('🚀 You can now deploy without manually copying variables.');

} catch (error) {
  console.error('❌ Error syncing environment variables:', error.message);
  process.exit(1);
}
