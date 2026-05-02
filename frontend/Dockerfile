# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN --mount=type=secret,id=FIREBASE_API_KEY \
    --mount=type=secret,id=FIREBASE_AUTH_DOMAIN \
    --mount=type=secret,id=FIREBASE_PROJECT_ID \
    --mount=type=secret,id=FIREBASE_STORAGE_BUCKET \
    --mount=type=secret,id=FIREBASE_MESSAGING_SENDER_ID \
    --mount=type=secret,id=FIREBASE_APP_ID \
    --mount=type=secret,id=FIREBASE_MEASUREMENT_ID \
    FIREBASE_API_KEY=$(cat /run/secrets/FIREBASE_API_KEY) \
    FIREBASE_AUTH_DOMAIN=$(cat /run/secrets/FIREBASE_AUTH_DOMAIN) \
    FIREBASE_PROJECT_ID=$(cat /run/secrets/FIREBASE_PROJECT_ID) \
    FIREBASE_STORAGE_BUCKET=$(cat /run/secrets/FIREBASE_STORAGE_BUCKET) \
    FIREBASE_MESSAGING_SENDER_ID=$(cat /run/secrets/FIREBASE_MESSAGING_SENDER_ID) \
    FIREBASE_APP_ID=$(cat /run/secrets/FIREBASE_APP_ID) \
    FIREBASE_MEASUREMENT_ID=$(cat /run/secrets/FIREBASE_MEASUREMENT_ID) \
    npm run build
	

FROM node:20-alpine
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["npm", "run", "start"]