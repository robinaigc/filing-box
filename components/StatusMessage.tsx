type StatusMessageProps = {
  tone?: "info" | "error" | "success";
  title?: string;
  message: string;
};

export function StatusMessage({ tone = "info", title, message }: StatusMessageProps) {
  return (
    <div className={`status-message status-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title ? <strong>{title}</strong> : null}
      <span>{message}</span>
    </div>
  );
}
