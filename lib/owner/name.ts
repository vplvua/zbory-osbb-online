type OwnerNameParts = {
  lastName: string;
  firstName: string;
  middleName: string;
};

function toInitial(value: string): string {
  const letter = value.trim().charAt(0);
  return letter ? `${letter.toUpperCase()}.` : '';
}

export function formatOwnerShortName(owner: OwnerNameParts): string {
  const lastName = owner.lastName.trim();
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
