export interface Auth {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
