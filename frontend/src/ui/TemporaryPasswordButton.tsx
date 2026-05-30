type TemporaryPasswordButtonProps = {
  onClick: () => void;
  label?: string;
};

export function TemporaryPasswordButton({
  onClick,
  label = 'Generate temporary password',
}: TemporaryPasswordButtonProps) {
  return (
    <button className="planning-action-btn planning-action-btn-primary" onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
        <path
          d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 1 0-6 0v2Zm3 3a2 2 0 0 1 1 3.73V18h-2v-1.27A2 2 0 0 1 12 13Z"
          fill="currentColor"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
