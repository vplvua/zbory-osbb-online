import { SheetStatus } from '@prisma/client';
import { notFound } from 'next/navigation';
import VoteDraftSection from '@/components/vote/vote-draft-section';
import { getVoteSheetByToken } from '@/lib/vote/sheet';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

function renderStatusBlock(
  status: SheetStatus,
  token: string,
  options: {
    pdfUploadPending: boolean;
    errorPending: boolean;
    hasPdfFile: boolean;
  },
) {
  if (status === SheetStatus.PENDING_ORGANIZER) {
    return (
      <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div>
          <h2 className="text-lg font-semibold text-emerald-800">Голос прийнято</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Дякуємо! Ваш голос прийнято. Очікуємо підпису уповноваженої особи.
          </p>
        </div>

        {options.pdfUploadPending ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Формуємо PDF листка. Завантаження буде доступне після завершення обробки.
          </p>
        ) : null}

        {options.errorPending ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Сталася помилка під час підготовки PDF. Уповноважена особа може запустити повторну
            обробку в кабінеті ОСББ.
          </p>
        ) : null}
      </section>
    );
  }

  if (status === SheetStatus.SIGNED) {
    const baseDownloadPath = `/api/vote/${token}/downloads`;

    return (
      <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Документ підписано</h2>
        <p className="text-foreground/80 text-sm">
          Документ підписано обома сторонами. Можна завантажити підписані матеріали.
        </p>
        {options.pdfUploadPending ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            PDF ще формується. Спробуйте завантажити файли трохи пізніше.
          </p>
        ) : null}
        {options.errorPending ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Підготовка PDF завершилась з помилкою. Уповноважена особа може повторити обробку в
            кабінеті ОСББ.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {options.hasPdfFile ? (
            <a
              href={`${baseDownloadPath}/original`}
              className="border-border bg-surface hover:bg-surface-muted inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold"
            >
              Завантажити оригінальний PDF
            </a>
          ) : (
            <span className="text-muted-foreground inline-flex h-10 items-center text-sm">
              Оригінальний PDF ще недоступний
            </span>
          )}
          {options.hasPdfFile ? (
            <a
              href={`${baseDownloadPath}/visualization`}
              className="border-border bg-surface hover:bg-surface-muted inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold"
            >
              Завантажити PDF візуалізації
            </a>
          ) : null}
          <a
            href={`${baseDownloadPath}/signed`}
            className="border-border bg-surface hover:bg-surface-muted inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold"
          >
            Завантажити підписаний .p7s
          </a>
        </div>
      </section>
    );
  }

  if (status === SheetStatus.EXPIRED) {
    return (
      <section className="border-border bg-surface-muted rounded-lg border p-4">
        <h2 className="text-foreground text-lg font-semibold">Термін голосування завершено</h2>
        <p className="text-foreground/80 mt-2 text-sm">
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
        <p className="text-foreground/80 text-sm">
          Протокол №{sheet.protocolNumber} від {protocolDate}
        </p>
      </header>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Ваші дані</h2>
        <div className="text-foreground mt-3 space-y-1 text-sm">
          <p>Співвласник: {sheet.owner.shortName}</p>
          <p>Квартира: {sheet.owner.apartmentNumber}</p>
          <p>
            Площа: {sheet.owner.ownedArea} м² (частка: {sheet.owner.ownershipNumerator}/
            {sheet.owner.ownershipDenominator})
          </p>
          <p>Дата опитування: {surveyDate}</p>
          <p>Підписати до: {expiresAtDate}</p>
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
        renderStatusBlock(sheet.effectiveStatus, token, {
          pdfUploadPending: sheet.pdfUploadPending,
          errorPending: sheet.errorPending,
          hasPdfFile: sheet.hasPdfFile,
        })
      )}

      {sheet.effectiveStatus !== SheetStatus.DRAFT ? (
        <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Питання голосування</h2>
          {sheet.questions.map((question) => (
            <article key={question.id} className="border-border rounded-md border p-3">
              <p className="text-muted-foreground text-sm">Питання №{question.orderNumber}</p>
              <h3 className="mt-1 text-base font-medium">{question.text}</h3>
              <p className="text-foreground/80 mt-2 text-sm">Пропозиція: {question.proposal}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
