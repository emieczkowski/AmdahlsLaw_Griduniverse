FROM python:3.9-slim

# Install necessary build tools and libraries
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libev-dev \
    libpq-dev \
    libffi-dev \
    make \
    && rm -rf /var/lib/apt/lists/*

# Install Dallinger and other Python dependencies
RUN pip install dallinger

# Continue setting up your Dockerfile...
COPY . /app
WORKDIR /app

ENTRYPOINT ["dallinger"]
CMD ["develop", "debug"]