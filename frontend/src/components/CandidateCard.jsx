const CandidateCard = ({
  candidate,
  selected = false,
  selectable = false,
  onSelect,
  compact = false,
  imageSeed = 'candidate',
  serialNumber,
}) => {
  const shellClasses = compact
    ? 'hover-card flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between'
    : `hover-card relative rounded-2xl border bg-white p-4 transition ${selected ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'}`;

  const listNumber = serialNumber ?? candidate.id;

  const content = (
    <>
      <img
        className={compact ? 'h-14 w-14 rounded-xl object-cover' : 'h-36 w-full rounded-xl object-cover'}
        src={`https://picsum.photos/seed/${imageSeed}-${candidate.id}/480/280`}
        alt={candidate.name}
        loading="lazy"
      />
      <div className={compact ? 'flex-1' : undefined}>
        <h3 className={compact ? 'font-semibold text-slate-900' : 'mt-3 font-display text-lg font-semibold text-slate-900'}>
          {listNumber}. {candidate.name}
        </h3>
        <p className="text-sm text-slate-500">{candidate.party}</p>
      </div>
      {selected && !compact ? (
        <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">Selected</span>
      ) : null}
    </>
  );

  if (!selectable) {
    return <article className={shellClasses}>{content}</article>;
  }

  return (
    <label className={`${shellClasses} cursor-pointer`}>
      <input
        className="sr-only"
        type="radio"
        name="candidate"
        checked={selected}
        onChange={() => onSelect(candidate.id)}
      />
      {content}
    </label>
  );
};

export default CandidateCard;
