# Stage 1: Build the React app
FROM node:20.14.0-bullseye-slim AS build
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; \
    fi

# Copy the rest of the source code
COPY . .

# Build the app
RUN npm run build || yarn build

# Determine build output directory
# If dist exists, rename it to build so the next stage always has /app/build
RUN if [ -d dist ]; then mv dist build; fi

# Fail if build folder doesn't exist
RUN test -d build || (echo "❌ Build output not found" && exit 1)

# Stage 2: Serve with Nginx
FROM nginx:1.27.0-alpine
WORKDIR /usr/share/nginx/html

# Copy build output
COPY --from=build /app/build .

# Copy custom Nginx config if you have one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 6060
CMD ["nginx", "-g", "daemon off;"]
