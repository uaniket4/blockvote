const VoteModal = ({ open, title, body, confirmText = 'Confirm', cancelText = 'Cancel', onCancel, onConfirm, confirmDisabled = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md animate-fade-up">
        <h3 className="font-display text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={onCancel}>{cancelText}</button>
          <button className="btn-primary flex-1" disabled={confirmDisabled} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default VoteModal;
