import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { workerClient } from '@/lib/worker-client';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const accountId = searchParams.get('accountId');
    const cursor    = searchParams.get('cursor') ?? undefined;
    const search    = searchParams.get('search');
    const filter    = searchParams.get('filter');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const account = await prisma.linkedInAccount.findFirst({
      where: { id: accountId, userId: session.user.id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const paginatedChats = await workerClient.listChats(account.unipileAccountId, cursor);

    // Upsert contacts & conversations into the local DB cache
    for (const chat of paginatedChats.items) {
      const upsertedContactIds = new Map<string, string>();

      for (const participant of chat.participants) {
        const upserted = await prisma.contact.upsert({
          where: { unipileId_accountId: { unipileId: participant.id, accountId: account.id } },
          update: {
            name:       participant.name,
            headline:   participant.headline,
            avatarUrl:  participant.avatarUrl,
            profileUrl: participant.profileUrl,
          },
          create: {
            unipileId:  participant.id,
            accountId:  account.id,
            name:       participant.name,
            headline:   participant.headline,
            avatarUrl:  participant.avatarUrl,
            profileUrl: participant.profileUrl,
          }
        });
        upsertedContactIds.set(participant.id, upserted.id);
      }

      const primary = chat.participants.find(p => p.id !== account.unipileAccountId)
                   ?? chat.participants[0];

      await prisma.conversation.upsert({
        where: { unipileChatId: chat.id },
        update: {
          unreadCount:     chat.unreadCount,
          lastMessageAt:   chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : undefined,
          lastMessageText: chat.lastMessage?.text ?? null,
        },
        create: {
          unipileChatId:   chat.id,
          accountId:       account.id,
          contactId:       primary ? (upsertedContactIds.get(primary.id) ?? null) : null,
          unreadCount:     chat.unreadCount,
          lastMessageAt:   chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : new Date(),
          lastMessageText: chat.lastMessage?.text ?? null,
        }
      });
    }

    let displayChats = paginatedChats.items;

    if (filter === 'unread') {
      displayChats = displayChats.filter(c => c.unreadCount > 0);
    }

    if (search) {
      const s = search.toLowerCase();
      displayChats = displayChats.filter(c =>
        (c.lastMessage?.text ?? '').toLowerCase().includes(s) ||
        c.participants.some(p => p.name.toLowerCase().includes(s))
      );
    }

    return NextResponse.json({
      conversations: displayChats,
      nextCursor:    paginatedChats.cursor,
      hasMore:       paginatedChats.hasMore,
    });
  } catch (error: unknown) {
    const isDev = process.env.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Conversations GET] Error:', message);
    return NextResponse.json(
      { error: isDev ? message : 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
