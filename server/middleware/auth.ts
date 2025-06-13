import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase-admin';

export interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    customClaims?: Record<string, any>;
  };
}

// Cache para tokens válidos (melhor performance)
const tokenCache = new Map<string, { user: any; expiry: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Token de acesso requerido',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verificar cache primeiro
    const cached = tokenCache.get(token);
    if (cached && cached.expiry > Date.now()) {
      req.firebaseUser = cached.user;
      return next();
    }

    // Verificar token no Firebase
    const decodedToken = await auth.verifyIdToken(token, true); // checkRevoked = true
    
    const firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      customClaims: decodedToken.customClaims || {},
    };

    // Adicionar ao cache
    tokenCache.set(token, {
      user: firebaseUser,
      expiry: Date.now() + CACHE_DURATION
    });

    req.firebaseUser = firebaseUser;
    next();
    
  } catch (error: any) {
    // Remover do cache se inválido
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenCache.delete(token);
    }

    console.error('Error verifying token:', error);
    
    // Diferentes tipos de erro para melhor debugging
    let message = 'Token inválido';
    let code = 'INVALID_TOKEN';
    
    if (error.code === 'auth/id-token-expired') {
      message = 'Token expirado';
      code = 'EXPIRED_TOKEN';
    } else if (error.code === 'auth/id-token-revoked') {
      message = 'Token revogado';
      code = 'REVOKED_TOKEN';
    } else if (error.code === 'auth/invalid-id-token') {
      message = 'Token malformado';
      code = 'MALFORMED_TOKEN';
    }
    
    return res.status(401).json({ message, code });
  }
};

// Middleware para verificar se é admin
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ 
        message: 'Acesso não autorizado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verificar claims customizados para admin
    const isAdmin = req.firebaseUser.customClaims?.admin === true;
    
    if (!isAdmin) {
      return res.status(403).json({ 
        message: 'Acesso restrito a administradores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking admin:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  const tokensToDelete: string[] = [];
  
  tokenCache.forEach((data, token) => {
    if (data.expiry <= now) {
      tokensToDelete.push(token);
    }
  });
  
  tokensToDelete.forEach(token => tokenCache.delete(token));
}, 60000); // Limpar a cada minuto

export const requireAuth = authenticateToken;