import { useEffect, useRef, useId } from "react";

export default function Modal({ open, contentKey, onClose, children, label }) {
  const id = useId();
  const ref = useRef();
  const trigger = useRef();
  useEffect(() => {
    if (open) {
      if (!ref.current.open) {
        trigger.current = document.activeElement;
        ref.current.showModal();
      }
      document.body.classList.add("modal-open");
      ref.current.querySelector("button")?.focus({ preventScroll: true });
    } else if (ref.current.open) {
      ref.current.close();
      document.body.classList.remove("modal-open");
      if (trigger.current?.isConnected)
        trigger.current.focus({ preventScroll: true });
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open, contentKey]);
  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      aria-labelledby={label ? undefined : "dialog-title"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-shell">
        <button
          className="dialog-close"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
}
