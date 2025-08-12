# Test Automatic Cache Purging

## What's Now Automatic

✅ **Page Load**: Cache is purged every time the page loads  
✅ **Page Refresh**: Cache is purged when user refreshes (F5/Ctrl+R)  
✅ **Tab Return**: Cache is purged when user returns to the tab  
✅ **Manual Refresh**: Cache is purged when clicking the "Refresh" button  

## How to Test

### 1. Initial Setup
1. Make sure you have `BUNNY_API_KEY` in your `.env.local`
2. Update `BUNNY_STORAGE_ZONE` in `utils/bunny-purge.ts` if needed

### 2. Test Scenarios

#### **Test 1: Page Load**
1. Upload a new JSON file to Bunny.net
2. Open your dashboard in a new tab
3. Check browser console for: `🔄 Auto-purging Bunny.net cache on page load...`
4. Data should show the updated information

#### **Test 2: Page Refresh**
1. Upload a new JSON file to Bunny.net
2. Press F5 or Ctrl+R to refresh the page
3. Check console for auto-purge message
4. Data should update immediately

#### **Test 3: Tab Return**
1. Upload a new JSON file to Bunny.net
2. Switch to another tab
3. Switch back to your dashboard tab
4. Check console for auto-purge message
5. Data should refresh automatically

#### **Test 4: Manual Refresh Button**
1. Upload a new JSON file to Bunny.net
2. Click the "Refresh" button in the dashboard
3. Check console for auto-purge message
4. Data should update

## Console Messages to Look For

```
🔄 Auto-purging Bunny.net cache on page load...
✅ Auto-purge successful
Loading page 1 from Bunny.net API
Loaded X coins via server-side
```

## Troubleshooting

- **No purge messages**: Check your `BUNNY_API_KEY` is set correctly
- **Purge fails**: Verify your API key has purge permissions
- **Data doesn't update**: Check if the JSON file was uploaded correctly to Bunny.net

## Performance Notes

- Auto-purge adds ~100-200ms to initial page load
- Purge happens in background, doesn't block UI
- If purge fails, the app continues normally (graceful degradation) 