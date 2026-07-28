FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY services/risk-engine/pyproject.toml ./
COPY services/risk-engine/app ./app
COPY models ./models
COPY indexes ./indexes
RUN pip install --no-cache-dir .
EXPOSE 8000
ENV MODEL_PATH=/app/models/srm-xgb-demo-1.0.0.json \
    MODEL_METADATA_PATH=/app/models/srm-xgb-demo-1.0.0.metadata.json \
    RETRIEVAL_INDEX_PATH=/app/indexes/srm-retrieval-demo-1.0.0.joblib
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
