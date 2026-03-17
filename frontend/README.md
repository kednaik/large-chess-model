# Large Chess Model - Frontend

This is the frontend for the Large Chess Model project, built with React, TypeScript, and Vite. It interacts with the Multi-Model Chess API to provide an interactive chess game with AI opponents.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python 3.11+](https://www.python.org/) (for the backend)
- [npm](https://www.npmjs.com/)

---

## Running the Application

To run the full application, you need to start both the backend API and the frontend dev server.

### 1. Start the Backend API

From the root directory of the project:

```bash
cd model
../.venv/bin/python api.py
```

The API will be available at `http://localhost:8000`.

### 2. Start the Frontend

In a new terminal, from the root directory:

```bash
cd frontend
npm install  # Only needed the first time
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Project Structure

```text
LargeChessModel/
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── assets/          # Static assets (images, icons)
│   │   ├── App.tsx          # Main game component & logic
│   │   ├── AppError.tsx     # Error fallback component
│   │   ├── index.css        # Global styles
│   │   └── main.tsx         # App entry point
│   ├── public/              # Public assets
│   ├── index.html           # HTML template
│   ├── vite.config.ts       # Vite configuration
│   └── package.json         # Frontend dependencies
├── model/                   # Backend & AI Models
│   ├── api.py               # FastAPI server
│   ├── requirements.txt     # Python dependencies
│   └── notebooks/           # Research & Training notebooks (.ipynb)
├── checkpoints/             # Trained model weights (.pt files)
└── .gitignore               # Root git ignore file
```

---

## Deployment / Push

To push changes to the repository:

```bash
git add .
git commit -m "Your descriptive commit message"
git push origin main
```
