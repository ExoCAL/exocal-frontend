# ExoCAL Azure Deployment Guide

## Quick Deployment Steps

### 1. Backend Deployment (FastAPI)

#### Option A: Azure Portal (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Web App**
3. Configure:
   - **Runtime stack**: Python 3.9
   - **Operating System**: Linux
   - **Pricing tier**: B1 (Basic) - $13.14/month
4. After creation, go to **Configuration** → **Application settings**:
   ```
   OUTPUT_ROOT = /home/site/wwwroot/runs
   CORS_ALLOW_ORIGINS = https://your-frontend-url.azurestaticapps.net
   JOB_EXPIRY_HOURS = 1
   CLEANUP_INTERVAL_MINUTES = 10
   MAX_UPLOAD_MB = 100
   DEFAULT_SEED = 42
   ```
5. Deploy your backend code:
   - Go to **Deployment Center**
   - Choose **Local Git** or **GitHub**
   - Upload your `ExoCalbackend` folder

#### Option B: Azure CLI
```bash
# Install Azure CLI first: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
az login
az group create --name ExoCAL-RG --location "East US"
az appservice plan create --name ExoCAL-Plan --resource-group ExoCAL-RG --sku B1 --is-linux
az webapp create --resource-group ExoCAL-RG --plan ExoCAL-Plan --name exocal-backend --runtime "PYTHON|3.9"
```

### 2. Frontend Deployment (React)

#### Build and Deploy
```bash
# In your exoanalysis directory
npm install
REACT_APP_API_BASE_URL=https://your-backend-url.azurewebsites.net npm run build
```

#### Deploy to Azure Static Web Apps
1. Go to Azure Portal → Create **Static Web App**
2. Choose **Custom** deployment
3. Upload your `build` folder
4. Or use GitHub integration for automatic deployment

### 3. Environment Variables

#### Backend (Azure App Service Settings)
- `OUTPUT_ROOT`: `/home/site/wwwroot/runs`
- `CORS_ALLOW_ORIGINS`: Your frontend URL
- `JOB_EXPIRY_HOURS`: `1`
- `CLEANUP_INTERVAL_MINUTES`: `10`

#### Frontend (Build-time)
- `REACT_APP_API_BASE_URL`: Your backend URL (e.g., `https://exocal-backend.azurewebsites.net`)

### 4. Testing After Deployment

1. **Test Backend**: Visit `https://your-backend-url.azurewebsites.net/health`
2. **Test Frontend**: Visit your Static Web App URL
3. **Test Integration**: Try uploading a file and running analysis

### 5. Cost Estimation

- **Backend (B1 App Service)**: ~$13/month
- **Frontend (Static Web App)**: Free tier available
- **Total**: ~$13/month for basic deployment

### 6. Troubleshooting

#### Common Issues:
1. **CORS Errors**: Update `CORS_ALLOW_ORIGINS` in backend settings
2. **File Upload Fails**: Check `MAX_UPLOAD_MB` setting
3. **Build Failures**: Ensure all dependencies are in `requirements.txt`
4. **Module Errors**: Check Python version (3.9 recommended)

#### Check Logs:
- Backend: Azure Portal → App Service → Log stream
- Frontend: Browser Developer Tools → Console

### 7. Production Considerations

- **Custom Domain**: Configure in Azure Portal
- **SSL Certificate**: Automatically provided by Azure
- **Monitoring**: Enable Application Insights
- **Scaling**: Upgrade to higher tier if needed
- **Backup**: Configure automated backups

## Quick Commands

```bash
# Build frontend with production API URL
REACT_APP_API_BASE_URL=https://your-backend.azurewebsites.net npm run build

# Test backend locally
cd ExoCalbackend
pip install -r requirements.txt
uvicorn app:app --reload

# Test frontend locally
cd exoanalysis
npm start
```
