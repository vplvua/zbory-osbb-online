type OwnerNameParts = {
  lastName: string;
  firstName: string;
  middleName: string;
};

function normalizePart(value: string): string {
  return value.trim();
}

function toInitial(value: string): string {
  const letter = normalizePart(value).charAt(0);
  return letter ? `${letter.toUpperCase()}.` : '';
}

export function formatOwnerShortName(owner: OwnerNameParts): string {
  const lastName = normalizePart(owner.lastName);
  const initials = `${toInitial(owner.firstName)}${toInitial(owner.middleName)}`;

  if (lastName && initials) {
    return `${lastName} ${initials}`;
  }

  if (lastName) {
    return lastName;
  }

  if (initials) {
    return initials;
  }

  return '—';
}

export function formatOwnerFullName(owner: OwnerNameParts): string {
  const parts = [
    normalizePart(owner.lastName),
    normalizePart(owner.firstName),
    normalizePart(owner.middleName),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : '—';
}
