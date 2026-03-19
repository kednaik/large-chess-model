# Large Chess Model - Deployment Guide

This document provides complete instructions for deploying the Large Chess Model application onto AWS.

## Architecture
- **Frontend Hosting**: S3 + CloudFront CDN (static content, highly performant, serverless).
- **Backend API**: ECS Fargate Spot (0.5 vCPU / 1GB RAM) with Python FastAPI. Uses Spot capacity to drastically reduce costs (~70%).
- **Model Weights**: Stored in a separate S3 bucket and pulled at runtime to minimize container image sizes.
- **Load Balancing/Routing**: An Application Load Balancer routes `/api/*` requests to the container. CloudFront serves as the single custom domain front door.
- **Infrastructure as Code**: Everything except the initial bucket/ECR repo setup is fully managed via Terraform.

---

## 🚀 Step 1: Manual AWS Setup (One-time)

1. **Create the Model Weights Bucket and Upload Checkpoints**
   You need a centralized S3 bucket for downloading weights during container startup.
   ```bash
   aws s3 mb s3://large-chess-model-weights-yourname
   aws s3 cp checkpoints/run_20260313_133630/chess_vit_latest.pt s3://large-chess-model-weights-yourname/chess_vit_latest.pt
   ```

2. **Create an Elastic Container Registry (ECR)**
   This registry will store your PyTorch FastAPI image.
   ```bash
   aws ecr create-repository --repository-name large-chess-model-api
   ```

## 🐳 Step 2: Build & Push the Docker Image

Build the backend Docker image and push it to AWS ECR. Remember to adjust the Region and Account ID accordingly.

```bash
# 1. Authenticate Docker with AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 2. Build the Docker Image
docker build --platform linux/amd64 -t large-chess-model-api .

# 3. Tag and Push the Image
docker tag large-chess-model-api:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/large-chess-model-api:latest
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/large-chess-model-api:latest
```

## 🏗️ Step 3: Deploy Infrastructure (Terraform)

Move into the `terraform/` directory and apply the configuration. This handles networking, ECS, Load Balancers, CloudFront, and the frontend S3 bucket.

```bash
cd terraform
terraform init
terraform apply -auto-approve
```

Once complete, Terraform will output your CloudFront URL and your new frontend S3 bucket name. Example:
```
Outputs:
alb_dns_name = "..."
cloudfront_domain_name = "d12345abcdef.cloudfront.net"
frontend_bucket_name = "large-chess-model-frontend-xyz"
```

## 🖥️ Step 4: Build & Deploy Frontend

1. Ensure you have the CloudFront URL from the Terraform output.
2. Tell the React app to hit this URL for API requests.

```bash
cd frontend
echo "VITE_API_URL=https://<YOUR_CLOUDFRONT_DOMAIN>" > .env.production
npm install
npm run build
```

3. Sync the production build artifacts into your new S3 bucket:
```bash
aws s3 sync dist/ s3://<YOUR_FRONTEND_BUCKET_NAME>/
```

## 🎉 Step 5: Verify Deployment

1. Visit **`https://<YOUR_CLOUDFRONT_DOMAIN>`** in your browser. The chess UI should appear.
2. Play a move or visit `https://<YOUR_CLOUDFRONT_DOMAIN>/api/docs` to verify the ECS Fargate container is running and handling inference requests properly.

## 🧹 Undeploying / Teardown

If you want to spin everything down and stop incurring AWS charges:

1. Empty the frontend S3 bucket: `aws s3 rm s3://<YOUR_FRONTEND_BUCKET_NAME> --recursive`
2. Destroy the Terraform resources:
   ```bash
   cd terraform
   terraform destroy
   ```
3. Remove the ECR repository and images: `aws ecr delete-repository --repository-name large-chess-model-api --force`
4. Delete the model weights bucket: `aws s3 rb s3://large-chess-model-weights-yourname --force`
