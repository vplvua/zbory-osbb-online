import { SheetStatus } from '@prisma/client';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import VoteDraftSection from '@/components/vote/vote-draft-section';
import { getVoteSheetByToken } from '@/lib/vote/sheet';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

function renderStatusBlock(status: SheetStatus) {
  if (status === SheetStatus.PENDING_ORGANIZER) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-lg font-semibold text-emerald-800">Голос прийнято</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Дякуємо! Ваш голос прийнято. Очікуємо підпису уповноваженої особи.
        </p>
      </section>
    );
  }

  if (status === SheetStatus.SIGNED) {
    return (
      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Документ підписано</h2>
        <p className="text-sm text-neutral-700">
          Документ підписано обома сторонами. Завантаження файлів буде активовано на наступному
          етапі.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled>
            Завантажити оригінальний PDF
          </Button>
          <Button type="button" variant="secondary" disabled>
            Завантажити візуалізацію PDF
          </Button>
          <Button type="button" variant="secondary" disabled>
            Завантажити підписаний .p7s
          </Button>
        </div>
      </section>
    );
  }

  if (status === SheetStatus.EXPIRED) {
    return (
      <section className="rounded-lg border border-neutral-300 bg-neutral-100 p-4">
        <h2 className="text-lg font-semibold text-neutral-800">Термін голосування завершено</h2>
        <p className="mt-2 text-sm text-neutral-700">
          Строк для підписання листка минув. Якщо потрібно, зверніться до уповноваженої особи ОСББ.
        </p>
      </section>
    );
  }

  return null;
}

export default async function VotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sheet = await getVoteSheetByToken(token);

  if (!sheet) {
    notFound();
  }

  const protocolDate = DATE_FORMATTER.format(new Date(sheet.protocolDate));
  const surveyDate = DATE_FORMATTER.format(new Date(sheet.surveyDate));
  const expiresAtDate = DATE_FORMATTER.format(new Date(sheet.expiresAt));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{sheet.osbbName}</h1>
        <p className="text-sm text-neutral-700">
          Протокол №{sheet.protocolNumber} від {protocolDate}
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Ваші дані</h2>
        <div className="mt-3 space-y-1 text-sm text-neutral-800">
          <p>ПІБ: {sheet.owner.fullName}</p>
          <p>Квартира: {sheet.owner.apartmentNumber}</p>
          <p>
            Площа: {sheet.owner.ownedArea} м² (частка: {sheet.owner.ownershipNumerator}/
            {sheet.owner.ownershipDenominator})
          </p>
          <p>Дата опитування: {surveyDate}</p>
          <p>Дедлайн: {expiresAtDate}</p>
        </div>
      </section>

      {sheet.effectiveStatus === SheetStatus.DRAFT ? (
        <VoteDraftSection
          createdAt={sheet.createdAt}
          expiresAt={sheet.expiresAt}
          questions={sheet.questions}
          initiallyExpired={new Date(sheet.expiresAt) <= new Date()}
        />
      ) : (
        renderStatusBlock(sheet.effectiveStatus)
      )}

      {sheet.effectiveStatus !== SheetStatus.DRAFT ? (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Питання голосування</h2>
          {sheet.questions.map((question) => (
            <article key={question.id} className="rounded-md border border-neutral-200 p-3">
              <p className="text-sm text-neutral-600">Питання №{question.orderNumber}</p>
              <h3 className="mt-1 text-base font-medium">{question.text}</h3>
              <p className="mt-2 text-sm text-neutral-700">Пропозиція: {question.proposal}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
