# Trade-Off Referee

A decision-support tool that generates structured comparisons of multiple approaches using Groq API. The system consists of a Node.js/Express backend and a React frontend.

## Quick Start

### 1. Backend Setup

1. **Install backend dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

3. **Add your Groq API key to `.env`:**
```
GROQ_API_KEY=your_actual_api_key_here
PORT=3000
```

4. **Start the backend server:**
```bash
npm start
```

The backend will start on **http://localhost:3000**

### 2. Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Start the frontend development server:**
```bash
npm start
```

The frontend will start on **http://localhost:3001**

### 3. Access the Application

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000

## How to Check if Backend is Running

### Method 1: Check the Terminal
Look for this message when you run `npm start`:
```
🚀 Trade-Off Referee server running on port 3000
📊 Health check: http://localhost:3000/health
📖 API info: http://localhost:3000/api/info
```

### Method 2: Test the API Endpoint
```bash
curl http://localhost:3000/api/compare \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question": "Should I use React or Vue for my project?"}'
```

### Method 3: Check Process
```bash
# On Windows
netstat -an | findstr :3000

# On Mac/Linux
lsof -i :3000
```

### Method 4: Browser Test
Visit http://localhost:3000/health in your browser to see the health check response.

## Integration Test

Run the integration test to verify both backend and frontend work together:

```bash
cd frontend
node scripts/test-integration.js
```

## API Usage

Send POST requests to `/api/compare` with a question:

```bash
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"question": "Should I use React or Vue for my project?"}'
```

## Project Structure

```
trade-off-referee/
├── src/                    # Backend source code
├── frontend/               # React frontend application
├── tests/                  # Backend tests
├── cache/                  # Local cache storage
├── package.json           # Backend dependencies
└── README.md
```

## Features

- 🎯 **Structured Decision Analysis** - Get pros, cons, and trade-offs for different approaches
- 🚀 **Modern UI** - Clean, responsive React interface with Tailwind CSS
- ⚡ **Fast API** - Node.js backend with local caching
- 🔄 **Rate Limit Handling** - Automatic retry logic for API limits
- 📱 **Mobile Friendly** - Responsive design works on all devices
- ♿ **Accessible** - ARIA labels and keyboard navigation support
- 🔌 **No Port Conflicts** - Backend (3000) and Frontend (3001) run on separate ports

## Testing

**Backend tests:**
```bash
npm test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**Security checks:**
```bash
cd frontend
npm run security:check
npm run audit
```

**Integration test:**
```bash
cd frontend
node scripts/test-integration.js
```

## Security

### Frontend Security Status
- ✅ **No high-severity vulnerabilities**
- ✅ **Dependencies updated to latest secure versions**
- ⚠️ **3 moderate dev-only vulnerabilities** (webpack-dev-server - development only)

### Security Features
- Input validation and XSS protection
- Secure dependency management
- Regular vulnerability scanning
- Production security headers ready
- HTTPS enforcement ready

### Security Commands
```bash
cd frontend
npm run security:check    # Check for high-severity issues
npm run audit            # Full security audit
npm run deps:update      # Update dependencies
```

For detailed security information, see `frontend/docs/SECURITY_GUIDE.md`

## Troubleshooting

### Backend Not Starting
- Check if port 3000 is already in use
- Verify your Groq API key is set in `.env`
- Make sure all dependencies are installed: `npm install`

### Frontend Can't Connect to Backend
- Ensure backend is running on port 3000
- Check the browser console for CORS errors
- Verify the API URL in `frontend/.env` (should be `http://localhost:3000`)
- Make sure frontend is running on port 3001

### API Errors
- Verify your Groq API key is valid
- Check your internet connection
- Review the backend logs for detailed error messages

## Getting a Groq API Key

1. Visit https://console.groq.com/
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file