FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --uid 10001 --create-home safepath
COPY --chown=10001:10001 app ./app
RUN mkdir -p /app/data && chown 10001:10001 /app/data
USER 10001:10001
EXPOSE 8000
CMD ["sh", "-c", "exec python -m uvicorn app.shared:create_shared_app --factory --host 0.0.0.0 --port ${PORT:-8000} --no-access-log --no-proxy-headers"]
