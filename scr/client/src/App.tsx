import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Advisor from "./pages/Advisor";
import Recommendations from "./pages/Recommendations";
import DiamondDSS from "./pages/DiamondDSS";
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
      { path: "/login", element: <Auth /> },
      { path: "/register", element: <Auth register /> },
      { path: "/account", element: <Account /> },
      { path: "/wishlist", element: <Wishlist /> },
      { path: "/about", element: <About /> },
      { path: "/advisor", element: <Advisor /> },
      { path: "/for-you", element: <Recommendations /> },
      { path: "/diamond-dss", element: <DiamondDSS /> },
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
