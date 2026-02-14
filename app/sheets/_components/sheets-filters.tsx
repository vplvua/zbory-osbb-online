'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SVGProps } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ProtocolOption = {
  id: string;
  number: string;
  dateLabel: string;
};

type OwnerOption = {
  id: string;
  shortName: string;
  apartmentNumber: string;
};

type SheetsFiltersProps = {
  protocols: ProtocolOption[];
  owners: OwnerOption[];
  selectedProtocolId: string;
  selectedOwnerId: string;
  selectedStatus: string;
  selectedApartment?: string;
  className?: string;
  renderMode?: 'all' | 'controls' | 'badges';
};

type FilterKind = 'protocol' | 'owner' | 'status';

const SHEET_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'PENDING_ORGANIZER', label: 'Очікує підпису відповідальної особи' },
  { value: 'SIGNED', label: 'Підписано' },
  { value: 'EXPIRED', label: 'Термін минув' },
] as const;

function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 5h18" />
      <path d="M6 12h12" />
      <path d="M10 19h4" />
    </svg>
  );
}

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

function BadgeClearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function formatProtocolLabel(number: string, dateLabel: string) {
  const trimmedNumber = number.trim();
  const protocolNumber = trimmedNumber.startsWith('№') ? trimmedNumber : `№${trimmedNumber}`;
  return `${protocolNumber} від ${dateLabel}`;
}

type FilterBadgeProps = {
  label: string;
  onClear: () => void;
};

