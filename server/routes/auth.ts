import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

const router = Router();

// Get current user data
router.get('/user', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const user = await storage.getUser(req.firebaseUser.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Update last login
    await storage.updateUser(req.firebaseUser.uid, {
      lastLoginAt: new Date()
    });

    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Register new user (called after Firebase signup)
router.post('/register', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { email, firstName, lastName, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUser(req.firebaseUser.uid);
    if (existingUser) {
      return res.json(existingUser);
    }

    // Generate unique referral code for new user
    const userReferralCode = nanoid(8).toUpperCase();

    // Create user data
    const userData: any = {
      id: req.firebaseUser.uid,
      email: email || req.firebaseUser.email,
      firstName: firstName || '',
      lastName: lastName || '',
      referralCode: userReferralCode,
      plan: 'FREE',
      quotesLimit: 5,
      monthlyQuotes: 0,
      quotesUsedThisMonth: 0,
      referralCount: 0,
      bonusQuotes: 0,
      whatsappNotifications: true,
      emailNotifications: true,
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      paymentStatus: 'ativo',
      isAdmin: false,
      lastLoginAt: new Date(),
    };

    // Handle referral if provided
    let referredBy = null;
    if (referralCode) {
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (referrer) {
        referredBy = referrer.id;
        userData.referredBy = referredBy;
        
        // Add bonus quote to free user or extend premium for premium users
        if (referrer.plan === 'FREE') {
          await storage.addReferralBonus(referrer.id);
        } else if (referrer.plan === 'PREMIUM') {
          // Extend premium plan by 15 days
          const currentExpiry = referrer.planExpiresAt || new Date();
          const newExpiry = new Date(currentExpiry);
          newExpiry.setDate(newExpiry.getDate() + 15);
          await storage.updateUserPlan(referrer.id, 'PREMIUM', newExpiry);
        }

        // Create referral record
        await storage.createReferral({
          referrerId: referrer.id,
          referredId: req.firebaseUser.uid,
          referralCode: referralCode,
          status: 'completed',
          rewardType: referrer.plan === 'FREE' ? 'bonus_quote' : 'premium_extension',
          rewardValue: referrer.plan === 'FREE' ? 1 : 15,
          completedAt: new Date(),
          rewardedAt: new Date(),
        });
      }
    }

    const newUser = await storage.createUser(userData);

    // Log registration activity
    await storage.logUserActivity({
      userId: newUser.id,
      action: 'register',
      category: 'authentication',
      details: {
        email: newUser.email,
        referredBy: referredBy,
        referralCode: referralCode || null,
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// Update user profile
router.put('/user', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { 
      firstName, 
      lastName, 
      cpfCnpj, 
      profession, 
      businessName, 
      phone, 
      address, 
      cep, 
      numero, 
      complemento, 
      cidade, 
      estado,
      pixKey 
    } = req.body;

    const updatedUser = await storage.updateUser(req.firebaseUser.uid, {
      firstName,
      lastName,
      cpfCnpj,
      profession,
      businessName,
      phone,
      address,
      cep,
      numero,
      complemento,
      cidade,
      estado,
      pixKey,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

// Toggle user plan (admin only)
router.post('/toggle-plan', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const currentUser = await storage.getUser(req.firebaseUser.uid);
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { userId } = req.body;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const newPlan = user.plan === 'FREE' ? 'PREMIUM' : 'FREE';
    const planExpiresAt = newPlan === 'PREMIUM' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;

    const updatedUser = await storage.updateUserPlan(userId, newPlan, planExpiresAt);

    // Log plan change activity
    await storage.logUserActivity({
      userId: updatedUser.id,
      action: 'plan_changed',
      category: 'payment',
      details: {
        oldPlan: user.plan,
        newPlan: newPlan,
        changedBy: currentUser.id,
        expiresAt: planExpiresAt,
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error toggling plan:', error);
    res.status(500).json({ message: 'Erro ao alterar plano' });
  }
});

export default router;