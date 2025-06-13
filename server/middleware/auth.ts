import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase-admin';

export interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Token de acesso requerido' });
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
    };

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireAuth = authenticateToken;