# Bunny.net Cache Purge Setup

## Step 1: Get Your Bunny.net API Key

1. Log into your Bunny.net dashboard
2. Go to **Account** → **API Keys**
3. Create a new API key or copy your existing one
4. Make sure it has **Purge** permissions

## Step 2: Add API Key to Environment

Add this to your `.env.local` file:

```env
BUNNY_API_KEY=your_api_key_here
```

## Step 3: Update Storage Zone Name

In `utils/bunny-purge.ts`, update the `BUNNY_STORAGE_ZONE` constant:

```typescript
const BUNNY_STORAGE_ZONE = "cocricoin" // Change this to your actual storage zone name
```

## Step 4: Test the Purge

1. Upload a new JSON file to Bunny.net
2. Click the **"Purge Cache"** button in your dashboard
3. Check the browser console for success/error messages
4. The data should update immediately

## Manual Purge via API

You can also manually purge via:

- **GET**: `/api/bunny-purge` - Purges coins data
- **POST**: `/api/bunny-purge` with `{"file": "specific_file.json"}` - Purges specific file

## Troubleshooting

- **"BUNNY_API_KEY not found"**: Check your `.env.local` file
- **"Failed to purge cache"**: Verify your API key has purge permissions
- **Still seeing old data**: Try hard refresh (Ctrl+F5) after purging

## Automation

You can integrate this into your Python scraping script:

```python
import requests

def purge_bunny_cache():
    response = requests.get('https://your-app.vercel.app/api/bunny-purge')
    if response.status_code == 200:
        print("Cache purged successfully")
    else:
        print("Failed to purge cache")
``` 