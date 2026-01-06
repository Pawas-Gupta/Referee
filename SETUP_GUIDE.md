# Trade-Off Referee - Complete Setup Guide

This guide will help you set up and run the complete Trade-Off Referee system with both backend and frontend.

## System Overview

The Trade-Off Referee consists of:
- **Backend**: Node.js/Express server with Groq API integration
- **Frontend**: React application with Tailwind CSS

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Groq API key (free tier available)

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
   
   Edit `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   ```

3. **Start the backend server:**
   ```bash
   npm start
   ```
   
   The backend will run on http://localhost:3001

### 2. Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   ```

4. **Start the frontend development server:**
   ```bash
   npm start
   ```
   
   The frontend will run on http://localhost:3001

### 3. Test the Integration

Run the integration test to verify everything works:

```bash
# From the frontend directory
node scripts/test-integration.js
```

## Usage

1. Open http://localhost:3001 in your browser
2. Enter a decision-oriented question in the sidebar
3. Click "Compare Approaches" 
4. View the structured analysis with pros, cons, and recommendations

## Example Questions

Try these sample questions:
- "Should I use React or Vue for my frontend?"
- "What's the best approach for user authentication?"
- "Should I use MySQL or PostgreSQL for my database?"
- "How should I deploy my web application?"

## Project Structure

```
trade-off-referee/
├── src/                     # Backend source code
│   ├── server.js           # Express server
│   ├── groqClient.js       # Groq API integration
│   ├── cacheManager.js     # Local caching
│   └── ...
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── App.js         # Main app component
│   └── public/
├── tests/                  # Backend tests
├── cache/                  # Local cache storage
└── README.md
```

## Features

### Backend Features
- ✅ Groq API integration with fallback models
- ✅ Local caching to reduce API calls
- ✅ Rate limit handling with exponential backoff
- ✅ JSON response validation and normalization
- ✅ Comprehensive error handling
- ✅ Property-based testing

### Frontend Features
- ✅ Clean, dashboard-style interface
- ✅ Responsive design (desktop and mobile)
- ✅ Real-time API integration
- ✅ Loading states and error handling
- ✅ Accessibility features (ARIA labels, keyboard navigation)
- ✅ Recent questions for quick access

## API Endpoints

### POST /compare
Analyzes a decision question and returns structured comparison.

**Request:**
```json
{
  "question": "Should I use React or Vue for my frontend?"
}
```

**Response:**
```json
{
  "problem_summary": "...",
  "primary_approach": {
    "title": "React",
    "description": "...",
    "pros": ["..."],
    "cons": ["..."],
    "tradeoffs": "..."
  },
  "alternative_approach": {
    "title": "Vue.js", 
    "description": "...",
    "pros": ["..."],
    "cons": ["..."],
    "tradeoffs": "..."
  },
  "when_to_choose": {
    "choose_primary_if": ["..."],
    "choose_alternative_if": ["..."]
  },
  "optional_hybrid_strategy": "...",
  "final_recommendation": "..."
}
```

## Troubleshooting

### Backend Issues

**"API key not configured"**
- Make sure you have a valid Groq API key in your `.env` file
- Get a free API key at https://console.groq.com/

**"Rate limit exceeded"**
- The system automatically handles rate limits with exponential backoff
- Consider upgrading your Groq plan for higher limits

**"Cache errors"**
- Delete the `cache/` directory and restart the server
- Check file permissions for the cache directory

### Frontend Issues

**"Cannot connect to backend"**
- Make sure the backend server is running on port 3000
- Check that REACT_APP_API_URL is set correctly in frontend/.env

**"CORS errors"**
- The backend is configured to allow CORS from localhost:3001
- If using different ports, update the CORS configuration in server.js

## Development

### Running Tests

**Backend tests:**
```bash
npm test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

### Building for Production

**Backend:**
```bash
npm run build  # If you have a build script
```

**Frontend:**
```bash
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.