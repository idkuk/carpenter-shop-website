# Deployment Guide: Vercel (Frontend) + Render (Backend)

## 🚀 Step-by-Step Deployment

### 1. Deploy Backend to Render

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to [render.com](https://render.com)**
   - Sign up/login with GitHub
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `carpenter-shop` repo

3. **Configure Render Service**
   - **Name**: `carpenter-shop-api` (or your preferred name)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

4. **Set Environment Variables in Render**
   Go to your service → Settings → Environment Variables and add:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_random_secret_key
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=secure_admin_password
   ADMIN_NAME=Admin User
   ADMIN_PHONE=+1234567890
   CORS_ORIGIN=https://your-vercel-app-name.vercel.app
   ```

5. **Deploy and Get URL**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Copy your Render URL: `https://your-app-name.onrender.com`

### 2. Deploy Frontend to Vercel

1. **Update Frontend API URL**
   Edit `client/.env.production`:
   ```
   REACT_APP_API_URL=https://your-render-app-name.onrender.com/api
   ```

2. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **Deploy from client directory**
   ```bash
   cd client
   vercel --prod
   ```

4. **Configure Vercel Project**
   - Follow the prompts to link to your Vercel account
   - Project name: `carpenter-shop-frontend`
   - Framework: React (auto-detected)

5. **Set Environment Variables in Vercel**
   Go to vercel.com → Your Project → Settings → Environment Variables:
   ```
   REACT_APP_API_URL=https://your-render-app-name.onrender.com/api
   ```

### 3. Update CORS Settings

In your Render environment variables, make sure:
```
CORS_ORIGIN=https://your-vercel-app-name.vercel.app
```

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Make sure `CORS_ORIGIN` in Render matches your Vercel URL exactly
   - Include both http and https versions if needed

2. **MongoDB Connection**
   - Use MongoDB Atlas for free cloud database
   - Whitelist Render's IP (0.0.0.0/0 for all IPs)

3. **Build Failures**
   - Check Render logs for missing dependencies
   - Ensure all environment variables are set

4. **API Calls Failing**
   - Verify API URL in frontend matches Render URL
   - Check if backend is deployed and running

## 📋 Environment Variables Checklist

### Backend (Render):
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=random_string_here`
- [ ] `ADMIN_EMAIL=...`
- [ ] `ADMIN_PASSWORD=...`
- [ ] `ADMIN_NAME=...`
- [ ] `ADMIN_PHONE=...`
- [ ] `CORS_ORIGIN=https://your-app.vercel.app`

### Frontend (Vercel):
- [ ] `REACT_APP_API_URL=https://your-app.onrender.com/api`

## 🎯 Final Steps

1. **Test the deployment**
   - Visit your Vercel URL
   - Try registering/logging in
   - Test admin functionality

2. **Update admin account**
   - Login with admin credentials
   - Update services and inventory

3. **Monitor performance**
   - Check Render logs for errors
   - Monitor Vercel build logs

## 🔄 Continuous Deployment

Both platforms offer automatic deployments when you push to GitHub:
- **Render**: Auto-deploys on push to main branch
- **Vercel**: Auto-deploys on push to main branch

## 💡 Pro Tips

1. **Custom Domain**: Add custom domains in both Vercel and Render
2. **SSL**: Both platforms provide free SSL certificates
3. **Performance**: Consider upgrading from free plans for better performance
4. **Backups**: Regular MongoDB backups through Atlas

## 📞 Support

- **Vercel**: vercel.com/docs
- **Render**: render.com/docs
- **MongoDB Atlas**: docs.mongodb.com/atlas

Your app will be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-app.onrender.com/api`
