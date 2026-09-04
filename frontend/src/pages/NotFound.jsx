import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "../components/Seo.jsx";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Seo title="Page Not Found" description="The page you're looking for doesn't exist or has moved." path="/404" noindex />
      <div className="text-display-lg font-display font-bold text-encode-blue">404</div>
      <h1 className="mt-4 text-2xl font-display font-bold">Page not found.</h1>
      <p className="mt-2 max-w-sm text-encode-grey">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="btn-primary mt-8">
        Back to Home <ArrowRight size={16} />
      </Link>
    </div>
  );
}
