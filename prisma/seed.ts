import {
  PrismaClient,
  Role,
  GroupStatus,
  MembershipStatus,
  RaffleStatus,
  RaffleVisibility,
  WinnerStatus,
  InvitationType,
  NotificationChannel,
  NotificationStatus,
  CampaignStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cleanCpf, maskCpf, isValidCpf } from '../src/utils/cpf.js';
import { encryptCpf, hashCpf } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

// Função determinística para gerar CPFs válidos únicos
function generateValidCpf(index: number): string {
  const base = String(100000000 + (index * 739) % 899999999).padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base[i], 10) * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;

  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base[i], 10) * (11 - i);
  }
  sum += d1 * 2;
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;

  const fullCpf = `${base}${d1}${d2}`;
  if (!isValidCpf(fullCpf)) {
    return `999${String(index).padStart(6, '0')}00`;
  }
  return fullCpf;
}

const firstNames = [
  'Lucas', 'Mariana', 'Gabriel', 'Juliana', 'Rodrigo', 'Fernanda', 'Felipe', 'Camila',
  'Bruno', 'Larissa', 'Thiago', 'Beatriz', 'Gustavo', 'Letícia', 'Matheus', 'Amanda',
  'Rafael', 'Jéssica', 'Leonardo', 'Vanessa', 'Diego', 'Priscila', 'Marcelo', 'Carolina',
  'Eduardo', 'Patrícia', 'Vinícius', 'Aline', 'Daniel', 'Natália', 'Guilherme', 'Tatiana',
  'Alexandre', 'Renata', 'Fábio', 'Bárbara', 'Caio', 'Sabrina', 'Vitor', 'Carla',
  'André', 'Monique', 'Paulo', 'Débora', 'Ricardo', 'Clarisse', 'Danilo', 'Bianca'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Gonçalves', 'Santana', 'Teixeira', 'Cavalcanti', 'Moura', 'Barros', 'Farias', 'Castro'
];

const cities = [
  { cidade: 'São Paulo', estado: 'SP', cep: '01310100', bairro: 'Bela Vista', logradouro: 'Avenida Paulista' },
  { cidade: 'Rio de Janeiro', estado: 'RJ', cep: '22041001', bairro: 'Copacabana', logradouro: 'Avenida Atlântica' },
  { cidade: 'Belo Horizonte', estado: 'MG', cep: '30130100', bairro: 'Funcionários', logradouro: 'Avenida Afonso Pena' },
  { cidade: 'Curitiba', estado: 'PR', cep: '80020100', bairro: 'Centro', logradouro: 'Rua das Flores' },
  { cidade: 'Porto Alegre', estado: 'RS', cep: '90010150', bairro: 'Centro Histórico', logradouro: 'Rua dos Andradas' },
  { cidade: 'Salvador', estado: 'BA', cep: '40015000', bairro: 'Comércio', logradouro: 'Avenida da França' },
  { cidade: 'Brasília', estado: 'DF', cep: '70040010', bairro: 'Asa Sul', logradouro: 'Setor Comercial Sul' },
  { cidade: 'Fortaleza', estado: 'CE', cep: '60165121', bairro: 'Meireles', logradouro: 'Avenida Beira Mar' },
  { cidade: 'Recife', estado: 'PE', cep: '50030000', bairro: 'Recife Antigo', logradouro: 'Avenida Rio Branco' },
  { cidade: 'Campinas', estado: 'SP', cep: '13010001', bairro: 'Cambuí', logradouro: 'Rua Coronel Quirino' },
];

