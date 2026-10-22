import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="container-x py-24 text-center">
      <p className="font-display text-6xl font-black text-brand/20">404</p>
      <h1 className="mt-2 font-display text-3xl font-black">Page not found</h1>
      <p className="mt-3 text-ink/60">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        <Link to="/shop" className="btn-outline">Shop kites</Link>
      </div>
    </div>
  );
}
