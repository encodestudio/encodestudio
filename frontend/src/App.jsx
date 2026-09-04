import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductCampus from "./pages/ProductCampus.jsx";
import ProductLearn from "./pages/ProductLearn.jsx";
import ProductVerify from "./pages/ProductVerify.jsx";
import Services from "./pages/Services.jsx";
import ServiceDetail from "./pages/ServiceDetail.jsx";
import Founder from "./pages/Founder.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";
import LeadsPortal from "./pages/leads/LeadsPortal.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicSite() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/encode-campus" element={<ProductCampus />} />
          <Route path="/products/encode-learn" element={<ProductLearn />} />
          <Route path="/products/encode-verify" element={<ProductVerify />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/founder" element={<Founder />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Standalone lead-management portal — no public nav/footer, not linked
            anywhere in the public site. */}
        <Route path="/leads/*" element={<LeadsPortal />} />
        <Route path="/*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}
