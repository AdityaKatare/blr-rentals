export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] animate-pulse px-4 py-7 sm:px-6 lg:px-10" aria-hidden>
      <div className="h-10 w-3/5 max-w-lg bg-shade" />
      <div className="mt-6 h-px bg-hair" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-[120px_minmax(0,1fr)] gap-6 border-b border-hair py-7">
          <div className="aspect-[4/3] bg-shade" />
          <div className="flex flex-col gap-3">
            <div className="h-7 w-40 bg-shade" />
            <div className="h-4 w-4/5 bg-shade" />
            <div className="h-4 w-2/5 bg-shade" />
          </div>
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
