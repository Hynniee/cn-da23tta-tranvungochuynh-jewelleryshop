import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import RingSizer from "./pages/RingSizer";
import JewelryCare from "./pages/JewelryCare";
import ServicePage from "./pages/ServicePage";
import Support from "./pages/Support";
import JewelryQuiz from "./pages/JewelryQuiz";
import Shop from "./pages/Shop";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ThankYou from "./pages/ThankYou";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Advisor from "./pages/Advisor";
import Recommendations from "./pages/Recommendations";
import DiamondDSS from "./pages/DiamondDSS";
import DiamondDetail from "./pages/DiamondDetail";
import Appointment from "./pages/Appointment";
import AppointmentConfirmation from "./pages/AppointmentConfirmation";
import { About, Wishlist } from "./pages/Simple";
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/shop", element: <Shop /> },
      { path: "/products", element: <Products /> },
      { path: "/product/:slug", element: <ProductDetail /> },
      { path: "/cart", element: <Cart /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/thank-you", element: <ThankYou /> },
      { path: "/login", element: <Auth /> },
      { path: "/register", element: <Auth register /> },
      { path: "/account", element: <Account /> },
      { path: "/wishlist", element: <Wishlist /> },
      { path: "/about", element: <About /> },
      { path: "/advisor", element: <Advisor /> },
      { path: "/ring-sizer", element: <RingSizer /> },
      { path: "/jewelry-care", element: <JewelryCare /> },
      { path: "/services/bespoke", element: <ServicePage kind="bespoke" /> },
      {
        path: "/services/maintenance",
        element: <ServicePage kind="maintenance" />,
      },
      { path: "/policies/exchange", element: <ServicePage kind="exchange" /> },
      { path: "/support", element: <Support /> },
      { path: "/jewelry-quiz", element: <JewelryQuiz /> },
      { path: "/appointments", element: <Appointment /> },
      { path: "/appointments/:code", element: <AppointmentConfirmation /> },
      { path: "/for-you", element: <Recommendations /> },
      { path: "/diamond-dss", element: <DiamondDSS /> },
      { path: "/diamond/:id", element: <DiamondDetail /> },
      {
        path: "*",
        element: (
          <section className="lux-empty">
            <h1>Không tìm thấy trang</h1>
            <a href="/">Về trang chủ</a>
          </section>
        ),
      },
    ],
  },
  { path: "/admin", element: <Admin /> },
]);
export default function App() {
  return <RouterProvider router={router} />;
}
