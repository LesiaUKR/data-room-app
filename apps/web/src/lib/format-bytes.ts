const BYTES_PER_UNIT = 1024;
const LARGE_VALUE_THRESHOLD = 100;
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

const formatBytes = (value: string): string => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return '—';
  }

  let size = bytes;
  let unitIndex = 0;

  while (size >= BYTES_PER_UNIT && unitIndex < UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  const showsFraction = unitIndex > 0 && size < LARGE_VALUE_THRESHOLD;

  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: showsFraction ? 1 : 0,
  }).format(size);

  return `${formatted} ${UNITS[unitIndex] ?? UNITS[0]}`;
};

export { formatBytes };
