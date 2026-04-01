const Sidebar = ({ title, subtitle, navItems = [], footer }) => {
  return (
    <aside className="panel animate-fade-up h-fit lg:sticky lg:top-6">
      <h2 className="font-display text-2xl font-semibold text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}

      <nav className="mt-5 space-y-2 text-sm">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 font-medium ${item.active ? 'bg-slate-100 text-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </aside>
  );
};

export default Sidebar;
