# Deployment Guide

## Netlify Deployment (Recommended)

### Quick Deploy Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com) and sign in with GitHub
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository: `fnti888/Security-Operations-Platform`

3. **Configure Build Settings** (Auto-detected from netlify.toml)
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

4. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add your Supabase environment variables:
     - `VITE_SUPABASE_URL` = Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

5. **Deploy!**
   - Click "Deploy site"
   - Your site will be live at: `https://your-site-name.netlify.app`

### Automatic Deployments

Once connected, Netlify will automatically deploy:
- Every push to `main` branch
- Every pull request (for preview)

### Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

---

## Alternative: Vercel Deployment

### Quick Deploy Steps

1. **Push to GitHub** (same as above)

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "Add New" → "Project"
   - Import your repository: `fnti888/Security-Operations-Platform`

3. **Configure Build Settings**
   - Framework Preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

4. **Add Environment Variables**
   - Add the same Supabase variables as above

5. **Deploy!**
   - Click "Deploy"
   - Your site will be live at: `https://your-project.vercel.app`

---

## Environment Variables Required

Both platforms need these variables from your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: Never commit your `.env` file to GitHub!

---

## Post-Deployment

1. **Test your deployed site**
   - Visit the URL provided by Netlify/Vercel
   - Test login/signup functionality
   - Check all features work correctly

2. **Update README.md**
   - Replace the placeholder demo link with your live URL

3. **Monitor your deployment**
   - Check application logs for any errors
   - Monitor performance metrics
   - Set up uptime monitoring if needed

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node version is 18+
- Review build logs for specific errors

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Redeploy after adding/changing variables
- Check for typos in variable names

### SPA Routing Not Working
- The `netlify.toml` and `_redirects` files handle this
- Ensure they're committed to your repository

### Database Connection Issues
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Review RLS policies if queries fail
