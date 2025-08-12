// Version management for Bunny.net cache busting

// Option 1: Environment variable (recommended for production)
export const getBunnyVersion = () => {
  // Check if we have a version in environment variables
  if (process.env.BUNNY_DATA_VERSION) {
    return process.env.BUNNY_DATA_VERSION
  }
  
  // Fallback to timestamp
  return Date.now().toString()
}

// Option 2: Manual version control
export const MANUAL_VERSION = "1.0.0" // Update this when you upload new data

// Option 3: Date-based version
export const getDateVersion = () => {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
}

// Option 4: Timestamp version (always fresh)
export const getTimestampVersion = () => {
  return Date.now().toString()
}

// Main function to get cache buster
export const getCacheBuster = () => {
  // Choose your preferred method:
  
  // Method 1: Environment variable (set BUNNY_DATA_VERSION=1.0.1 in your .env)
  return `?v=${getBunnyVersion()}`
  
  // Method 2: Manual version (uncomment and update MANUAL_VERSION when needed)
  // return `?v=${MANUAL_VERSION}`
  
  // Method 3: Date-based (changes daily)
  // return `?v=${getDateVersion()}`
  
  // Method 4: Timestamp (always fresh, but no caching benefits)
  // return `?v=${getTimestampVersion()}`
} 