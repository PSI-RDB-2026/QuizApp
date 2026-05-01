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
ARG FIREBASE_API_KEY=local-testing-key
ARG FIREBASE_AUTH_DOMAIN=local-testing
ARG FIREBASE_PROJECT_ID=local-testing
ARG FIREBASE_STORAGE_BUCKET=local-testing
ARG FIREBASE_MESSAGING_SENDER_ID=local-testing
ARG FIREBASE_APP_ID=local-testing
ARG FIREBASE_MEASUREMENT_ID=local-testing
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN --mount=type=secret,id=FIREBASE_API_KEY \
	--mount=type=secret,id=FIREBASE_AUTH_DOMAIN \
	--mount=type=secret,id=FIREBASE_PROJECT_ID \
	--mount=type=secret,id=FIREBASE_STORAGE_BUCKET \
	--mount=type=secret,id=FIREBASE_MESSAGING_SENDER_ID \
	--mount=type=secret,id=FIREBASE_APP_ID \
	--mount=type=secret,id=FIREBASE_MEASUREMENT_ID \
	sh -c ' \
	export FIREBASE_API_KEY=$(cat /run/secrets/FIREBASE_API_KEY 2>/dev/null || echo "'$FIREBASE_API_KEY'") && \
	export FIREBASE_AUTH_DOMAIN=$(cat /run/secrets/FIREBASE_AUTH_DOMAIN 2>/dev/null || echo "'$FIREBASE_AUTH_DOMAIN'") && \
	export FIREBASE_PROJECT_ID=$(cat /run/secrets/FIREBASE_PROJECT_ID 2>/dev/null || echo "'$FIREBASE_PROJECT_ID'") && \
	export FIREBASE_STORAGE_BUCKET=$(cat /run/secrets/FIREBASE_STORAGE_BUCKET 2>/dev/null || echo "'$FIREBASE_STORAGE_BUCKET'") && \
	export FIREBASE_MESSAGING_SENDER_ID=$(cat /run/secrets/FIREBASE_MESSAGING_SENDER_ID 2>/dev/null || echo "'$FIREBASE_MESSAGING_SENDER_ID'") && \
	export FIREBASE_APP_ID=$(cat /run/secrets/FIREBASE_APP_ID 2>/dev/null || echo "'$FIREBASE_APP_ID'") && \
	export FIREBASE_MEASUREMENT_ID=$(cat /run/secrets/FIREBASE_MEASUREMENT_ID 2>/dev/null || echo "'$FIREBASE_MEASUREMENT_ID'") && \
	npm run build \
	'

FROM node:20-alpine
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["npm", "run", "start"]