export interface AuthUser {
  _id: string;
  email?: string;
  role: string;
  organization?: string | null;
}
