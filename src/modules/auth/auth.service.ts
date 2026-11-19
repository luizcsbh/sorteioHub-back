import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/prisma.js';
import { signJwt } from '../../config/jwt.js';
import { cleanCpf, maskCpf } from '../../utils/cpf.js';
import { encryptCpf, hashCpf } from '../../utils/crypto.js';
import { logAudit } from '../../utils/audit.js';
import { Request } from 'express';
import bcrypt from 'bcryptjs';

// Instância lazy: lida sempre em runtime para garantir o valor correto do .env
const getGoogleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleAuthInput {
  credential?: string;
  mockProfile?: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface CompleteProfileInput {
  cpf: string;
  phone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
}

export class AuthService {
  static async loginWithGoogle(input: GoogleAuthInput, req?: Request) {
    let googleId: string;
    let email: string;
    let name: string;
    let avatarUrl: string | undefined;

    if (input.credential) {
      // Validação real de token Google OAuth
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        console.log('[GoogleOAuth] GOOGLE_CLIENT_ID em uso:', clientId?.slice(0, 20) + '...');
        const googleClient = getGoogleClient();
        const ticket = await googleClient.verifyIdToken({
          idToken: input.credential,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error('Token do Google não contém e-mail válido.');
        }
        googleId = payload.sub;
        email = payload.email.toLowerCase().trim();
        name = payload.name || 'Usuário Google';
        avatarUrl = payload.picture;
      } catch (err: any) {
        // Fallback em caso de credencial de teste com prefixo test_ ou ambiente local
        if (process.env.NODE_ENV !== 'production' && input.mockProfile) {
          googleId = input.mockProfile.googleId;
          email = input.mockProfile.email.toLowerCase().trim();
          name = input.mockProfile.name;
          avatarUrl = input.mockProfile.avatarUrl;
        } else {
          throw new Error(`Falha na validação do Google OAuth: ${err.message}`);
        }
      }
    } else if (input.mockProfile) {
      googleId = input.mockProfile.googleId;
      email = input.mockProfile.email.toLowerCase().trim();
      name = input.mockProfile.name;
      avatarUrl = input.mockProfile.avatarUrl;
    } else {
      throw new Error('Dados de autenticação ausentes.');
    }

    // Busca usuário existente pelo email ou googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
      include: {
        address: true,
      },
    });

    const isNewUser = !user;

    if (!user) {
      // Se for o primeiro usuário do sistema ou email configurado, pode ser SUPER_ADMIN
      const userCount = await prisma.user.count();
      const initialRole = userCount === 0 ? 'SUPER_ADMIN' : 'PARTICIPANT';

      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatarUrl,
          role: initialRole,
        },
        include: {
          address: true,
        },
      });

      await logAudit({
        req,
        userId: user.id,
        action: 'USER_REGISTERED_GOOGLE',
        entity: 'User',
        entityId: user.id,
        details: { email, role: user.role },
      });
    } else {
      // Atualiza avatar ou googleId se estavam pendentes
      if (!user.googleId || !user.avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            avatarUrl: user.avatarUrl || avatarUrl,
          },
          include: {
            address: true,
          },
        });
      }

      await logAudit({
        req,
        userId: user.id,
        action: 'USER_LOGIN_GOOGLE',
        entity: 'User',
        entityId: user.id,
        details: { email },
      });
    }

    const needsProfileCompletion = !user.isCpfValidated || !user.address;

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      isCpfValidated: user.isCpfValidated,
    });

    return {
      token,
      isNewUser,
      needsProfileCompletion,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        cpfMasked: user.cpfMasked,
        isCpfValidated: user.isCpfValidated,
        address: user.address,
      },
    };
  }

  static async completeProfile(userId: string, data: CompleteProfileInput, req?: Request) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { address: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const cleanedCpf = cleanCpf(data.cpf);
    const calculatedHash = hashCpf(cleanedCpf);

    // Verifica se já existe outro usuário com o mesmo CPF
    const existingWithCpf = await prisma.user.findFirst({
      where: {
        cpfHash: calculatedHash,
        id: { not: userId },
      },
    });

    if (existingWithCpf) {
      throw new Error('Este CPF já está cadastrado na plataforma por outro usuário.');
    }

    const encryptedCpf = encryptCpf(cleanedCpf);
    const masked = maskCpf(cleanedCpf);

    // Transação para persistir dados cadastrais, endereço e aceites de LGPD
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Atualiza usuário
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          phone: data.phone,
          cpfHash: calculatedHash,
          cpfEncrypted: encryptedCpf,
          cpfMasked: masked,
          isCpfValidated: true,
        },
      });

      // 2. Cria ou atualiza endereço
      const address = await tx.address.upsert({
        where: { userId },
        create: {
          userId,
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado.toUpperCase(),
        },
        update: {
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado.toUpperCase(),
        },
      });

      // 3. Registra aceite dos Termos de Uso
      await tx.termsAcceptance.create({
        data: {
          userId,
          termType: 'TERMS_OF_USE',
          version: '1.0',
          ipAddress: req?.ip || req?.socket.remoteAddress,
          userAgent: req?.headers['user-agent'],
        },
      });

      // 4. Registra aceite da Política de Privacidade
      await tx.termsAcceptance.create({
        data: {
          userId,
          termType: 'PRIVACY_POLICY',
          version: '1.0',
          ipAddress: req?.ip || req?.socket.remoteAddress,
          userAgent: req?.headers['user-agent'],
        },
      });

      return { user: updatedUser, address };
    });

    await logAudit({
      req,
      userId,
      action: 'PROFILE_COMPLETED_CPF_VALIDATED',
      entity: 'User',
      entityId: userId,
      details: { cpfMasked: masked },
    });

    const token = signJwt({
      id: updated.user.id,
      email: updated.user.email,
      role: updated.user.role,
      isCpfValidated: updated.user.isCpfValidated,
    });

    return {
      token,
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.user.role,
        avatarUrl: updated.user.avatarUrl,
        phone: updated.user.phone,
        cpfMasked: updated.user.cpfMasked,
        isCpfValidated: updated.user.isCpfValidated,
        address: updated.address,
      },
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        _count: {
          select: {
            memberships: true,
            raffleParticipations: true,
            wonPrizes: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      cpfMasked: user.cpfMasked,
      isCpfValidated: user.isCpfValidated,
      address: user.address,
      counts: user._count,
    };
  }

  static async registerWithEmail(data: { name: string; email: string; password: string }, req?: Request) {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (existing) {
      throw new Error('Este e-mail já está cadastrado. Faça login ou use o Google para acessar.');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'PARTICIPANT';

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role,
      },
      include: { address: true },
    });

    await logAudit({
      req,
      userId: user.id,
      action: 'USER_REGISTERED_EMAIL',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      isCpfValidated: user.isCpfValidated,
    });

    return {
      token,
      isNewUser: true,
      needsProfileCompletion: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        cpfMasked: user.cpfMasked,
        isCpfValidated: user.isCpfValidated,
        address: user.address,
      },
    };
  }

  static async loginWithEmail(data: { email: string; password: string }, req?: Request) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: { address: true },
    });

    if (!user || !user.passwordHash) {
      throw new Error('E-mail ou senha inválidos.');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new Error('E-mail ou senha inválidos.');
    }

    await logAudit({
      req,
      userId: user.id,
      action: 'USER_LOGIN_EMAIL',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email },
    });

    const needsProfileCompletion = !user.isCpfValidated || !user.address;

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      isCpfValidated: user.isCpfValidated,
    });

    return {
      token,
      isNewUser: false,
      needsProfileCompletion,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        cpfMasked: user.cpfMasked,
        isCpfValidated: user.isCpfValidated,
        address: user.address,
      },
    };
  }
}
