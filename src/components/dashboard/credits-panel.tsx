"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PACKS = [
  { id: "pack_5", label: "5 créditos", price: "$4.999" },
  { id: "pack_15", label: "15 créditos", price: "$12.999" },
  { id: "pack_40", label: "40 créditos", price: "$29.999" },
] as const;

export function CreditsPanel() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => res.json())
      .then((data) => setBalance(data.balance))
      .catch(() => setError("No se pudo cargar el balance de créditos"));
  }, []);

  async function buyPack(packId: string) {
    setLoadingPack(packId);
    setError(null);
    try {
      const res = await fetch("/api/payments/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) throw new Error("No se pudo iniciar el pago");
      const data = await res.json();
      window.location.assign(data.initPoint);
    } catch {
      setError("No se pudo iniciar el pago. Intentá de nuevo.");
      setLoadingPack(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créditos</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-sm">
            {balance === null ? "…" : balance}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {PACKS.map((pack) => (
          <Button
            key={pack.id}
            variant="outline"
            className="justify-between"
            onClick={() => buyPack(pack.id)}
            disabled={loadingPack !== null}
          >
            <span>{pack.label}</span>
            <span className="text-muted-foreground">
              {loadingPack === pack.id ? "Redirigiendo…" : pack.price}
            </span>
          </Button>
        ))}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
