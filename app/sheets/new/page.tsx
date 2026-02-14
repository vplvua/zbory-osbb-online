import Link from 'next/link';
import { redirect } from 'next/navigation';
import SheetCreateForm from '@/app/sheets/_components/sheet-create-form';
import { createSheetAction } from '@/app/sheets/actions';
import SheetCreateSaveButton from '@/app/sheets/new/_components/sheet-create-save-button';
import AppHeader from '@/components/app-header';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { formatOwnerShortName } from '@/lib/owner/name';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');
const SHEET_CREATE_FORM_ID = 'sheet-create-form';

type SheetNewPageProps = {
  searchParams?: Promise<{ from?: string; fromOwnerId?: string; fromProtocolId?: string }>;
};

export default async function SheetNewPage({ searchParams }: SheetNewPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const selectedState = await resolveSelectedOsbb(session.sub);
  if (selectedState.osbbs.length === 0) {
    redirect('/osbb/new');
  }

  const selectedOsbb = selectedState.selectedOsbb;
  if (!selectedOsbb) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const navigationSourceParam = params?.from?.trim() ?? '';
  const navigationOwnerIdParam = params?.fromOwnerId?.trim() ?? '';
  const navigationProtocolIdParam = params?.fromProtocolId?.trim() ?? '';
  const navigationSource =
    navigationSourceParam === 'dashboard' ||
    navigationSourceParam === 'sheets' ||
    navigationSourceParam === 'owners' ||
    navigationSourceParam === 'protocol-edit' ||
    navigationSourceParam === 'owner-edit'
      ? navigationSourceParam
      : 'sheets';

  const sheetsListQuery = new URLSearchParams();
  if (navigationSource === 'owners') {
    sheetsListQuery.set('from', 'owners');
  }
  if (navigationSource === 'owner-edit') {
    sheetsListQuery.set('from', 'owner-edit');
    if (navigationOwnerIdParam) {
      sheetsListQuery.set('fromOwnerId', navigationOwnerIdParam);
    }
  }
  if (navigationSource === 'protocol-edit') {
    sheetsListQuery.set('from', 'protocol-edit');
    if (navigationProtocolIdParam) {
      sheetsListQuery.set('fromProtocolId', navigationProtocolIdParam);
    }
  }

  const sheetsListHref = sheetsListQuery.toString()
    ? `/sheets?${sheetsListQuery.toString()}`
    : '/sheets';
  const backLink =
    navigationSource === 'dashboard'
      ? { href: '/dashboard', label: '← Назад на головну' }
      : { href: sheetsListHref, label: '← Назад до листків опитування' };
  const sheetsNewQuery = new URLSearchParams();
  if (navigationSource !== 'sheets') {
    sheetsNewQuery.set('from', navigationSource);
  }
  if (navigationSource === 'owner-edit' && navigationOwnerIdParam) {
    sheetsNewQuery.set('fromOwnerId', navigationOwnerIdParam);
  }
  if (navigationSource === 'protocol-edit' && navigationProtocolIdParam) {
    sheetsNewQuery.set('fromProtocolId', navigationProtocolIdParam);
  }
  const currentSheetsNewHref = sheetsNewQuery.toString()
    ? `/sheets/new?${sheetsNewQuery.toString()}`
    : '/sheets/new';
  const ownersNewQuery = new URLSearchParams();
  ownersNewQuery.set('from', 'sheets-new');
  ownersNewQuery.set('returnTo', currentSheetsNewHref);
  const ownersNewHref = `/owners/new?${ownersNewQuery.toString()}`;

  const [protocols, owners] = await Promise.all([
    prisma.protocol.findMany({
      where: { osbbId: selectedOsbb.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        number: true,
        date: true,
      },
    }),
    prisma.owner.findMany({
      where: { osbbId: selectedOsbb.id },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { middleName: 'asc' },
        { apartmentNumber: 'asc' },
      ],
      select: {
        id: true,
        lastName: true,
        firstName: true,
        middleName: true,
        apartmentNumber: true,
      },
    }),
  ]);

  const defaultSurveyDate = new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb.shortName}
        containerClassName="max-w-4xl"
        actionNode={<SheetCreateSaveButton formId={SHEET_CREATE_FORM_ID} />}
        backLink={backLink}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          {protocols.length === 0 || owners.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-6">
                <p className="text-muted-foreground text-sm">
                  Для створення листка потрібні хоча б один протокол і один співвласник у вибраному
                  ОСББ.
                </p>
                <div className="flex flex-wrap gap-2">
                  {protocols.length === 0 ? (
                    <Link href="/protocols/new">
                      <Button type="button">
                        <AddIcon className="h-4 w-4" />
                        Додати протокол
                      </Button>
                    </Link>
                  ) : null}
                  {owners.length === 0 ? (
                    <Link href={ownersNewHref}>
                      <Button type="button" variant="outline">
                        <AddIcon className="h-4 w-4" />
                        Додати співвласника
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <SheetCreateForm
              action={createSheetAction}
              formId={SHEET_CREATE_FORM_ID}
              showSubmitButton={false}
              redirectTo={sheetsListHref}
              protocols={protocols.map((protocol) => ({
                id: protocol.id,
                number: protocol.number,
                dateLabel: DATE_FORMATTER.format(protocol.date),
              }))}
              owners={owners.map((owner) => ({
                id: owner.id,
                shortName: formatOwnerShortName(owner),
                apartmentNumber: owner.apartmentNumber,
              }))}
              defaultSurveyDate={defaultSurveyDate}
            />
          )}
        </div>
      </main>
    </div>
  );
}
