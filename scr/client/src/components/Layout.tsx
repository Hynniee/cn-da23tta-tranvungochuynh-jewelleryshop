import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MiraAIChat from "./MiraAIChat";
export default function Layout() {
  return (
    <>
      <Header />
      <div>
        <Outlet />
      </div>
      <Footer />
      <MiraAIChat />
    </>
  );
}
