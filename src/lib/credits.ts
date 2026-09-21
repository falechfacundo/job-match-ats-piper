import { Prisma, CreditTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class InsufficientCreditsError extends Error {
  constructor(userId: string, requested: number) {
    super(`User ${userId} does not have ${requested} credit(s) available`);
    this.name = "InsufficientCreditsError";
  }
}

type PrismaClientOrTx = Prisma.TransactionClient | typeof prisma;

/**
 * Atomically debits `amount` credits from a user.
 *
 * Race-condition safety: the decrement is a single conditional UPDATE
 * (`WHERE id = ? AND credits >= ?`). Postgres row locking during that
 * UPDATE serializes concurrent debits on the same row, so two simultaneous
 * calls can never both succeed when only one `amount` worth of balance is
 * left — the loser's updateMany affects 0 rows and throws, no CAS retry
 * loop needed.
 */
export async function consumeCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  relatedGenerationId?: string;
}) {
  const { userId, amount, reason, relatedGenerationId } = params;
  if (amount <= 0) {
    throw new Error("consumeCredits amount must be positive");
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });

    if (result.count === 0) {
      throw new InsufficientCreditsError(userId, amount);
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { credits: true },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: CreditTransactionType.CONSUMPTION,
        reason,
        relatedGenerationId,
        balanceAfter: user.credits,
      },
    });

    return { balance: user.credits, transaction };
  });
}

/**
 * Atomically credits a user's balance (purchase, refund, bonus, or manual
 * adjustment). Uses `increment` so concurrent grants never clobber each
 * other, then logs the resulting balance in the same transaction.
 */
export async function grantCredits(
  params: {
    userId: string;
    amount: number;
    type: Extract<
      CreditTransactionType,
      "PURCHASE" | "REFUND" | "BONUS" | "ADJUSTMENT"
    >;
    reason?: string;
    relatedGenerationId?: string;
    relatedPaymentId?: string;
  },
  client: PrismaClientOrTx = prisma,
) {
  const { userId, amount, type, reason, relatedGenerationId, relatedPaymentId } = params;
  if (amount <= 0) {
    throw new Error("grantCredits amount must be positive");
  }

  const run = async (tx: PrismaClientOrTx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        reason,
        relatedGenerationId,
        relatedPaymentId,
        balanceAfter: user.credits,
      },
    });

    return { balance: user.credits, transaction };
  };

  if (client === prisma) {
    return prisma.$transaction((tx) => run(tx));
  }
  return run(client);
}

export async function getCreditBalance(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { credits: true },
  });
  return user.credits;
}
