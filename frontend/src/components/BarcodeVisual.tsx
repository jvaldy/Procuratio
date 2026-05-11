import { useMemo } from 'react';

type BarcodeVisualProps = {
  value: string;
  label?: string;
};

export function BarcodeVisual({ value, label }: BarcodeVisualProps) {
  const bars = useMemo(() => {
    return value
      .split('')
      .map((char) => char.charCodeAt(0))
      .flatMap((code) => String(code).split('').map((digit) => Number(digit) || 1));
  }, [value]);

  return (
    <div className="barcode-visual" aria-label={label || `Barcode ${value}`}>
      <div className="barcode-visual-bars">
        {bars.map((bar, index) => (
          <span
            key={`${value}-${index}`}
            className={`barcode-bar ${index % 2 === 0 ? 'is-dark' : 'is-light'}`}
            style={{ width: `${Math.max(2, bar + 1)}px` }}
          />
        ))}
      </div>
      <strong>{value}</strong>
    </div>
  );
}
