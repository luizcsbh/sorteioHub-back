import { PrismaClient, Role, GroupStatus, MembershipStatus, RaffleStatus, RaffleVisibility } from '@prisma/client';
import { cleanCpf, maskCpf } from '../src/utils/cpf.js';
import { encryptCpf, hashCpf } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('[Neon Seed] Iniciando povoamento inicial no Neon Database...');

  // 1. Super Admin
  const adminCpf = '52998224725';
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@sorteiohub.com.br' },
    update: {},
    create: {
      email: 'admin@sorteiohub.com.br',
      name: 'Administrador Geral',
      role: Role.SUPER_ADMIN,
      googleId: 'google_admin_master_001',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdministradorGeral',
      phone: '(11) 98888-7777',
      cpfHash: hashCpf(cleanCpf(adminCpf)),
      cpfEncrypted: encryptCpf(cleanCpf(adminCpf)),
      cpfMasked: maskCpf(adminCpf),
      isCpfValidated: true,
      address: {
        create: {
          cep: '01310100',
          logradouro: 'Avenida Paulista',
          numero: '1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      },
    },
  });

  // 2. Administrador de Grupo
  const gestorCpf = '12345678909';
  const gestor = await prisma.user.upsert({
    where: { email: 'gestor@empresa.com.br' },
    update: {},
    create: {
      email: 'gestor@empresa.com.br',
      name: 'Gestor de Comunidade',
      role: Role.ADMINISTRATOR,
      googleId: 'google_gestor_002',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GestorComunidade',
      phone: '(11) 97777-6666',
      cpfHash: hashCpf(cleanCpf(gestorCpf)),
      cpfEncrypted: encryptCpf(cleanCpf(gestorCpf)),
      cpfMasked: maskCpf(gestorCpf),
      isCpfValidated: true,
      address: {
        create: {
          cep: '04538133',
          logradouro: 'Avenida Brigadeiro Faria Lima',
          numero: '3500',
          bairro: 'Itaim Bibi',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      },
    },
  });

  // 3. Participante
  const userCpf = '52998224725'; // Diferente na prática
  const joao = await prisma.user.upsert({
    where: { email: 'joao.silva@gmail.com' },
    update: {},
    create: {
      email: 'joao.silva@gmail.com',
      name: 'João Silva',
      role: Role.PARTICIPANT,
      googleId: 'google_joao_003',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JoaoSilva',
      phone: '(11) 99999-1234',
      cpfHash: hashCpf('85412803080'), // CPF válido para o João
      cpfEncrypted: encryptCpf('85412803080'),
      cpfMasked: maskCpf('85412803080'),
      isCpfValidated: true,
      address: {
        create: {
          cep: '01001000',
          logradouro: 'Praça da Sé',
          numero: '100',
          bairro: 'Sé',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      },
    },
  });

  // 4. Grupo Fechado VIP
  let group = await prisma.group.findFirst({ where: { name: 'Comunidade VIP SorteioHub' } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: 'Comunidade VIP SorteioHub',
        description: 'Grupo fechado exclusivo para sorteios auditáveis e premiações especiais.',
        managerId: gestor.id,
        status: GroupStatus.ATIVO,
        autoApprove: true,
        maxMembers: 500,
        members: {
          create: [
            {
              userId: gestor.id,
              status: MembershipStatus.ATIVO,
              joinedAt: new Date(),
            },
            {
              userId: joao.id,
              status: MembershipStatus.ATIVO,
              joinedAt: new Date(),
            },
          ],
        },
      },
    });
  }

  // 5. Sorteio de Exemplo Publicado
  let raffle = await prisma.raffle.findFirst({ where: { title: 'Sorteio Exclusivo: iPhone 16 Pro 256GB' } });
  if (!raffle && group) {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 10);
    const drawDate = new Date();
    drawDate.setDate(drawDate.getDate() + 11);

    raffle = await prisma.raffle.create({
      data: {
        groupId: group.id,
        title: 'Sorteio Exclusivo: iPhone 16 Pro 256GB',
        description: 'Participe do sorteio especial de lançamento da Comunidade VIP. Sorteio criptograficamente auditável.',
        prize: 'iPhone 16 Pro 256GB Titânio Preto',
        rules: '1. O participante deve possuir cadastro único e CPF validado.\n2. Válido exclusivamente para membros ativos do grupo.\n3. O sorteio será realizado ao vivo com evidências criptográficas imutáveis.',
        winnerInstructions: 'O contemplado deverá confirmar o recebimento e os dados de entrega em até 5 dias úteis.',
        visibility: RaffleVisibility.RESTRITO_A_GRUPO,
        status: RaffleStatus.PUBLISHED,
        numberOfWinners: 1,
        maxEntriesPerPerson: 1,
        participationStartDate: start,
        participationEndDate: end,
        drawDateTime: drawDate,
        createdById: gestor.id,
      },
    });

    // Inscreve o João
    await prisma.raffleParticipant.create({
      data: {
        raffleId: raffle.id,
        userId: joao.id,
      },
    });

    // Cria notificação de boas-vindas
    await prisma.notification.create({
      data: {
        userId: joao.id,
        title: 'Bem-vindo ao grupo Comunidade VIP SorteioHub',
        message: 'Você já está inscrito no sorteio do iPhone 16 Pro 256GB! Boa sorte!',
        actionUrl: `/raffles/${raffle.id}`,
      },
    });
  }

  console.log('[Neon Seed] Povoamento concluído com sucesso!');
  console.log('Super Admin:', superAdmin.email);
  console.log('Gestor:', gestor.email);
  console.log('Participante:', joao.email);
  console.log('Grupo criado:', group?.name);
}

main()
  .catch((e) => {
    console.error('[Neon Seed] Erro ao popular banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
