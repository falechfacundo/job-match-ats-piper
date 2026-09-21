import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cvMasterSchema } from "@/lib/cv/schema";
import { CreditsPanel } from "@/components/dashboard/credits-panel";
import { JobWorkflow } from "@/components/dashboard/job-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user!.id },
    select: { cvMaster: true },
  });

  const cvMasterReady = cvMasterSchema.safeParse(user.cvMaster).success;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="flex flex-col gap-6 md:col-span-2">
        {!cvMasterReady && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm">
                Completá tu CV Master antes de generar un CV adaptado a una oferta.
              </p>
              <Button size="sm" render={<Link href="/dashboard/cv-master">Completar CV Master</Link>} />
            </CardContent>
          </Card>
        )}

        <div>
          <h1 className="mb-3 text-lg font-semibold">Ofertas de trabajo</h1>
          <JobWorkflow />
        </div>
      </div>

      <div>
        <CreditsPanel />
      </div>
    </div>
  );
}
