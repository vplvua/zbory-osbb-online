import { SheetStatus, Vote } from '@prisma/client';
import { notFound } from 'next/navigation';
import { ErrorAlert } from '@/components/ui/error-alert';
import VoteStatusRefreshButton from '@/components/vote/vote-status-refresh-button';
import VoteDownloadActions from '@/components/vote/vote-download-actions';
import VoteDraftSection from '@/components/vote/vote-draft-section';
import { getVoteSheetByToken } from '@/lib/vote/sheet';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function VoteChoiceBadge({ vote }: { vote: Vote | null }) {
  if (vote === null) {
    return (
      <span className="border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium">
        <span className="bg-muted-foreground/50 h-2 w-2 rounded-full" />
        Не вказано
      </span>
    );
  }

  const isFor = vote === 'FOR';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isFor ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isFor ? 'bg-emerald-600' : 'bg-red-600'}`} />
      {isFor ? 'За' : 'Проти'}
    </span>
  );
}

function renderStatusBlock(
  status: SheetStatus,
  token: string,
  options: {
    pdfUploadPending: boolean;
    errorPending: boolean;
    hasPdfFile: boolean;
    ownerSignedAt: string | null;
    organizerSignedAt: string | null;
    dubidocSignPending: boolean;
    dubidocLastError: string | null;
    hasDubidocDocument: boolean;
  },
) {
  const baseDownloadPath = `/api/vote/${token}/downloads`;
  const ownerSignedAtLabel = options.ownerSignedAt
    ? DATE_TIME_FORMATTER.format(new Date(options.ownerSignedAt))
    : null;
  const organizerSignedAtLabel = options.organizerSignedAt
    ? DATE_TIME_FORMATTER.format(new Date(options.organizerSignedAt))
    : null;

  if (status === SheetStatus.PENDING_ORGANIZER) {
    return (
      <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div>
          <h2 className="text-lg font-semibold text-emerald-800">Голос прийнято</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Дякуємо! Ваш голос прийнято. Очікуємо підпису уповноваженої особи.
          </p>
          {ownerSignedAtLabel ? (
            <p className="mt-2 text-sm font-medium text-emerald-900">
              Голос прийнято: {ownerSignedAtLabel}
            </p>
          ) : null}
        </div>

        {options.pdfUploadPending ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Формуємо PDF листка. Завантаження буде доступне після завершення обробки.
          </p>
        ) : null}

        {options.errorPending ? (
          <ErrorAlert>
            Сталася помилка під час підготовки PDF. Уповноважена особа може запустити повторну
            обробку в кабінеті ОСББ.
          </ErrorAlert>
        ) : null}
        {options.dubidocSignPending ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Готуємо сеанс підписання в Dubidoc. Оновіть сторінку через кілька секунд.
          </p>
        ) : null}
        {options.dubidocLastError ? <ErrorAlert>{options.dubidocLastError}</ErrorAlert> : null}
        <div className="flex flex-wrap items-center gap-2">
          {options.hasDubidocDocument ? (
            <VoteStatusRefreshButton token={token} className="h-8 px-3 text-xs font-semibold" />
          ) : null}
          <VoteDownloadActions
            baseDownloadPath={baseDownloadPath}
            hasPdfFile={options.hasPdfFile}
            hasDubidocDocument={options.hasDubidocDocument}
            isSigned={false}
          />
        </div>
      </section>
    );
  }

  if (status === SheetStatus.SIGNED) {
    return (
      <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Документ підписано</h2>
        <p className="text-foreground/80 text-sm">
          Документ підписано обома сторонами. Можна завантажити підписані матеріали.
        </p>
        <div className="space-y-1 text-sm">
          {ownerSignedAtLabel ? (
            <p className="text-muted-foreground">
              Голос прийнято:{' '}
              <span className="text-foreground font-medium">{ownerSignedAtLabel}</span>
            </p>
          ) : null}
          {organizerSignedAtLabel ? (
            <p className="text-muted-foreground">
              Остаточно підписано:{' '}
              <span className="text-foreground font-medium">{organizerSignedAtLabel}</span>
            </p>
          ) : null}
        </div>
        {options.pdfUploadPending ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            PDF ще формується. Спробуйте завантажити файли трохи пізніше.
          </p>
        ) : null}
        {options.errorPending ? (
          <ErrorAlert>
            Підготовка PDF завершилась з помилкою. Уповноважена особа може повторити обробку в
            кабінеті ОСББ.
          </ErrorAlert>
        ) : null}
        {options.dubidocLastError ? <ErrorAlert>{options.dubidocLastError}</ErrorAlert> : null}
        <VoteDownloadActions
          baseDownloadPath={baseDownloadPath}
          hasPdfFile={options.hasPdfFile}
          hasDubidocDocument={options.hasDubidocDocument}
          isSigned
        />
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
        <>
          {sheet.dubidocSignPending ? (
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Готуємо сеанс підписання в Dubidoc. Оновіть сторінку через кілька секунд.
            </p>
          ) : null}
          {sheet.dubidocLastError ? <ErrorAlert>{sheet.dubidocLastError}</ErrorAlert> : null}
          {sheet.hasDubidocDocument ? (
            <VoteStatusRefreshButton token={token} className="h-8 px-3 text-xs font-semibold" />
          ) : null}
          <VoteDraftSection
            token={token}
            createdAt={sheet.createdAt}
            expiresAt={sheet.expiresAt}
            initialNow={new Date().toISOString()}
            questions={sheet.questions}
            initiallyExpired={new Date(sheet.expiresAt) <= new Date()}
          />
        </>
      ) : (
        renderStatusBlock(sheet.effectiveStatus, token, {
          pdfUploadPending: sheet.pdfUploadPending,
          errorPending: sheet.errorPending,
          hasPdfFile: sheet.hasPdfFile,
          ownerSignedAt: sheet.ownerSignedAt,
          organizerSignedAt: sheet.organizerSignedAt,
          dubidocSignPending: sheet.dubidocSignPending,
          dubidocLastError: sheet.dubidocLastError,
          hasDubidocDocument: sheet.hasDubidocDocument,
        })
      )}

      {sheet.effectiveStatus !== SheetStatus.DRAFT ? (
        <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Питання голосування</h2>
          {sheet.questions.map((question) => (
            <article key={question.id} className="border-border rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground text-sm">Питання №{question.orderNumber}</p>
                <VoteChoiceBadge vote={question.vote} />
              </div>
              <h3 className="mt-1 text-base font-medium">{question.text}</h3>
              <p className="text-foreground/80 mt-2 text-sm">Пропозиція: {question.proposal}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
