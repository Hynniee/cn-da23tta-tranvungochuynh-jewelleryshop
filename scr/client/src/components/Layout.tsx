import { Outlet, ScrollRestoration } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MiraAIChat from "./MiraAIChat";
export default function Layout() {
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
