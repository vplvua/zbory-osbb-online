type ZipEntry = {
  name: string;
  data: Uint8Array;
  modifiedAt?: Date;
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(input: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ input[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTime(date: Date): number {
  const seconds = Math.floor(date.getSeconds() / 2);
  return (date.getHours() << 11) | (date.getMinutes() << 5) | seconds;
}

function toDosDate(date: Date): number {
  const year = Math.max(1980, date.getFullYear());
  return ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
}

export function createZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.data);
    const modifiedAt = entry.modifiedAt ?? new Date();
    const dosTime = toDosTime(modifiedAt);
    const dosDate = toDosDate(modifiedAt);
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);

    localParts.push(localHeader, data);

    const centralHeader = Buffer.alloc(46 + nameBytes.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    nameBytes.copy(centralHeader, 46);

    centralParts.push(centralHeader);

    localOffset += localHeader.length + data.length;
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(localOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endOfCentralDirectory]);
}
