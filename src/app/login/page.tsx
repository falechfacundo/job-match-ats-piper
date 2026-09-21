import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Continuar con Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        o
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form
        action={async (formData) => {
          "use server";
          await signIn("nodemailer", { email: formData.get("email"), redirectTo: "/dashboard" });
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="tu@email.com"
          className="rounded-md border px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Enviar link mágico
        </button>
      </form>
    </main>
  );
}