function FilterBadge({ label, onClear }: FilterBadgeProps) {
  return (
    <span className="border-brand/35 bg-brand/12 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
      <span className="text-brand font-semibold">{label}</span>
      <button
        type="button"
        className="text-brand/70 hover:text-brand inline-flex h-4 w-4 items-center justify-center rounded-full"
        aria-label={`Скинути фільтр ${label}`}
        onClick={onClear}
      >
        <BadgeClearIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default function SheetsFilters({
  protocols,
  owners,
  selectedProtocolId,
  selectedOwnerId,
  selectedStatus,
  selectedApartment,
  className,
  renderMode = 'all',
}: SheetsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<FilterKind | null>(null);
  const [protocolSearch, setProtocolSearch] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');

  const selectedProtocol = protocols.find((protocol) => protocol.id === selectedProtocolId) ?? null;
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId) ?? null;
  const selectedStatusOption =
    SHEET_STATUS_OPTIONS.find((option) => option.value === selectedStatus) ?? null;
  const showControls = renderMode !== 'badges';
  const showBadges = renderMode !== 'controls';

  useEffect(() => {
    if (!activeFilter) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveFilter(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeFilter]);

  const filteredProtocols = useMemo(() => {
    const normalized = protocolSearch.trim().toLowerCase();
    if (!normalized) {
      return protocols;
    }

    return protocols.filter((protocol) => {
      const haystack = `${protocol.number} ${protocol.dateLabel}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [protocols, protocolSearch]);

  const filteredOwners = useMemo(() => {
    const normalized = ownerSearch.trim().toLowerCase();
    if (!normalized) {
      return owners;
    }

    return owners.filter((owner) => {
      const haystack = `${owner.shortName} ${owner.apartmentNumber}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [owners, ownerSearch]);

  function replaceSearchParams(update: (nextSearchParams: URLSearchParams) => void) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    update(nextSearchParams);

    const nextQueryString = nextSearchParams.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  }

  function selectProtocol(protocolId: string) {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.set('protocolId', protocolId);
    });
    setActiveFilter(null);
  }

  function clearProtocolFilter() {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.delete('protocolId');
    });
  }

  function selectOwner(ownerId: string) {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.set('ownerId', ownerId);
      nextSearchParams.delete('apartment');
    });
    setActiveFilter(null);
  }

  function clearOwnerFilter() {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.delete('ownerId');
    });
  }

  function clearApartmentFilter() {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.delete('apartment');
    });
  }

  function selectStatus(status: string) {
    replaceSearchParams((nextSearchParams) => {
      if (status) {
        nextSearchParams.set('status', status);
      } else {
        nextSearchParams.delete('status');
      }
    });
    setActiveFilter(null);
  }

  function clearStatusFilter() {
    replaceSearchParams((nextSearchParams) => {
      nextSearchParams.delete('status');
    });
  }

  return (
    <section className={cn('space-y-3', className)}>
      {showControls ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start whitespace-nowrap"
            onClick={() => {
              setProtocolSearch('');
              setActiveFilter('protocol');
            }}
          >
            <FilterIcon className="h-4 w-4" />
            Протоколи
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start whitespace-nowrap"
            onClick={() => {
              setOwnerSearch('');
              setActiveFilter('owner');
            }}
          >
            <FilterIcon className="h-4 w-4" />
            Співвласники
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start whitespace-nowrap"
            onClick={() => setActiveFilter('status')}
          >
            <FilterIcon className="h-4 w-4" />
            Статуси
          </Button>
        </div>
      ) : null}

      {showBadges &&
      (selectedProtocol || selectedOwner || selectedApartment || selectedStatusOption) ? (
        <div className="flex flex-wrap gap-2">
          {selectedProtocol ? (
            <FilterBadge
              label={`Протокол ${selectedProtocol.number}`}
              onClear={clearProtocolFilter}
            />
          ) : null}
          {selectedOwner ? (
            <FilterBadge
              label={`кв. ${selectedOwner.apartmentNumber}, ${selectedOwner.shortName}`}
              onClear={clearOwnerFilter}
            />
          ) : null}
          {selectedApartment ? (
            <FilterBadge label={`кв. ${selectedApartment}`} onClear={clearApartmentFilter} />
          ) : null}
          {selectedStatusOption ? (
            <FilterBadge
              label={`Статус: ${selectedStatusOption.label}`}
              onClear={clearStatusFilter}
            />
          ) : null}
        </div>
      ) : null}

      {showControls && activeFilter ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 hidden bg-black/45 sm:block"
            aria-label="Закрити фільтр"
            onClick={() => setActiveFilter(null)}
          />
          <div className="bg-surface border-border relative z-10 flex h-full w-full flex-col sm:absolute sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[80vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md"
                onClick={() => setActiveFilter(null)}
                aria-label="Назад"
              >
                <BackIcon className="h-5 w-5" />
              </button>
              <h3 className="text-base font-semibold">
                {activeFilter === 'protocol'
                  ? 'Вибір протоколу'
                  : activeFilter === 'owner'
                    ? 'Вибір співвласника'
                    : 'Вибір статусу'}
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md"
                onClick={() => setActiveFilter(null)}
                aria-label="Закрити"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {activeFilter !== 'status' ? (
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
                    value={activeFilter === 'protocol' ? protocolSearch : ownerSearch}
                    onChange={(event) => {
                      if (activeFilter === 'protocol') {
                        setProtocolSearch(event.target.value);
                        return;
                      }

                      setOwnerSearch(event.target.value);
                    }}
                    placeholder={
                      activeFilter === 'protocol'
                        ? 'Пошук за номером або датою протоколу'
                        : 'Пошук за ПІБ або номером квартири'
                    }
                    aria-label={
                      activeFilter === 'protocol' ? 'Пошук протоколу' : 'Пошук співвласника'
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {activeFilter === 'protocol' ? (
                <div className="space-y-2">
                  {filteredProtocols.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нічого не знайдено.</p>
                  ) : (
                    filteredProtocols.map((protocol) => {
                      const isActive = protocol.id === selectedProtocolId;
                      return (
                        <button
                          key={protocol.id}
                          type="button"
                          className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                            isActive ? 'border-brand bg-brand/10' : ''
                          }`}
                          onClick={() => selectProtocol(protocol.id)}
                        >
                          <span className="font-medium">
                            {formatProtocolLabel(protocol.number, protocol.dateLabel)}
                          </span>
                          {isActive ? <CheckIcon className="text-brand h-4 w-4" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : activeFilter === 'owner' ? (
                <div className="space-y-2">
                  {filteredOwners.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нічого не знайдено.</p>
                  ) : (
                    filteredOwners.map((owner) => {
                      const isActive = owner.id === selectedOwnerId;
                      return (
                        <button
                          key={owner.id}
                          type="button"
                          className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                            isActive ? 'border-brand bg-brand/10' : ''
                          }`}
                          onClick={() => selectOwner(owner.id)}
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
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                      selectedStatus ? '' : 'border-brand bg-brand/10'
                    }`}
                    onClick={() => selectStatus('')}
                  >
                    <span className="font-medium">Усі статуси</span>
                    {!selectedStatus ? <CheckIcon className="text-brand h-4 w-4" /> : null}
                  </button>
                  {SHEET_STATUS_OPTIONS.map((statusOption) => {
                    const isActive = selectedStatus === statusOption.value;
                    return (
                      <button
                        key={statusOption.value}
                        type="button"
                        className={`border-border hover:bg-surface-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                          isActive ? 'border-brand bg-brand/10' : ''
                        }`}
                        onClick={() => selectStatus(statusOption.value)}
                      >
                        <span className="font-medium">{statusOption.label}</span>
                        {isActive ? <CheckIcon className="text-brand h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
