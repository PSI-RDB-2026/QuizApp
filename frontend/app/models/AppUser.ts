import type { User as FirebaseUser } from "firebase/auth";

export class AppUser {
  firebaseUser: FirebaseUser;

  constructor(firebaseUser: FirebaseUser) {
    this.firebaseUser = firebaseUser;
  }

  getDisplayName(): string {
    return (
      this.firebaseUser.displayName || this.firebaseUser.email || "Unknown User"
    );
  }

  async getAccessToken(): Promise<string> {
    return await this.firebaseUser.getIdToken(true);
  }

  accessToken(): string {
    return this.firebaseUser.accessToken || "null";
  }
}
