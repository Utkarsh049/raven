import { PinnedList } from "@/components/pins/PinnedList";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Raven</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your pinned chapters — available offline.</p>
      <div className="mt-6">
        <PinnedList />
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Tip: open a chapter and hit “Pin” to add it here. Pins survive app restarts with no network.</p>
    </div>
  );
}
