import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/recommendations', label: 'Recommendations' },
  { path: '/data', label: 'Data Explorer' },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SR</div>
        <div>
          <div className="brand-title">Steam Reco</div>
          <div className="brand-subtitle">Data + ML</div>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item${isActive ? ' nav-item--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p className="sidebar-note">Person1: ETL - Person2: Features - Person3: Reco</p>
      </div>
    </aside>
  );
}

export default Sidebar;
