import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function HeaderDropdown({
  id,
  label,
  items,
  open,
  onToggle,
  onClose,
}: {
  id: string;
  label: string;
  items: { label: string; to: string; description?: string }[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const active = (to: string) => {
    const target = new URL(to, window.location.origin);
    return (
      target.pathname === location.pathname &&
      target.searchParams.toString() ===
        new URLSearchParams(location.search).toString()
    );
  };
  const focusFirst = useRef(false);
  useEffect(() => {
    if (open && focusFirst.current) {
      container.current
        ?.querySelector<HTMLAnchorElement>(".header-product-links a")
        ?.focus();
      focusFirst.current = false;
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.closest("nav")?.contains(event.target as Node))
        onClose();
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, onClose]);
  return (
    <div
      className="header-products"
      ref={container}
      onBlur={(event) => {
        if (
          !event.currentTarget
            .closest("nav")
            ?.contains(event.relatedTarget as Node)
        )
          onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onClose();
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="header-products-toggle"
        aria-expanded={open}
        data-active={items.some((item) => active(item.to)) || undefined}
        aria-controls={`header-${id}-links`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (open)
              container.current
                ?.querySelector<HTMLAnchorElement>(".header-product-links a")
                ?.focus();
            else {
              focusFirst.current = true;
              onToggle();
            }
          }
        }}
      >
        {label} <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`header-${id}-links`}
          className={`header-product-links header-product-links--${id}`}
        >
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active(item.to) ? "page" : undefined}
              onClick={onClose}
            >
              <span>{item.label}</span>
              {item.description && <small>{item.description}</small>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
