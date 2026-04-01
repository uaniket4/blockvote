const Navbar = ({ title, subtitle, actions, rightSlot }) => {
  return (
    <header className="panel animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {subtitle ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{subtitle}</p> : null}
        <h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {rightSlot}
        {actions}
      </div>
    </header>
  );
};

export default Navbar;