async function main() {
  console.log('===========================================================');
  console.log('🚀 [SorteioClub Seed Completo] Iniciando Povoamento');
  console.log('===========================================================');

  const defaultPasswordHash = await bcrypt.hash('Senha@123', 10);
  const now = new Date();
  const pastDate = (days: number) => new Date(now.getTime() - days * 86400000);
  const futureDate = (days: number) => new Date(now.getTime() + days * 86400000);

  // ── 1. USUÁRIOS ADMINISTRATIVOS ──────────────────────────────────────────
  console.log('\n👑 1. Criando Usuários Administrativos...');

  const adminCpf = '52998224725';
  let superAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'admin@sorteioclub.com.br' },
        { email: 'admin@sorteiohub.com.br' },
        { googleId: 'google_admin_master_001' },
      ],
    },
  });

  if (superAdmin) {
    superAdmin = await prisma.user.update({
      where: { id: superAdmin.id },
      data: {
        email: 'admin@sorteioclub.com.br',
        name: 'Administrador Geral',
        role: Role.SUPER_ADMIN,
        passwordHash: defaultPasswordHash,
        googleId: 'google_admin_master_001',
        isCpfValidated: true,
      },
    });
  } else {
    superAdmin = await prisma.user.create({
      data: {
        email: 'admin@sorteioclub.com.br',
        name: 'Administrador Geral',
        role: Role.SUPER_ADMIN,
        passwordHash: defaultPasswordHash,
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
  }

  const gestorCpf = '12345678909';
  let gestor = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'gestor@empresa.com.br' },
        { googleId: 'google_gestor_002' },
      ],
    },
  });

  if (gestor) {
    gestor = await prisma.user.update({
      where: { id: gestor.id },
      data: {
        email: 'gestor@empresa.com.br',
        name: 'Gestor de Comunidade VIP',
        role: Role.ADMINISTRATOR,
        passwordHash: defaultPasswordHash,
        googleId: 'google_gestor_002',
        isCpfValidated: true,
      },
    });
  } else {
    gestor = await prisma.user.create({
      data: {
        email: 'gestor@empresa.com.br',
        name: 'Gestor de Comunidade VIP',
        role: Role.ADMINISTRATOR,
        passwordHash: defaultPasswordHash,
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
  }

  // Segundo Gestor Administrativo
  const gestor2Cpf = '98765432100';
  let gestor2 = await prisma.user.findFirst({
    where: { email: 'carlos.gerente@sorteioclub.com.br' },
  });

  if (!gestor2) {
    gestor2 = await prisma.user.create({
      data: {
        email: 'carlos.gerente@sorteioclub.com.br',
        name: 'Carlos Mendes (Gerente de Sorteios)',
        role: Role.ADMINISTRATOR,
        passwordHash: defaultPasswordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CarlosGerente',
        phone: '(21) 99888-1122',
        cpfHash: hashCpf(cleanCpf(gestor2Cpf)),
        cpfEncrypted: encryptCpf(cleanCpf(gestor2Cpf)),
        cpfMasked: maskCpf(gestor2Cpf),
        isCpfValidated: true,
        address: {
          create: {
            cep: '22041001',
            logradouro: 'Avenida Atlântica',
            numero: '1500',
            bairro: 'Copacabana',
            cidade: 'Rio de Janeiro',
            estado: 'RJ',
          },
        },
      },
    });
  }

  // ── 2. PARTICIPANTES (120 USUÁRIOS ÚNICOS) ────────────────────────────────
  console.log('👥 2. Criando/Atualizando 120 Participantes com perfil completo...');
  const TOTAL_PARTICIPANTS = 120;
  const participantUsers: any[] = [];

  for (let i = 1; i <= TOTAL_PARTICIPANTS; i++) {
    const fn = firstNames[(i - 1) % firstNames.length];
    const ln1 = lastNames[(i * 3) % lastNames.length];
    const ln2 = lastNames[(i * 7) % lastNames.length];
    const fullName = `${fn} ${ln1} ${ln2}`;
    const email = `participante${String(i).padStart(3, '0')}@sorteioclub.com.br`;
    const cpf = generateValidCpf(i);
    const cInfo = cities[i % cities.length];

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: defaultPasswordHash,
        name: fullName,
        isCpfValidated: true,
      },
      create: {
        email,
        name: fullName,
        role: Role.PARTICIPANT,
        passwordHash: defaultPasswordHash,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        phone: `(${11 + (i % 88)}) 9${String(1000 + i).slice(0, 4)}-${String(5000 + i).slice(0, 4)}`,
        cpfHash: hashCpf(cpf),
        cpfEncrypted: encryptCpf(cpf),
        cpfMasked: maskCpf(cpf),
        isCpfValidated: true,
        address: {
          create: {
            cep: cInfo.cep,
            logradouro: cInfo.logradouro,
            numero: String(10 + (i * 7) % 990),
            bairro: cInfo.bairro,
            cidade: cInfo.cidade,
            estado: cInfo.estado,
          },
        },
      },
    });

    participantUsers.push(user);
  }
  console.log(`✅ ${participantUsers.length} participantes prontos no banco!`);

  // ── 3. GRUPOS FECHADOS (5 GRUPOS TEMÁTICOS) ───────────────────────────────
  console.log('\n🏢 3. Criando 5 Grupos Fechados Temáticos...');

  const groupsData = [
    {
      name: 'Comunidade VIP SorteioClub',
      description: 'Grupo fechado oficial com todos os membros e os maiores sorteios da plataforma.',
      managerId: gestor.id,
      memberCount: 120, // Todos os 120
    },
    {
      name: 'Tech & Gamers Club',
      description: 'Grupo exclusivo focado em gadgets, consoles, computadores e tecnologia de ponta.',
      managerId: superAdmin.id,
      memberCount: 85,
    },
    {
      name: 'Experiências & Estilo de Vida',
      description: 'Sorteios de viagens internacionais, resorts e pacotes turísticos completos.',
      managerId: gestor.id,
      memberCount: 70,
    },
    {
      name: 'Clube Automotivo & Motores',
      description: 'Grupo dedicado aos apaixonados por carros 0km, motos esportivas e mobilidade elétrica.',
      managerId: gestor2.id,
      memberCount: 60,
    },
    {
      name: 'Investidores & Empreendedores',
      description: 'Prêmios expressivos em dinheiro vivo, aportes e transferências Pix instantâneas.',
      managerId: gestor2.id,
      memberCount: 50,
    },
  ];

  const seededGroups: any[] = [];

  for (const gDef of groupsData) {
    let group = await prisma.group.findFirst({ where: { name: gDef.name } });
    if (!group) {
      group = await prisma.group.create({
        data: {
          name: gDef.name,
          description: gDef.description,
          managerId: gDef.managerId,
          status: GroupStatus.ATIVO,
          autoApprove: true,
          maxMembers: 1000,
        },
      });
    }
    seededGroups.push({ group, memberCount: gDef.memberCount });

    // Vincula participantes a este grupo
    const membersToInclude = participantUsers.slice(0, gDef.memberCount);
    for (const p of membersToInclude) {
      await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: p.id,
          },
        },
        update: { status: MembershipStatus.ATIVO },
        create: {
          groupId: group.id,
          userId: p.id,
          status: MembershipStatus.ATIVO,
          joinedAt: pastDate(Math.floor(Math.random() * 30) + 1),
        },
      });
    }
    console.log(`   ✓ Grupo "${gDef.name}": ${membersToInclude.length} membros vinculados.`);
  }

  const [groupMain, groupTech, groupExperience, groupAuto, groupMoney] = seededGroups.map(
    (sg) => sg.group
  );

  // ── 4. CONVITES DE GRUPOS (PARA RELATÓRIO DE CONVITES) ────────────────────
  console.log('\n🎟️ 4. Gerando Convites de Grupos (Ativos e Histórico)...');
  const invitationsData = [
    { group: groupMain, token: 'VIP-NACIONAL-2026', type: InvitationType.TOKEN_LINK, maxUses: 500, currentUses: 120 },
    { group: groupMain, token: 'QR-COMUNIDADE-VIP', type: InvitationType.QR_CODE, maxUses: 200, currentUses: 85 },
    { group: groupTech, token: 'TECH-GAMERS-PASS', type: InvitationType.TOKEN_LINK, maxUses: 150, currentUses: 85 },
    { group: groupTech, token: 'QR-TECH-SUMMIT', type: InvitationType.QR_CODE, maxUses: 100, currentUses: 45 },
    { group: groupExperience, token: 'EXPERIENCE-TRAVEL', type: InvitationType.TOKEN_LINK, maxUses: 100, currentUses: 70 },
    { group: groupExperience, token: 'QR-RESORT-VIP', type: InvitationType.QR_CODE, maxUses: 50, currentUses: 28 },
    { group: groupAuto, token: 'AUTO-CLUB-CONVITE', type: InvitationType.TOKEN_LINK, maxUses: 100, currentUses: 60 },
    { group: groupMoney, token: 'INVESTIDORES-PIX', type: InvitationType.TOKEN_LINK, maxUses: 80, currentUses: 50 },
    { group: groupMain, token: 'PROMO-EXPIRADA-01', type: InvitationType.TOKEN_LINK, maxUses: 50, currentUses: 50, isRevoked: true },
    { group: groupTech, token: 'TOKEN-REVOGADO-02', type: InvitationType.TOKEN_LINK, maxUses: 30, currentUses: 12, isRevoked: true },
  ];

  for (const inv of invitationsData) {
    const existingInv = await prisma.groupInvitation.findUnique({ where: { token: inv.token } });
    if (!existingInv) {
      await prisma.groupInvitation.create({
        data: {
          groupId: inv.group.id,
          token: inv.token,
          type: inv.type,
          maxUses: inv.maxUses,
          currentUses: inv.currentUses,
          isRevoked: inv.isRevoked || false,
          expiresAt: futureDate(60),
          createdById: inv.group.managerId,
        },
      });
    }
  }
  console.log(`✅ ${invitationsData.length} convites configurados!`);

  // ── 5. CRIAÇÃO DOS 10 SORTEIOS OFICIAIS ───────────────────────────────────
  console.log('\n🎁 5. Criando os 10 Sorteios Oficiais com Bilhetes...');

  const rafflesDefinitions = [
    // 1. SORTEIO GERAL: COM TODOS OS 120 PARTICIPANTES
    {
      index: 1,
      group: groupMain,
      title: 'Grande Sorteio Anual: Carro 0KM ou Pix de R$ 100.000',
      description: 'O maior sorteio do ano no SorteioClub! Todos os membros ativos concorrem ao prêmio principal com auditoria completa.',
      prize: 'Carro 0KM Elétrico ou Pix de R$ 100.000 na Conta',
      rules: '1. Válido para todos os membros ativos da Comunidade VIP.\n2. Bilhete numerado e emitido pelo motor criptográfico.\n3. Apuração ao vivo com semente SHA-256.',
      winnerInstructions: 'O ganhador será contatado pela diretoria para escolha do carro ou transferência imediata via Pix.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 120, // TODOS OS 120!
      ticketPrefix: 100000,
      start: pastDate(5),
      end: futureDate(25),
      drawDate: futureDate(26),
      createdById: gestor.id,
    },
    // 2. IPHONE 16 PRO MAX
    {
      index: 2,
      group: groupTech,
      title: 'Sorteio Tech: iPhone 16 Pro Max 512GB Titânio',
      description: 'Concorra ao novo iPhone 16 Pro Max com tela Super Retina XDR e acabamento em titânio aeroespacial.',
      prize: 'Apple iPhone 16 Pro Max 512GB Titânio Preto',
      rules: '1. Inscrição com CPF validado.\n2. 1 bilhete único por membro.',
      winnerInstructions: 'Envio por transportadora com seguro total em até 3 dias úteis.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 75,
      ticketPrefix: 200000,
      start: pastDate(3),
      end: futureDate(12),
      drawDate: futureDate(13),
      createdById: superAdmin.id,
    },
    // 3. PLAYSTATION 5 PRO
    {
      index: 3,
      group: groupTech,
      title: 'Sorteio Gamer: PlayStation 5 Pro 2TB + 2 Controles',
      description: 'O console mais poderoso da nova geração com 2TB de armazenamento ultrarrápido e resolução 4K a 120fps.',
      prize: 'PlayStation 5 Pro 2TB + 2 Controles DualSense + 3 Jogos',
      rules: '1. Exclusivo para membros do grupo Tech & Gamers.\n2. Sorteio criptograficamente auditável.',
      winnerInstructions: 'Retirada ou envio com nota fiscal em nome do contemplado.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 60,
      ticketPrefix: 300000,
      start: pastDate(2),
      end: futureDate(8),
      drawDate: futureDate(9),
      createdById: superAdmin.id,
    },
    // 4. MACBOOK PRO M3
    {
      index: 4,
      group: groupTech,
      title: 'Estação de Trabalho: MacBook Pro 16" M3 Max 36GB',
      description: 'Desempenho profissional para desenvolvedores, designers e criadores no ecossistema Apple.',
      prize: 'MacBook Pro 16 polegadas Chip M3 Max 36GB RAM 1TB SSD',
      rules: '1. Participação com bilhete gerado pelo sistema.\n2. Sorteio realizado em bloco imutável.',
      winnerInstructions: 'Entrega física ou transferência do valor correspondente.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 45,
      ticketPrefix: 400000,
      start: pastDate(4),
      end: futureDate(15),
      drawDate: futureDate(16),
      createdById: superAdmin.id,
    },
    // 5. SMART TV OLED 65
    {
      index: 5,
      group: groupMain,
      title: 'Cinema em Casa: Smart TV LG OLED 65" 4K 120Hz',
      description: 'Qualidade de imagem inigualável com pretos perfeitos e contraste infinito para sua sala.',
      prize: 'Smart TV LG OLED evo 65 polegadas 4K Cinema Series',
      rules: '1. Aberto a todos os inscritos com CPF regular.\n2. Apuração auditada via sistema.',
      winnerInstructions: 'Instalação e frete grátis para todo o território nacional.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 80,
      ticketPrefix: 500000,
      start: pastDate(1),
      end: futureDate(10),
      drawDate: futureDate(11),
      createdById: gestor.id,
    },
    // 6. VIAGEM PARA FERNANDO DE NORONHA
    {
      index: 6,
      group: groupExperience,
      title: 'Experiência VIP: Viagem para Fernando de Noronha (Casal)',
      description: '7 dias no paraíso com passagens aéreas executivas, hospedagem em pousada de luxo e passeios inclusos.',
      prize: 'Pacote VIP para 2 pessoas em Fernando de Noronha (Tudo Pago)',
      rules: '1. Válido para maiores de 18 anos.\n2. Data de embarque flexível para o ano corrente.',
      winnerInstructions: 'Voucher emitido pela agência de turismo parceira.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 70,
      ticketPrefix: 600000,
      start: pastDate(7),
      end: futureDate(18),
      drawDate: futureDate(19),
      createdById: gestor.id,
    },
    // 7. SCOOTER ELÉTRICA BMW
    {
      index: 7,
      group: groupAuto,
      title: 'Mobilidade Urbana: Scooter Elétrica BMW CE 04 2026',
      description: 'O futuro sobre duas rodas. 100% elétrica, conectividade avançada e design futurista.',
      prize: 'Scooter BMW CE 04 0KM Emplacada e com Seguro de 1 Ano',
      rules: '1. Bilhete oficial gerado pelo motor SorteioClub.\n2. Custos de transferência inclusos.',
      winnerInstructions: 'Retirada na concessionária autorizada mais próxima.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 55,
      ticketPrefix: 700000,
      start: pastDate(6),
      end: futureDate(21),
      drawDate: futureDate(22),
      createdById: gestor2.id,
    },
    // 8. PIX INSTANTÂNEO R$ 10.000
    {
      index: 8,
      group: groupMoney,
      title: 'Pix na Conta: R$ 10.000 Instantâneo',
      description: 'Dinheiro na mão para usar como quiser. Transferência direta via Pix após a apuração.',
      prize: 'R$ 10.000 via Pix Imediato',
      rules: '1. O Pix será enviado à chave de titularidade do CPF vencedor.\n2. Prova de pagamento registrada em auditoria.',
      winnerInstructions: 'Confirmação da chave Pix pelo painel do usuário contemplado.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 50,
      ticketPrefix: 800000,
      start: pastDate(2),
      end: futureDate(5),
      drawDate: futureDate(6),
      createdById: gestor2.id,
    },
    // 9. NINTENDO SWITCH OLED (SORTEIO JÁ REALIZADO COM GANHADOR AUDITADO)
    {
      index: 9,
      group: groupTech,
      title: 'Sorteio Realizado: Nintendo Switch OLED Mario Red Edition',
      description: 'Sorteio concluído com apuração auditada e evidência criptográfica registrada no sistema.',
      prize: 'Console Nintendo Switch OLED Mario Red + 3 Jogos Físicos',
      rules: '1. Sorteio auditado pelo motor SHA-256.\n2. Semente criptográfica disponibilizada publicamente.',
      winnerInstructions: 'Prêmio entregue e confirmado pelo ganhador com sucesso.',
      status: RaffleStatus.DRAWN,
      participantCount: 70,
      ticketPrefix: 900000,
      start: pastDate(20),
      end: pastDate(2),
      drawDate: pastDate(1),
      createdById: superAdmin.id,
    },
    // 10. DRONE DJI MINI 4 PRO
    {
      index: 10,
      group: groupTech,
      title: 'Captação Aérea: Drone DJI Mini 4 Pro Fly More Combo Plus',
      description: 'Grave vídeos em 4K HDR vertical e horizontal com detecção de obstáculos omnidirecional.',
      prize: 'Drone DJI Mini 4 Pro Fly More Combo Plus com 3 Baterias',
      rules: '1. 1 participação por membro.\n2. Bilhete oficial gerado pelo SorteioClub.',
      winnerInstructions: 'Envio com código de rastreamento imediato.',
      status: RaffleStatus.PUBLISHED,
      participantCount: 50,
      ticketPrefix: 1000000,
      start: pastDate(3),
      end: futureDate(14),
      drawDate: futureDate(15),
      createdById: superAdmin.id,
    },
  ];

  for (const def of rafflesDefinitions) {
    console.log(`   🎟️ Sorteio ${def.index}/10: "${def.title}"...`);

    let raffle = await prisma.raffle.findFirst({
      where: {
        groupId: def.group.id,
        title: def.title,
      },
    });

    if (!raffle) {
      raffle = await prisma.raffle.create({
        data: {
          groupId: def.group.id,
          title: def.title,
          description: def.description,
          prize: def.prize,
          rules: def.rules,
          winnerInstructions: def.winnerInstructions,
          visibility: RaffleVisibility.RESTRITO_A_GRUPO,
          status: def.status,
          numberOfWinners: 1,
          maxEntriesPerPerson: 1,
          participationStartDate: def.start,
          participationEndDate: def.end,
          drawDateTime: def.drawDate,
          createdById: def.createdById,
        },
      });
    }

    // Garante que os membros do sorteio também são membros do grupo
    let selectedParticipants: any[] = [];
    if (def.participantCount >= TOTAL_PARTICIPANTS) {
      selectedParticipants = participantUsers;
    } else {
      const offset = (def.index * 13) % TOTAL_PARTICIPANTS;
      for (let k = 0; k < def.participantCount; k++) {
        const pIndex = (offset + k) % TOTAL_PARTICIPANTS;
        selectedParticipants.push(participantUsers[pIndex]);
      }
    }

    // Cadastra membros no grupo caso ainda não estejam
    for (const p of selectedParticipants) {
      await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: def.group.id,
            userId: p.id,
          },
        },
        update: { status: MembershipStatus.ATIVO },
        create: {
          groupId: def.group.id,
          userId: p.id,
          status: MembershipStatus.ATIVO,
          joinedAt: pastDate(20),
        },
      });
    }

    // Cadastra cada participante com seu NÚMERO GERADO PELO SISTEMA
    let ticketCounter = 1;
    for (const p of selectedParticipants) {
      const ticketNumber = String(def.ticketPrefix + ticketCounter);
      const formattedTicketCode = `Nº ${ticketNumber}`;

      await prisma.raffleParticipant.upsert({
        where: {
          raffleId_userId: {
            raffleId: raffle.id,
            userId: p.id,
          },
        },
        update: {
          ticketCode: formattedTicketCode,
        },
        create: {
          raffleId: raffle.id,
          userId: p.id,
          ticketCode: formattedTicketCode,
          confirmedAt: pastDate(Math.max(1, 15 - (ticketCounter % 14))),
        },
      });

      ticketCounter++;
    }

    // Se for o Sorteio 9 (DRAWN): registra apuração criptográfica auditável e ganhador
    if (def.status === RaffleStatus.DRAWN) {
      const existingDraw = await prisma.draw.findFirst({ where: { raffleId: raffle.id } });
      if (!existingDraw) {
        const winnerParticipant = selectedParticipants[6] || selectedParticipants[0];
        const eligibleIds = selectedParticipants.map((p) => p.id);
        const participantsHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(eligibleIds))
          .digest('hex');

        const drawSeed = crypto.randomBytes(32).toString('hex');

        await prisma.draw.create({
          data: {
            raffleId: raffle.id,
            executedById: def.createdById,
            totalEligible: selectedParticipants.length,
            participantsHash,
            executedAt: def.drawDate,
            evidence: {
              create: {
                seed: drawSeed,
                algorithm: 'Node.js crypto.randomInt (Auditável)',
                rawEligibleIds: JSON.stringify(eligibleIds),
                drawLog: `Sorteio executado com sucesso. Total de bilhetes: ${selectedParticipants.length}. Semente SHA-256 gerada. Contemplado rank 1: ${winnerParticipant.name}.`,
              },
            },
            winners: {
              create: [
                {
                  raffleId: raffle.id,
                  userId: winnerParticipant.id,
                  rankPosition: 1,
                  status: WinnerStatus.CONFIRMED,
                  confirmedAt: new Date(),
                  instructionsSent: 'Prêmio confirmado e entregue ao contemplado com nota fiscal.',
                },
              ],
            },
          },
        });
        console.log(`   🏆 Ganhador registrado: ${winnerParticipant.name}!`);
      }
    }
  }

  // ── 6. NOTIFICAÇÕES PARA OS USUÁRIOS ──────────────────────────────────────
  console.log('\n🔔 6. Criando Notificações para Usuários...');
  const sampleUsers = participantUsers.slice(0, 15);
  for (const u of sampleUsers) {
    const existingNotif = await prisma.notification.findFirst({ where: { userId: u.id } });
    if (!existingNotif) {
      await prisma.notification.createMany({
        data: [
          {
            userId: u.id,
            title: 'Bilhete Emitido!',
            message: 'Sua inscrição no Grande Sorteio Anual foi confirmada com sucesso.',
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            actionUrl: '/raffles',
            createdAt: pastDate(2),
          },
          {
            userId: u.id,
            title: 'Novo Sorteio Disponível!',
            message: 'O sorteio iPhone 16 Pro Max já está recebendo inscrições no Tech & Gamers Club.',
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            actionUrl: '/raffles',
            createdAt: pastDate(1),
          },
        ],
      });
    }
  }
  console.log(`✅ Notificações adicionadas aos participantes.`);

  // ── 7. TRILHA DE AUDITORIA COMPLETA (80+ LOGS PARA PAGINAÇÃO) ────────────
  console.log('\n🛡️ 7. Povoando Trilha de Auditoria (AuditLogs) com 80+ eventos...');
  const auditActions = [
    { action: 'USER_LOGIN', entity: 'User', details: 'Login efetuado com sucesso via credenciais de e-mail/senha.' },
    { action: 'CPF_VALIDATED', entity: 'User', details: 'Validação de CPF aprovada com verificação LGPD e dupla camada criptográfica.' },
    { action: 'TICKET_PURCHASED', entity: 'RaffleParticipant', details: 'Bilhete numerado emitido com hash determinístico e regras aceitas.' },
    { action: 'MEMBER_APPROVED', entity: 'GroupMember', details: 'Membro aprovado e integrado à comunidade fechada com permissão de sorteio.' },
    { action: 'RAFFLE_CREATED', entity: 'Raffle', details: 'Sorteio registrado em conformidade regulatória e vinculado ao grupo gestor.' },
    { action: 'RAFFLE_PUBLISHED', entity: 'Raffle', details: 'Sorteio publicado oficialmente e aberto para emissão de bilhetes.' },
    { action: 'USER_ROLE_UPDATED', entity: 'User', details: 'Papel administrativo atualizado na governança do sistema.' },
    { action: 'DRAW_EXECUTED', entity: 'Draw', details: 'Apuração concluída com semente determinística SHA-256 e gravação imutável.' },
  ];

  const auditLogsToCreate: any[] = [];
  for (let i = 0; i < 85; i++) {
    const act = auditActions[i % auditActions.length];
    const u = participantUsers[i % participantUsers.length];
    auditLogsToCreate.push({
      userId: i % 5 === 0 ? superAdmin.id : u.id,
      action: act.action,
      entity: act.entity,
      entityId: u.id,
      details: act.details,
      ipAddress: `189.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      createdAt: pastDate(Math.floor(i / 3) + 1),
    });
  }

  await prisma.auditLog.createMany({
    data: auditLogsToCreate,
  });
  console.log(`✅ ${auditLogsToCreate.length} eventos de auditoria registrados.`);

  // ── 8. CAMPANHAS DE E-MAIL (PARA TELA DE CAMPANHAS) ───────────────────────
  console.log('\n📧 8. Criando Campanhas de E-mail de Exemplo...');
  const campaignsData = [
    {
      group: groupMain,
      title: 'Abertura do Grande Sorteio Anual 2026',
      subject: 'Participe agora: Carro 0KM ou Pix de R$ 100.000!',
      body: 'Olá membro VIP! O maior sorteio do ano já está aberto. Garanta seu bilhete oficial com segurança.',
      status: CampaignStatus.SENT,
      sentAt: pastDate(3),
      createdById: gestor.id,
    },
    {
      group: groupTech,
      title: 'Novidade Tech: iPhone 16 Pro Max Liberado',
      subject: 'Inscrições abertas para o iPhone 16 Pro Max no Tech & Gamers',
      body: 'Seu grupo exclusivo tem um novo prêmio disponível. Acesse o painel para emitir seu bilhete.',
      status: CampaignStatus.SENT,
      sentAt: pastDate(1),
      createdById: superAdmin.id,
    },
    {
      group: groupExperience,
      title: 'Em Breve: Viagem dos Sonhos para Noronha',
      subject: 'Prepare as malas! Novo sorteio de viagem internacional',
      body: 'Faltam poucos dias para a grande viagem. Confira as datas e regulamento oficial.',
      status: CampaignStatus.DRAFT,
      createdById: gestor.id,
    },
  ];

  for (const c of campaignsData) {
    const existingCamp = await prisma.emailCampaign.findFirst({ where: { title: c.title } });
    if (!existingCamp) {
      await prisma.emailCampaign.create({
        data: {
          groupId: c.group.id,
          title: c.title,
          subject: c.subject,
          body: c.body,
          status: c.status,
          sentAt: c.sentAt,
          createdById: c.createdById,
        },
      });
    }
  }
  console.log(`✅ Campanhas de e-mail cadastradas.`);

  console.log('\n===========================================================');
  console.log('🎉 [SorteioClub Seed Completo] Concluído com Sucesso Total!');
  console.log('===========================================================');
  console.log('• Total de Usuários: 123 (1 Super Admin, 2 Gestores, 120 Participantes)');
  console.log('• Total de Grupos: 5 Grupos Fechados Temáticos com membros');
  console.log('• Total de Sorteios: 10 Sorteios Oficiais com bilhetes numerados');
  console.log('• Sorteio #1: Com TODOS os 120 participantes inscritos');
  console.log('• Convites: 10 convites emitidos para testar relatórios');
  console.log('• Auditoria: 85+ eventos registrados com suporte a paginação');
  console.log('• Campanhas: 3 campanhas de e-mail registradas');
  console.log('• Credenciais:');
  console.log('    Super Admin: admin@sorteioclub.com.br / Senha@123');
  console.log('    Gestor VIP:  gestor@empresa.com.br / Senha@123');
  console.log('    Gestor Auto: carlos.gerente@sorteioclub.com.br / Senha@123');
  console.log('    Participantes: participante001@sorteioclub.com.br a participante120@sorteioclub.com.br / Senha@123');
  console.log('===========================================================');
}

main()
  .catch((e) => {
    console.error('❌ [SorteioClub Seed] Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
