const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Force-syncing environment variables to Vercel (production)...');

try {
	if (!fs.existsSync('.env.local')) {
		console.error('❌ .env.local not found');
		process.exit(1);
	}

	// Ensure logged in / linked
	try {
		execSync('vercel whoami', { stdio: 'pipe' });
	} catch (e) {
		console.error('❌ Not logged in to Vercel. Run "vercel login" then "vercel link".');
		process.exit(1);
	}

	const envContent = fs.readFileSync('.env.local', 'utf8');
	const lines = envContent
		.split('\n')
		.map(l => l.trim())
		.filter(l => l && !l.startsWith('#') && l.includes('='));

	const envVars = lines.map(line => {
		const [key, ...valueParts] = line.split('=');
		return { key: key.trim(), value: valueParts.join('=').trim() };
	});

	for (const { key, value } of envVars) {
		try {
			console.log(`🗑  Removing existing ${key} (if any) ...`);
			// Remove without prompt; fallback to piping "y" if needed
			try {
				execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' });
			} catch {
				// Some CLI versions don't support --yes; try piping confirmation
				try { execSync(`echo y | vercel env rm ${key} production`, { stdio: 'ignore' }); } catch {}
			}
		} catch {}

		console.log(`➕ Adding ${key} to production ...`);
		// Provide value via stdin
		execSync(`vercel env add ${key} production`, { input: value + '\n', stdio: ['pipe', 'ignore', 'ignore'] });
	}

	console.log('✅ Force-sync complete.');
	console.log('ℹ️  Redeploy to apply changes: vercel --prod');
} catch (err) {
	console.error('❌ Error force-syncing envs:', err?.message || err);
	process.exit(1);
}
