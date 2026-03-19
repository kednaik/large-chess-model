# Large Chess Model ♟️

A full-stack, AI-powered chess application featuring a custom-trained Vision Transformer (ViT) model for move prediction. Built with PyTorch, FastAPI, React (Vite), and deployed serverlessly on AWS using Terraform.

---

## 🏗 Architecture Overview

This project is divided into distinct, decoupled components:

1. **Frontend (`frontend/`)**: 
   - Built with **React** (TypeScript + Vite) and `react-chessboard` for a highly responsive UI.
   - Hosted statically on **AWS S3** and distributed globally via **AWS CloudFront**.
2. **Backend API (`model/`)**: 
   - A high-performance **FastAPI** server that wraps the PyTorch inference engine.
   - Containerized with Docker and deployed to **ECS Fargate Spot** behind an **Application Load Balancer (ALB)**, reducing compute costs by ~70%.
3. **AI Core (`model/api.py`)**: 
   - Employs a **ViT-Hybrid (Dual Head)** model Architecture tailored for board evaluation and policy move selection.
   - Model weights (`chess_vit_latest.pt`) are stored securely in S3 and fetched dynamically at container startup to keep Docker image sizes small.
4. **Data (`ChessData/`)**:
   - Training scripts and datasets processing roughly **138,000+** Grandmaster chess games stored in PGN format.
5. **Infrastructure (`terraform/`)**:
   - Fully automated AWS environment provisioning using **Terraform** (VPC, Subnets, IAM, ALB, ECS, S3, CloudFront).

---

## 📂 Project Structure

```text
LargeChessModel/
├── frontend/             # React (Vite) User Interface
│   ├── src/              # React queries Backend API
│   └── dist/             # Production build (synced to S3)
├── model/                # Python backend & Neural Network
│   ├── api.py            # FastAPI server & PyTorch Inference
│   └── requirements.txt  # Python Dependencies
├── terraform/            # Infrastructure as Code (AWS)
│   ├── main.tf           # Core Provider Config
│   ├── ecs.tf            # Fargate Cluster & Task Defs
│   ├── alb.tf            # Load Balancer Routing
│   ├── cloudfront.tf     # CDN & S3 Origin config
│   └── vpc.tf            # Network Architecture
├── checkpoints/          # Local training checkpoints
├── ChessData/            # Raw .pgn game files
├── Dockerfile            # Container definition for the Backend
├── start.sh              # Container startup script (fetches weights & starts uvicorn)
├── DEPLOYMENT.md         # Detailed AWS release instructions
└── README.md             # This file
```

---

## 💻 Local Development

### 1. Backend (FastAPI / PyTorch)
To run the AI engine locally:
```bash
cd model
# Create a virtual environment & install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start the local uvicorn server
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```
*Note: Make sure your `checkpoints/` directory has a valid `.pt` model weight file, or edit `api.py` to point to a local fallback weight.*

### 2. Frontend (React / Vite)
To run the board UI locally:
```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```
The UI defaults to requesting AI moves from `http://localhost:8000` when running locally in dev mode.

---

## 🚀 AWS Production Deployment

Deploying to production involves uploading the model weights to S3, building/pushing the Docker image to ECR, applying the Terraform code, and syncing the frontend build.

For step-by-step instructions on deploying, verifying, or tearing down the AWS resources, please see **[DEPLOYMENT.md](./DEPLOYMENT.md)**. 

### Key Deployment Features:
- **Zero-Downtime Updates**: Update the React app by simply running `npm run build` and `aws s3 sync`.
- **Cost Effective**: Serverless S3 hosting, Fargate Spot compute, and no expensive NAT Gateways (Public Subnets + VPC Endpoints).
- **Environment Aware**: The frontend uses `VITE_API_URL` injected at build-time to seamlessly target the production CloudFront/ALB endpoint.

---

## 🤖 The AI Engine
- **ViT-Hybrid**: Evaluates board states (FEN) simultaneously outputting a policy (move probabilities) and value (board evaluation).
- **Default ELO**: Configured for 2600+ simulated strength within the API logic.
- **Dynamic Bootstrapping**: The Docker container pulls the 180MB+ weights directly from S3 securely at launch via `start.sh`, ensuring fast CI/CD builds without bloated images.
