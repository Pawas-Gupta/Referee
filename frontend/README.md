# Trade-Off Referee Frontend

A React frontend for the Trade-Off Referee decision support tool.

## Features

- Clean, dashboard-style interface
- Responsive design with Tailwind CSS
- Real-time API integration with backend
- Loading states and error handling
- Accessible UI components

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3001](http://localhost:3001).

### Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:3001
```

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx              # Left panel with input and recent questions
│   ├── QuestionInput.jsx        # Question form component
│   ├── ComparisonPanel.jsx      # Main content area
│   ├── ApproachCard.jsx         # Individual approach display
│   ├── ProsConsList.jsx         # Pros and cons with icons
│   ├── TradeoffsBox.jsx         # Trade-offs display
│   └── RecommendationFooter.jsx # Final recommendations
├── services/
│   └── api.js                   # API service layer
├── App.js                       # Main application component
├── index.js                     # React entry point
└── index.css                    # Tailwind CSS imports
```

## API Integration

The frontend connects to the backend `/compare` endpoint and expects responses in this format:

```json
{
  "problem_summary": "string",
  "primary_approach": {
    "title": "string",
    "description": "string",
    "pros": ["string"],
    "cons": ["string"],
    "tradeoffs": "string"
  },
  "alternative_approach": {
    "title": "string",
    "description": "string", 
    "pros": ["string"],
    "cons": ["string"],
    "tradeoffs": "string"
  },
  "when_to_choose": {
    "choose_primary_if": ["string"],
    "choose_alternative_if": ["string"]
  },
  "optional_hybrid_strategy": "string",
  "final_recommendation": "string"
}
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)