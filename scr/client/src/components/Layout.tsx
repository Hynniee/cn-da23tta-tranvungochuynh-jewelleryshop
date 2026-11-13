import { Outlet, ScrollRestoration } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MiraAIChat from "./MiraAIChat";
import { useEffect } from "react";
import { trackBehavior } from "../lib/behavior";
export default function Layout() {
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? (event.target.closest("a[href]") as HTMLAnchorElement | null)
          : null;
      if (!anchor || anchor.origin !== location.origin) return;
      const slug = anchor.pathname.match(/^\/product\/([^/]+)$/)?.[1];
      if (slug)
        trackBehavior("CLICK", { productSlug: decodeURIComponent(slug) });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return (
    <>
      <Header />
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
      <Footer />
      <MiraAIChat />
      <ScrollRestoration
        getKey={(location) => location.pathname + location.search}
      />
    </>
  );
}
