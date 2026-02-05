import VerifyForm from '@/app/verify/verify-form';

type VerifyPageProps = {
  searchParams?: { phone?: string };
};

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  const initialPhone = searchParams?.phone ?? '';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Підтвердження</h1>
        <p className="text-sm text-neutral-600">Введіть код з SMS.</p>
      </header>

      <VerifyForm initialPhone={initialPhone} />
    </main>
  );
}
