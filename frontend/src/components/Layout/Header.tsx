import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/': 'Overview & Health',
  '/recommendations': 'Personalized Recommendations',
  '/data': 'Data Explorer',
};

function Header() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Steam Game Recommendation Console';

  return (
    <header className="header">
      <div>
        <p className="eyebrow">Steam Game Recommendation System</p>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="header-actions">
        <span className="pill">AWS S3 / Athena ready</span>
        <span className="pill pill-secondary">v0.1 scaffold</span>
      </div>
    </header>
  );
}

export default Header;
