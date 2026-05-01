# Firebase Authentication Examples

This file shows how frontend code can use the Firebase access token with authenticated API endpoints.

## What this covers

- Using the Firebase ID token as a Bearer token
- Calling authenticated endpoints like `getUserInfo`
- Reusing one helper for future protected endpoints

## Base URL

```js
const API_BASE = "/api";
```

## 1) Get a fresh access token

```ts
import { AppUser } from "app/models/AppUser";

async function getAccessToken(firebaseUser) {
  const appUser = new AppUser(firebaseUser);
  return await appUser.getAccessToken();
}
```

## 2) Call an authenticated endpoint

```ts
import { getUserInfo } from "api/api";

async function loadCurrentUser(firebaseUser) {
  const token = await new AppUser(firebaseUser).getAccessToken();
  const userInfo = await getUserInfo(token);

  if (!userInfo) {
    throw new Error("Could not load current user info");
  }

  return userInfo;
}
```

## 3) Reusable helper for protected requests

```ts
async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }

  return response.json().catch(() => null);
}
```

## 4) Example for future protected endpoints

```ts
async function getProtectedData(firebaseUser) {
  const token = await new AppUser(firebaseUser).getAccessToken();

  return apiRequest("/users/info", token, {
    method: "GET",
  });
}
```

## Notes

- `postLogin` and `postRegister` already send the Firebase token in the `Authorization: Bearer ...` header.
- `getUserInfo` also expects the token in the header.
- For any endpoint protected by `Depends(get_firebase_id)`, use the same Bearer token pattern.
