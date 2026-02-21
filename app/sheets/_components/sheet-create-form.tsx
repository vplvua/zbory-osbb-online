'use client';

import { type SVGProps, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { SheetFormState } from '@/app/sheets/actions';
import { useActionErrorToast } from '@/lib/toast/use-action-error-toast';
import { cn } from '@/lib/utils';

const initialState: SheetFormState = {};
type SelectorKind = 'protocol' | 'owner';

type SheetCreateFormProps = {
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  redirectTo?: string;
  formId?: string;
  showSubmitButton?: boolean;
  protocols: Array<{
    id: string;
    number: string;
    dateLabel: string;
    questionsCount: number;
  }>;
  owners: Array<{
    id: string;
    shortName: string;
    apartmentNumber: string;
  }>;
  defaultSurveyDate: string;
};

function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v6" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function formatProtocolLabel(number: string, dateLabel: string) {
  const trimmedNumber = number.trim();
  const protocolNumber = trimmedNumber.startsWith('№') ? trimmedNumber : `№${trimmedNumber}`;
  return `${protocolNumber} від ${dateLabel}`;
}

export default function SheetCreateForm({
  action,
  redirectTo,
  formId,
  showSubmitButton = true,
  protocols,
  owners,
  defaultSurveyDate,
}: SheetCreateFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useActionErrorToast(state.error);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [ownerSelectionDraft, setOwnerSelectionDraft] = useState<string[]>([]);
  const [activeSelector, setActiveSelector] = useState<SelectorKind | null>(null);
  const [protocolSearch, setProtocolSearch] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');

  const selectedProtocol = protocols.find((protocol) => protocol.id === selectedProtocolId) ?? null;
  const selectedProtocolHasQuestions = (selectedProtocol?.questionsCount ?? 0) > 0;
  const protocolsWithoutQuestionsCount = protocols.filter(
    (protocol) => protocol.questionsCount === 0,
  ).length;
  const selectedOwner =
    selectedOwnerIds.length === 1
      ? (owners.find((owner) => owner.id === selectedOwnerIds[0]) ?? null)
      : null;

  const filteredProtocols = useMemo(() => {
    const normalized = protocolSearch.trim().toLowerCase();
    if (!normalized) {
      return protocols;
    }

    return protocols.filter((protocol) => {
      const haystack = `${protocol.number} ${protocol.dateLabel}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [protocolSearch, protocols]);

  const filteredOwners = useMemo(() => {
    const normalized = ownerSearch.trim().toLowerCase();
    if (!normalized) {
      return owners;
    }

    return owners.filter((owner) => {
      const haystack = `${owner.shortName} ${owner.apartmentNumber}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [ownerSearch, owners]);

  function clearActiveSelection() {
    if (activeSelector === 'protocol') {
      setSelectedProtocolId('');
      setActiveSelector(null);
    } else if (activeSelector === 'owner') {
      setOwnerSelectionDraft([]);
    }
  }

  useEffect(() => {
    if (!activeSelector) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveSelector(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeSelector]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    form.dispatchEvent(new Event('input', { bubbles: true }));
  }, [selectedProtocolId, selectedOwnerIds]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Новий листок опитування</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id={formId}
            ref={formRef}
            action={formAction}
            className="space-y-4"
            data-submitting={isPending ? 'true' : 'false'}
          >
            <fieldset disabled={isPending} className="space-y-4">
              {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
              <input type="hidden" name="protocolId" value={selectedProtocolId} />
              {selectedOwnerIds.map((ownerId) => (
                <input key={ownerId} type="hidden" name="ownerIds" value={ownerId} />
              ))}

              <div className="space-y-2">
                <Label htmlFor="protocol-selector-button">Протокол</Label>
                <button
                  id="protocol-selector-button"
                  type="button"
                  className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  onClick={() => {
                    setProtocolSearch('');
                    setActiveSelector('protocol');
                  }}
                  disabled={isPending}
                >
                  <span
                    className={cn(
                      'truncate',
                      selectedProtocol ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {selectedProtocol
                      ? formatProtocolLabel(selectedProtocol.number, selectedProtocol.dateLabel)
                      : 'Оберіть протокол'}
                  </span>
                  <ChevronDownIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                </button>
                {protocolsWithoutQuestionsCount > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Протоколи без питань недоступні для створення листка.
                  </p>
                ) : null}
                {selectedProtocol && !selectedProtocolHasQuestions ? (
                  <p className="text-sm text-amber-700">
                    У вибраному протоколі немає питань. Додайте хоча б одне питання у протоколі.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-selector-button">Співвласники</Label>
                <button
                  id="owner-selector-button"
                  type="button"
                  className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  onClick={() => {
                    setOwnerSearch('');
                    setOwnerSelectionDraft(selectedOwnerIds);
                    setActiveSelector('owner');
                  }}
                  disabled={isPending}
                >
                  <span
                    className={cn(
                      'truncate',
                      selectedOwnerIds.length > 0 ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {selectedOwner
                      ? `кв. ${selectedOwner.apartmentNumber}, ${selectedOwner.shortName}`
                      : selectedOwnerIds.length > 1
                        ? `Обрано: ${selectedOwnerIds.length} співвласників`
                        : 'Оберіть співвласників'}
                  </span>
                  <ChevronDownIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surveyDate">Дата проведення опитування</Label>
                <div className="w-37.5 max-w-full">
                  <Input
                    id="surveyDate"
                    name="surveyDate"
                    type="date"
                    defaultValue={defaultSurveyDate}
                    className="block w-full"
                    required
                  />
                </div>
              </div>

              {state.error ? (
                <section className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                  <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{state.error}</p>
                </section>
              ) : null}

              {showSubmitButton ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
                  {isPending ? 'Створення...' : 'Створити листок'}
                </Button>
              ) : null}
            </fieldset>
          </form>
        </CardContent>
      </Card>

      {activeSelector ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 hidden bg-black/45 sm:block"
            aria-label="Закрити вибір"
            onClick={() => setActiveSelector(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-selector-title"
            className="bg-surface border-border relative z-10 flex h-full w-full flex-col sm:absolute sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[80vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md"
                onClick={() => setActiveSelector(null)}
                aria-label="Назад"
              >
                <BackIcon className="h-5 w-5" />
              </button>
              <h3 id="sheet-selector-title" className="text-base font-semibold">
                {activeSelector === 'protocol' ? 'Вибір протоколу' : 'Вибір співвласників'}
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md"
                onClick={() => setActiveSelector(null)}
                aria-label="Закрити"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pt-1 pb-3">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <Input
                  value={activeSelector === 'protocol' ? protocolSearch : ownerSearch}
                  onChange={(event) => {
                    if (activeSelector === 'protocol') {
                      setProtocolSearch(event.target.value);
                      return;
                    }

                    setOwnerSearch(event.target.value);
                  }}
                  placeholder={
                    activeSelector === 'protocol'
                      ? 'Пошук за номером або датою протоколу'
                      : 'Пошук за ПІБ або номером квартири'
                  }
                  aria-label={
                    activeSelector === 'protocol' ? 'Пошук протоколу' : 'Пошук співвласника'
                  }
                  className="pl-9"
                />
              </div>
              <div className="mt-2 flex justify-end">
                {activeSelector === 'owner' ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                      onClick={() => setOwnerSelectionDraft(owners.map((owner) => owner.id))}
                      disabled={owners.length === 0}
                    >
                      Обрати всіх
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                      onClick={clearActiveSelection}
                      disabled={ownerSelectionDraft.length === 0}
                    >
                      Скинути вибір
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                    onClick={clearActiveSelection}
                    disabled={!selectedProtocolId}
                  >
                    Скинути вибір
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {activeSelector === 'protocol' ? (
                <div className="space-y-2">
                  {filteredProtocols.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нічого не знайдено.</p>
                  ) : (
                    filteredProtocols.map((protocol) => {
                      const isActive = protocol.id === selectedProtocolId;
                      const hasQuestions = protocol.questionsCount > 0;
                      return (
                        <button
                          key={protocol.id}
                          type="button"
                          className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                            isActive ? 'border-brand bg-brand/10' : ''
                          } ${hasQuestions ? '' : 'cursor-not-allowed opacity-60 hover:bg-transparent'}`}
                          disabled={!hasQuestions}
                          onClick={() => {
                            if (!hasQuestions) {
                              return;
                            }
                            setSelectedProtocolId(protocol.id);
                            setActiveSelector(null);
                          }}
                        >
                          <span className="space-y-0.5">
                            <span className="block font-medium">
                              {formatProtocolLabel(protocol.number, protocol.dateLabel)}
                            </span>
                            {!hasQuestions ? (
                              <span className="text-muted-foreground block text-xs">
                                Немає питань у протоколі.
                              </span>
                            ) : null}
                          </span>
                          {isActive ? <CheckIcon className="text-brand h-4 w-4" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOwners.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нічого не знайдено.</p>
                  ) : (
                    filteredOwners.map((owner) => {
                      const isActive = ownerSelectionDraft.includes(owner.id);
                      return (
                        <button
                          key={owner.id}
                          type="button"
                          className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                            isActive ? 'border-brand bg-brand/10' : ''
                          }`}
                          onClick={() => {
                            setOwnerSelectionDraft((previousSelection) =>
                              previousSelection.includes(owner.id)
                                ? previousSelection.filter((selectedId) => selectedId !== owner.id)
                                : [...previousSelection, owner.id],
                            );
                          }}
                        >
                          <span className="font-medium">
                            кв. {owner.apartmentNumber}, {owner.shortName}
                          </span>
                          {isActive ? <CheckIcon className="text-brand h-4 w-4" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {activeSelector === 'owner' ? (
              <div className="border-border border-t p-4">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setSelectedOwnerIds(ownerSelectionDraft);
                    setActiveSelector(null);
                  }}
                >
                  Підтвердити вибір
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
