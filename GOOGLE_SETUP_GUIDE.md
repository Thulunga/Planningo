# Google Search Console & Analytics Setup Guide

## Step 1: Google Search Console

### 1.1 Add Property
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add Property**
3. Choose **Domain** and enter: `mydailyworkspace.site`
4. Verify ownership using one of these methods:
   - **DNS Record** (recommended):
     - Go to your domain registrar
     - Add DNS TXT record: `google-site-verification=XXXXXXXXXXXX`
     - Wait for verification (5-30 mins)
   - **HTML tag**: Add to `<head>` of root layout
   - **Google Analytics**: If already connected
   - **Google Tag Manager**: If already connected

### 1.2 Submit Sitemap
1. In GSC, go to **Sitemaps** (left menu)
2. Enter: `https://www.mydailyworkspace.site/sitemap.xml`
3. Click **Submit**

### 1.3 Monitor Performance
- Check **Performance** tab for impressions, clicks, CTR
- Monitor **Coverage** for indexing status
- Review **Enhancements** for rich results

---

## Step 2: Google Analytics 4 (GA4)

### 2.1 Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Admin** → **Create Property**
3. Property name: `Planningo`
4. Report timezone: Your timezone
5. Currency: USD
6. Industry: Software/Technology
7. Business size: Your estimate

### 2.2 Add Data Stream
1. Select **Web**
2. Website URL: `https://www.mydailyworkspace.site`
3. Stream name: `Web Stream`
4. Copy the **Measurement ID** (starts with `G-`)

### 2.3 Install Analytics in Next.js
See: [Installation Guide](#installation-guide-below)

---

## Installation Guide (Below)

See `GOOGLE_ANALYTICS.md` in this directory for Next.js integration code.

---

## Step 3: Link GSC to GA4
1. In GA4: **Admin** → **Property Settings** → **Search Console Linking**
2. Click **Link Google Search Console**
3. Select your property: `mydailyworkspace.site`
4. Authorize and confirm

---

## Step 4: Monitor & Optimize

### GSC Checks
- [ ] Sitemap submitted
- [ ] No indexing errors
- [ ] Mobile usability OK
- [ ] Core Web Vitals passing

### GA4 Checks
- [ ] Real-time data showing visitors
- [ ] Events tracking page views
- [ ] User properties capturing data

### SEO Metrics to Monitor
- Organic impressions (GSC)
- Click-through rate (GSC)
- Average position (GSC)
- Bounce rate (GA4)
- Pages per session (GA4)
- Conversion rate (GA4)

---

## Verification Checklist

**Before launching to production:**

- [ ] GSC property added
- [ ] DNS/ownership verified
- [ ] Sitemap submitted
- [ ] GA4 property created
- [ ] Analytics code installed
- [ ] GSC linked to GA4
- [ ] robots.txt accessible at `/robots.txt`
- [ ] sitemap.xml accessible at `/sitemap.xml`
- [ ] OG image generating at `/api/og`
- [ ] Lighthouse SEO audit >90

---

## Useful Commands

```bash
# Verify robots.txt
curl https://www.mydailyworkspace.site/robots.txt

# Verify sitemap
curl https://www.mydailyworkspace.site/sitemap.xml

# Test OG image generation
curl https://www.mydailyworkspace.site/api/og
```

---

## Troubleshooting

**GSC not verifying:**
- Wait 5-30 minutes for DNS propagation
- Check DNS record spelling
- Try HTML tag method as fallback

**Analytics not tracking:**
- Check Measurement ID is correct
- Verify gtag script is in `<head>`
- Check Google Analytics dashboard for real-time data
- Use GA4 DebugView to validate events

**Sitemap not submitted:**
- Verify sitemap.xml is publicly accessible
- Check for XML syntax errors
- Ensure robots.txt allows `/sitemap.xml`

**OG images not showing:**
- Test with Open Graph debugger: https://developers.facebook.com/tools/debug/
- Verify API route is deployed
- Check for CORS issues

---

## Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [GA4 Implementation Guide](https://support.google.com/analytics/answer/10089681)
- [Open Graph Debugger](https://developers.facebook.com/tools/debug/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
