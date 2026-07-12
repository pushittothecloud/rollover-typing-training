import { useAppStore } from '../state/appStore'

type TopAnchorsProps = {
  visible: boolean
}

export function TopAnchors({ visible }: TopAnchorsProps) {
  const toulmin = useAppStore((state) => state.toulmin)

  return (
    <header
      className={`pointer-events-none fixed left-0 right-0 top-0 z-20 transition duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="mx-auto mt-3 grid w-[min(1100px,95vw)] grid-cols-1 gap-2 rounded-xl border border-stone-700 bg-stone-900/85 p-3 backdrop-blur md:grid-cols-3">
        <AnchorCard title="Claim" text={toulmin.claim} />
        <AnchorCard title="Evidence" text={toulmin.evidence} />
        <AnchorCard title="Warrant" text={toulmin.warrant} />
      </div>
    </header>
  )
}

function AnchorCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-md border border-stone-700 bg-stone-800/65 p-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-stone-200">{text}</p>
    </article>
  )
}
