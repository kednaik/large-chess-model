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

- `src/App.tsx`: Main application component and game logic.
- `src/main.tsx`: Application entry point.
- `src/index.css`: Global styles.
- `model/api.py`: FastAPI backend serving the chess models.

## Deployment / Push

To push changes to the repository:

```bash
git add .
git commit -m "Your descriptive commit message"
git push origin main
```
