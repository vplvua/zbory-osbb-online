import { prisma } from '@/lib/db/prisma';

export type OsbbSummary = {
  id: string;
  name: string;
  shortName: string;
  address: string;
  organizerName: string | null;
};

export type SelectedOsbbResolution = {
  osbbs: OsbbSummary[];
  selectedOsbb: OsbbSummary | null;
  requiresSelection: boolean;
};

async function getUserOsbbs(userId: string): Promise<OsbbSummary[]> {
  return prisma.oSBB.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      shortName: true,
      address: true,
      organizerName: true,
    },
  });
}

export async function setSelectedOsbbForUser(userId: string, osbbId: string): Promise<void> {
  const osbb = await prisma.oSBB.findFirst({
    where: {
      id: osbbId,
      userId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!osbb) {
    throw new Error('OSBB_NOT_FOUND');
  }

  await prisma.userSettings.upsert({
    where: { userId },
    update: { selectedOsbbId: osbb.id },
    create: {
      userId,
      selectedOsbbId: osbb.id,
    },
  });
}

export async function resolveSelectedOsbb(userId: string): Promise<SelectedOsbbResolution> {
  const [osbbs, settings] = await Promise.all([
    getUserOsbbs(userId),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { selectedOsbbId: true },
    }),
  ]);

  if (osbbs.length === 0) {
    if (settings?.selectedOsbbId) {
      await prisma.userSettings.update({
        where: { userId },
        data: { selectedOsbbId: null },
      });
    }

    return {
      osbbs,
      selectedOsbb: null,
      requiresSelection: false,
    };
  }

  const selected = settings?.selectedOsbbId
    ? (osbbs.find((osbb) => osbb.id === settings.selectedOsbbId) ?? null)
    : null;

  if (selected) {
    return {
      osbbs,
      selectedOsbb: selected,
      requiresSelection: false,
    };
  }

  if (osbbs.length === 1) {
    const [single] = osbbs;
    await setSelectedOsbbForUser(userId, single.id);
    return {
      osbbs,
      selectedOsbb: single,
      requiresSelection: false,
    };
  }

  if (settings?.selectedOsbbId) {
    await prisma.userSettings.update({
      where: { userId },
      data: { selectedOsbbId: null },
    });
  }

  return {
    osbbs,
    selectedOsbb: null,
    requiresSelection: true,
  };
}
