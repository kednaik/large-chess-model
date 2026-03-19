FROM python:3.12-slim
WORKDIR /app
COPY model/api.py model/requirements.txt ./model/
RUN apt-get update && apt-get install -y awscli && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir python-chess fastapi uvicorn boto3
COPY start.sh ./
RUN chmod +x start.sh
EXPOSE 8000
CMD ["./start.sh"]
