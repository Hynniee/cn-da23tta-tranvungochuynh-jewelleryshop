import { useCallback, useEffect, useState } from "react";
import { request } from "../lib/api";

export type SavedAddress = {
  _id: string;
  label: string;
  name: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  address: string;
  isDefault: boolean;
};
export default function useAddressBook(enabled = true) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request("/auth/me/addresses", { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result))
          throw new Error("Chưa tải được sổ địa chỉ.");
        if (!controller.signal.aborted) setAddresses(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Chưa tải được sổ địa chỉ.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, revision]);
  return { addresses, setAddresses, loading, error, reload };
}
