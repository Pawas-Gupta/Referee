# Trade-Off Referee — Groq Free-Tier Project

## 🧭 Project Overview
The Trade-Off Referee is a decision-support tool.  
When a user asks a project or idea-related question such as:
- “I want to build X — what approach should I take?”
- “Should I use A or B for this project?”
- “What is the better way to implement this?”

The system must NOT return a single answer.  
Instead, it produces:
- a primary approach
- an alternative approach
- pros and cons
- trade-offs
- when to choose each
- an optional hybrid approach
- a conditional recommendation

The goal is to help the user **understand decisions**, not just receive one.

---

## 🎯 Core Principles
- Always generate **at least two viable approaches**
- Responses must be **structured, consistent, and concise**
- Output must stay **token-efficient** to respect Groq Free Tier limits
- The reasoning framework must be **generalized** across domains

---

## 🧩 Key Features
- Detects project / idea / decision-oriented questions
- Generates structured comparison analysis
- Uses shared decision criteria:
  - Cost / Effort
  - Complexity
  - Performance / Scalability
  - Flexibility / Future-proofing
  - Risk / Uncertainty
  - Learning Curve
  - Implementation Speed
  - Maintainability
- Produces **JSON-structured output** for the frontend
- Uses a **local cache** to reduce repeated Groq calls

---

## 🏗️ Architecture (High-Level Flow)

User → React Frontend → Express Backend  
→ Groq API (Free Tier)  
→ Validation + Cache Layer  
→ Response → UI

Backend Modules:
1. Prompt Builder  
2. Groq API Caller  
3. JSON Response Validator  
4. Local Cache Manager  
5. Rate-Limit Handler

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express

**Frontend**
- React + Tailwind CSS

**LLM**
- Groq API (Free Tier)
- Models:
  - `llama-3.3-70b-versatile` (primary)
  - `mixtral-8x7b-instruct` (fallback)

**Storage**
- Local JSON cache / Lite DB  
- No paid database

---

## 💰 Free-Tier Optimization Strategy
- Keep prompts short and structured
- Prefer bullet-style output
- Cache repeated questions
- Validate responses in code (no second LLM call)
- Handle rate-limits gracefully

---

## 📦 Standard Output Schema (Required JSON)

```json
{
  "problem_summary": "",
  "primary_approach": {
    "title": "",
    "description": "",
    "pros": [],
    "cons": [],
    "tradeoffs": ""
  },
  "alternative_approach": {
    "title": "",
    "description": "",
    "pros": [],
    "cons": [],
    "tradeoffs": ""
  },
  "when_to_choose": {
    "choose_primary_if": [],
    "choose_alternative_if": []
  },
  "optional_hybrid_strategy": "",
  "final_recommendation": ""
}

## 🧱 Validation Rules (Backend)

- Ensure every field exists  
- Replace missing arrays with `[]`  
- Normalize strings and whitespace  
- Never call the LLM again just to fix formatting  
- Cache the final validated response  

---

## 🚀 MVP Deliverables

- `/compare` Express endpoint  
- Groq API call with prompt template  
- JSON response validator  
- Local cache system  
- Basic React comparison UI  

---

## 📌 Project Goals Summary

- Free-tier compliant  
- Generalized decision framework  
- Structured JSON reasoning output  
- Lightweight and extensible  
- Ready for future scaling  
