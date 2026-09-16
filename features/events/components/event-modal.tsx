"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trapDialogFocus } from "@/utils/trap-dialog-focus";

/**
 * The EventFlow native <dialog> pattern: modal focus trapping, Escape and
 * backdrop dismissal, scroll locking and focus restoration by the caller.
 * Rendered only while open, and portalled so forms never nest in the DOM.
 */
export function EventModal({
  eyebrow,
  title,
  description,
  closeLabel,
  busy = false,
  onOpen,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  closeLabel: string;
  /** Prevents dismissal while a request is in flight. */
  busy?: boolean;
  /** Runs after the dialog opens; use it to move focus to the first input. */
  onOpen?: () => void;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const id = useId();
  // Held in state (not a ref) so `close` can be handed to render children.
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const opened = useEffectEvent(() => onOpen?.());
  const close = useCallback(() => dialog?.close(), [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    opened();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog]);

  return createPortal(
    <dialog
      ref={setDialog}
      className="event-dialog event-modal"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onKeyDown={trapDialogFocus}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) close();
      }}
    >
      <div className="event-modal-inner">
        <div className="explore-dialog-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}</h2>
          </div>
          <button
            type="button"
            className="explore-dialog-close"
            aria-label={closeLabel}
            disabled={busy}
            onClick={close}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div id={`${id}-description`} className="explore-dialog-description">
          {description}
        </div>
        {children(close)}
      </div>
    </dialog>,
    document.body,
  );
}
