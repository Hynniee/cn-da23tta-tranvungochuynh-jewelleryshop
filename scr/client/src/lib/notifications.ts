export const NOTIFICATION_DURATION = 3000;
export const NOTIFICATION_EVENT = "mira:notification";

export type Notification = {
  message: string;
  kind: "success" | "info";
};

export function notify(
  message: string,
  kind: Notification["kind"] = "success",
) {
  window.dispatchEvent(
    new CustomEvent<Notification>(NOTIFICATION_EVENT, {
      detail: { message, kind },
    }),
  );
}
