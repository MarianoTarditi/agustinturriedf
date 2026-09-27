type MaterialSymbolProps = {
  name: string;
  className?: string;
  fill?: 0 | 1;
  weight?: number;
  grade?: number;
  opticalSize?: number;
};

export function MaterialSymbol({
  name,
  className,
  fill = 0,
  weight = 400,
  grade = 0,
  opticalSize = 24,
}: MaterialSymbolProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined${className ? ` ${className}` : ""}`}
      style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}` }}
    >
      {name}
    </span>
  );
}
