import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotifSseService } from '../notifikasis.sse.service';
import { TipeNotifikasi, Peran } from '@prisma/client';

@Processor('notifikasi')
export class NotifProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: NotifSseService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'createNotif':
        return this.handleCreateNotif(job.data);
      case 'broadcastNotif':
        return this.handleBroadcastNotif(job.data);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async handleCreateNotif(data: {
    penggunaId: string;
    judul: string;
    pesan: string;
    tipe: string;
    payloadData?: any;
  }) {
    const { penggunaId, judul, pesan, tipe, payloadData } = data;

    // Save to database
    const notif = await this.prisma.notifikasi.create({
      data: {
        penggunaId,
        judul,
        pesan,
        tipe: tipe as TipeNotifikasi,
        data: payloadData || null,
      },
    });

    // Emit via SSE
    this.sseService.emitToUser(penggunaId, {
      id: notif.id,
      penggunaId: notif.penggunaId,
      judul: notif.judul,
      pesan: notif.pesan,
      tipe: notif.tipe,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    });

    return notif;
  }

  private async handleBroadcastNotif(data: {
    judul: string;
    pesan: string;
    target: string;
    payloadData?: any;
  }) {
    const { judul, pesan, target, payloadData } = data;

    let targetUsers: { id: string }[] = [];

    // Parse target
    if (target === 'ALL_USER') {
      targetUsers = await this.prisma.pengguna.findMany({
        where: { peran: 'KONSUMEN' },
        select: { id: true },
      });
    } else if (target === 'ALL_OPERASIONAL') {
      targetUsers = await this.prisma.pengguna.findMany({
        where: {
          peran: {
            in: ['PENJUAL', 'KURIR', 'ADMIN_CS', 'SUPER_ADMIN'],
          },
        },
        select: { id: true },
      });
    } else if (target.startsWith('ROLE:')) {
      const role = target.replace('ROLE:', '') as Peran;
      targetUsers = await this.prisma.pengguna.findMany({
        where: { peran: role },
        select: { id: true },
      });
    } else if (target.startsWith('USER:')) {
      const userId = target.replace('USER:', '');
      targetUsers = [{ id: userId }];
    }

    if (targetUsers.length === 0) {
      return { sent: 0 };
    }

    const batchedData = targetUsers.map((u) => ({
      penggunaId: u.id,
      judul,
      pesan,
      tipe: TipeNotifikasi.BROADCAST,
      data: payloadData || null,
    }));

    // Bulk create to DB
    await this.prisma.notifikasi.createMany({
      data: batchedData,
    });

    // We fetch the newly created ones to get their IDs and timestamps for the SSE payload
    // A slight optimization is just to emit the data without true ID if we don't care about ID for SSE broadcast, 
    // but ideally we send full objects. Let's send a generic event to trigger a refetch if we don't have IDs,
    // or we can just send the generated payload. Since Prisma createMany doesn't return created records, 
    // we'll just emit an event to trigger refetch, or we construct fake IDs. It's better to just emit the raw data and let client refetch or use temporary ID.
    // Actually, let's emit the payload. The client can use Date.now() as a temporary key if ID is missing.

    const ssePayload = {
      judul,
      pesan,
      tipe: TipeNotifikasi.BROADCAST,
      isRead: false,
      createdAt: new Date(),
    };

    const userIds = targetUsers.map((u) => u.id);
    this.sseService.emitToUsers(userIds, ssePayload);

    return { sent: userIds.length };
  }
}
