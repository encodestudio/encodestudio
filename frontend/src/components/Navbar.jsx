import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import Logo from "./Logo.jsx";

const productLinks = [
  { to: "/products/encode-campus", label: "Encode Campus", desc: "Education Operating & Governance Platform" },
  { to: "/products/encode-learn", label: "Encode Learn", desc: "Learning & Knowledge Platform" },
  { to: "/products/encode-verify", label: "Encode Verify", desc: "Verification & Trust Platform" },
];

const navItems = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products", dropdown: productLinks },
  { to: "/services", label: "Services" },
  { to: "/founder", label: "Meet the Founder" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/85 backdrop-blur-md border-b border-encode-border" : "bg-white/0"
      }`}
    >
      <nav className="container-page flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-14 w-auto md:h-28" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.dropdown ? (
              <div
                key={item.to}
                className="relative"
                onMouseEnter={() => setProductsOpen(true)}
                onMouseLeave={() => setProductsOpen(false)}
              >
                <button className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-black/80 transition-colors hover:bg-encode-soft hover:text-black">
                  {item.label}
                  <ChevronDown size={14} className={`transition-transform ${productsOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 top-full w-80 -translate-x-1/2 pt-3"
                    >
                      <div className="overflow-hidden rounded-2xl border border-encode-border bg-white p-2 shadow-xl shadow-black/5">
                        {item.dropdown.map((p) => (
                          <Link
                            key={p.to}
                            to={p.to}
                            className="block rounded-xl px-4 py-3 transition-colors hover:bg-encode-blueTint"
                          >
                            <div className="text-sm font-semibold text-black">{p.label}</div>
                            <div className="mt-0.5 text-xs text-encode-grey">{p.desc}</div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-encode-soft ${
                    isActive ? "text-black" : "text-black/80"
                  }`
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </div>

        <div className="hidden lg:block">
          <Link to="/contact" className="btn-primary">
            Start a Project
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-encode-border lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-encode-border bg-white lg:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-5">
              <Link to="/" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-encode-soft">
                Home
              </Link>
              <div className="px-3 pt-2 label">Products</div>
              {productLinks.map((p) => (
                <Link key={p.to} to={p.to} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-encode-soft">
                  {p.label}
                </Link>
              ))}
              <Link to="/services" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-encode-soft">
                Services
              </Link>
              <Link to="/founder" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-encode-soft">
                Meet the Founder
              </Link>
              <Link to="/contact" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-encode-soft">
                Contact Us
              </Link>
              <Link to="/contact" className="btn-primary mt-3 justify-center">
                Start a Project
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
