export type NotificationTone = 'success' | 'info' | 'error';

type InlineNotificationProps = {
  tone: NotificationTone;
  message: string;
  title?: string;
};

export function InlineNotification({ tone, message, title }: InlineNotificationProps) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="notice-icon" aria-hidden="true">
        {tone === 'success' ? '✓' : tone === 'info' ? 'i' : '!'}
      </div>
      <div className="notice-content">
        {title && <strong>{title}</strong>}
        <span>{message}</span>
      </div>
    </div>
  );
}
