import { useEffect, useRef, useState } from "react";
import { Form, Link, useActionData, useNavigate } from "react-router";
import type { Route } from "./+types/plan.edit";
import { DayEditor, ExerciseRow, type Section } from "~/components/DayEditor";
import { Icon } from "~/components/Icon";
import { ExercisePicker } from "~/components/ExercisePicker";
import { getPlan, savePlan, type StoredPlan } from "~/lib/store/local";
import { newCustomExerciseId, resolveExercise } from "~/lib/exercises/resolve";
import type { PlanDay, PlanDoc, PlanExercise } from "~/lib/plan/schema";
import { publishPlan } from "~/lib/publish.server";

export function meta() {
  return [{ title: "Edit plan — Tennis Workout Builder" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return getPlan(params.id);
}
clientLoader.hydrate = true as const;

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  let doc: unknown;
  try {
    doc = JSON.parse(String(fd.get("doc")));
  } catch {
    return { ok: false as const, errors: ["Invalid plan payload — please retry"] };
  }
  const res = await publishPlan(doc, fd.get("remixOf") ? String(fd.get("remixOf")) : undefined);
  if (res.ok) return { ok: true as const, slug: res.slug };
  return res;
}

type PickerTarget =
  | { kind: "day-swap"; dayIndex: number; section: Section; exIndex: number; exerciseId: string }
  | { kind: "day-add"; dayIndex: number; section: Section }
  | { kind: "protocol-swap"; protocolIndex: number; itemIndex: number; exerciseId: string }
  | { kind: "protocol-add"; protocolIndex: number }
  | { kind: "protocol-create"; name: string };

function PlanEditor({ plan }: { plan: StoredPlan }) {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<PlanDoc>(plan.doc);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [addingProtocol, setAddingProtocol] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState("");

  const skipInitialSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `doc` on every render so the unmount-flush effect below (which
  // only runs once, deps-free) can always read the latest value instead of
  // a stale closure from its first render.
  const docRef = useRef(doc);
  docRef.current = doc;

  // Autosave: every doc change (after the initial load) schedules a debounced
  // save so edits aren't lost if the tab closes mid-edit.
  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void savePlan({
        id: plan.id,
        doc,
        createdAt: plan.createdAt,
        updatedAt: new Date().toISOString(),
        sourceSlug: plan.sourceSlug,
        startedAt: plan.startedAt,
      }).then(() => setSaveState("saved"));
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, plan.id, plan.createdAt, plan.sourceSlug, plan.startedAt]);

  // Flush a still-pending debounced save on unmount (e.g. navigating away
  // right after an edit, before the 500ms debounce fires) instead of
  // silently dropping it.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void savePlan({
          id: plan.id,
          doc: docRef.current,
          createdAt: plan.createdAt,
          updatedAt: new Date().toISOString(),
          sourceSlug: plan.sourceSlug,
          startedAt: plan.startedAt,
        });
      }
    };
    // Deliberately empty deps: this must run its cleanup exactly once, on
    // unmount — it reads the latest plan/doc via refs/closure-at-unmount,
    // not via a dependency array that would re-fire it on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On a successful publish, write the returned slug back into the local
  // plan (so a later publish links to this one as a new version) before
  // navigating to the published page.
  useEffect(() => {
    if (!actionData || actionData.ok !== true) return;
    const slug = actionData.slug;
    void savePlan({
      id: plan.id,
      doc,
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
      sourceSlug: slug,
      startedAt: plan.startedAt,
    }).then(() => navigate(`/p/${slug}`));
  }, [actionData, doc, plan.id, plan.createdAt, plan.startedAt, navigate]);

  function updateMeta(patch: Partial<PlanDoc["meta"]>) {
    setDoc((d) => ({ ...d, meta: { ...d.meta, ...patch } }));
  }

  function moveDay(index: number, dir: -1 | 1) {
    setDoc((d) => {
      const target = index + dir;
      if (target < 0 || target >= d.days.length) return d;
      const days = [...d.days];
      [days[index], days[target]] = [days[target], days[index]];
      return { ...d, days };
    });
  }

  function updateDayField(index: number, patch: Partial<Pick<PlanDay, "label" | "focus">>) {
    setDoc((d) => ({
      ...d,
      days: d.days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    }));
  }

  function updateExercise(dayIndex: number, section: Section, exIndex: number, patch: Partial<PlanExercise>) {
    setDoc((d) => ({
      ...d,
      days: d.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const list = (day[section] ?? []).map((ex, j) => (j === exIndex ? { ...ex, ...patch } : ex));
        return { ...day, [section]: list };
      }),
    }));
  }

  function removeExercise(dayIndex: number, section: Section, exIndex: number) {
    setDoc((d) => ({
      ...d,
      days: d.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const list = (day[section] ?? []).filter((_, j) => j !== exIndex);
        return { ...day, [section]: list };
      }),
    }));
  }

  function addExerciseToDay(dayIndex: number, section: Section, exerciseId: string) {
    setDoc((d) => ({
      ...d,
      days: d.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const list = [...(day[section] ?? []), { exerciseId }];
        return { ...day, [section]: list };
      }),
    }));
  }

  function addProtocol(name: string, exerciseId: string) {
    setDoc((d) => ({
      ...d,
      dailyProtocols: [...d.dailyProtocols, { name, items: [{ exerciseId }] }],
    }));
  }

  function removeProtocol(protocolIndex: number) {
    setDoc((d) => ({
      ...d,
      dailyProtocols: d.dailyProtocols.filter((_, i) => i !== protocolIndex),
    }));
  }

  function addProtocolItem(protocolIndex: number, exerciseId: string) {
    setDoc((d) => ({
      ...d,
      dailyProtocols: d.dailyProtocols.map((p, i) =>
        i === protocolIndex ? { ...p, items: [...p.items, { exerciseId }] } : p,
      ),
    }));
  }

  function removeProtocolItem(protocolIndex: number, itemIndex: number) {
    setDoc((d) => ({
      ...d,
      dailyProtocols: d.dailyProtocols.map((p, i) =>
        i === protocolIndex ? { ...p, items: p.items.filter((_, j) => j !== itemIndex) } : p,
      ),
    }));
  }

  function updateProtocolItem(protocolIndex: number, itemIndex: number, patch: Partial<PlanExercise>) {
    setDoc((d) => ({
      ...d,
      dailyProtocols: d.dailyProtocols.map((p, i) =>
        i === protocolIndex
          ? { ...p, items: p.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)) }
          : p,
      ),
    }));
  }

  // Create the plan-local definition, then insert a reference to it through
  // the exact same path a library pick takes.
  function handleCreateCustom(name: string, cues?: string) {
    const id = newCustomExerciseId();
    setDoc((d) => ({
      ...d,
      customExercises: [...(d.customExercises ?? []), { id, name, ...(cues ? { cues } : {}) }],
    }));
    handlePick(id);
  }

  function handlePick(exerciseId: string) {
    if (!picker) return;
    switch (picker.kind) {
      case "day-swap":
        updateExercise(picker.dayIndex, picker.section, picker.exIndex, { exerciseId });
        break;
      case "day-add":
        addExerciseToDay(picker.dayIndex, picker.section, exerciseId);
        break;
      case "protocol-swap":
        updateProtocolItem(picker.protocolIndex, picker.itemIndex, { exerciseId });
        break;
      case "protocol-add":
        addProtocolItem(picker.protocolIndex, exerciseId);
        break;
      case "protocol-create":
        addProtocol(picker.name, exerciseId);
        break;
    }
    setPicker(null);
  }

  function startAddProtocol() {
    setAddingProtocol(true);
    setNewProtocolName("");
  }

  function cancelAddProtocol() {
    setAddingProtocol(false);
    setNewProtocolName("");
  }

  // Schema requires dailyProtocols[].items to have at least one entry, so a
  // brand-new protocol can't be created empty — open the picker for its
  // first item immediately, and only actually create the protocol once one
  // is chosen (handlePick's "protocol-create" case). Cancelling the picker
  // leaves nothing behind.
  function confirmAddProtocolName() {
    const name = newProtocolName.trim();
    if (!name) return;
    setPicker({ kind: "protocol-create", name });
    setAddingProtocol(false);
    setNewProtocolName("");
  }

  function handlePublishSubmit() {
    // Fire-and-forget: keep the local copy in sync even though we're about
    // to navigate away on a successful publish.
    void savePlan({
      id: plan.id,
      doc,
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
      sourceSlug: plan.sourceSlug,
      startedAt: plan.startedAt,
    });
  }

  const remixOf = plan.sourceSlug ?? doc.meta.remixOf;
  const publishDoc: PlanDoc = remixOf ? { ...doc, meta: { ...doc.meta, remixOf } } : doc;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-grass-700 hover:underline dark:text-ivory-300">
          ← Back home
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-grass-700 dark:text-ivory-300">
            {saveState === "saving" ? "Saving…" : "Saved ✓"}
          </span>
          <Link
            to={`/plan/${plan.id}/print`}
            className="inline-flex items-center gap-1.5 text-sm text-grass-700 hover:underline dark:text-ivory-300"
          >
            <Icon name="print" />
            Print
          </Link>
          <Link
            to={`/plan/${plan.id}/today`}
            data-testid="start-today-link"
            className="inline-flex items-center gap-2 rounded-full border border-grass-600 px-4 py-2 text-sm font-medium text-grass-800 hover:bg-grass-50 dark:border-ivory-300/50 dark:text-ivory-200 dark:hover:border-ivory-300"
          >
            <Icon name="play" size={13} />
            Start today
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <label htmlFor="plan-name" className="mb-1 block text-sm font-medium text-grass-800 dark:text-ivory-200">
          Plan name
        </label>
        <input
          id="plan-name"
          type="text"
          data-testid="plan-name-input"
          value={doc.meta.name}
          onChange={(e) => updateMeta({ name: e.target.value })}
          className="mb-4 w-full rounded-lg border border-ivory-300 px-3 py-2 text-lg font-semibold text-grass-950 dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
        />

        <label
          htmlFor="plan-description"
          className="mb-1 block text-sm font-medium text-grass-800 dark:text-ivory-200"
        >
          Description
        </label>
        <textarea
          id="plan-description"
          value={doc.meta.description}
          onChange={(e) => updateMeta({ description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-ivory-300 px-3 py-2 text-sm dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-grass-900 dark:text-ivory-100">Days</h2>
        <div className="space-y-6">
          {doc.days.map((day, dayIndex) => (
            <DayEditor
              key={dayIndex}
              day={day}
              dayIndex={dayIndex}
              isFirst={dayIndex === 0}
              isLast={dayIndex === doc.days.length - 1}
              onMoveUp={() => moveDay(dayIndex, -1)}
              onMoveDown={() => moveDay(dayIndex, 1)}
              onLabelChange={(label) => updateDayField(dayIndex, { label })}
              onFocusChange={(focus) => updateDayField(dayIndex, { focus })}
              onExerciseChange={(section, exIndex, patch) => updateExercise(dayIndex, section, exIndex, patch)}
              onRemoveExercise={(section, exIndex) => removeExercise(dayIndex, section, exIndex)}
              onSwapExercise={(section, exIndex, exerciseId) =>
                setPicker({ kind: "day-swap", dayIndex, section, exIndex, exerciseId })
              }
              onAddExercise={(section) => setPicker({ kind: "day-add", dayIndex, section })}
              resolve={(id) => resolveExercise(doc, id)}
            />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-grass-900 dark:text-ivory-100">Daily protocols</h2>
        {doc.dailyProtocols.length > 0 && (
          <div className="space-y-6">
            {doc.dailyProtocols.map((protocol, pIndex) => (
              <div key={pIndex} className="rounded-xl border border-ivory-300 p-4 dark:border-grass-800">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-medium text-grass-900 dark:text-ivory-100">{protocol.name}</h3>
                  <button
                    type="button"
                    onClick={() => removeProtocol(pIndex)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove protocol
                  </button>
                </div>
                {protocol.cue && (
                  <p className="mb-3 text-sm text-grass-700 dark:text-ivory-300">{protocol.cue}</p>
                )}
                <ul className="space-y-2">
                  {protocol.items.map((item, iIndex) => (
                    <ExerciseRow
                      key={iIndex}
                      exercise={item}
                      onChange={(patch) => updateProtocolItem(pIndex, iIndex, patch)}
                      onRemove={() => removeProtocolItem(pIndex, iIndex)}
                      onSwap={() =>
                        setPicker({
                          kind: "protocol-swap",
                          protocolIndex: pIndex,
                          itemIndex: iIndex,
                          exerciseId: item.exerciseId,
                        })
                      }
                      removeDisabled={protocol.items.length <= 1}
                      resolve={(id) => resolveExercise(doc, id)}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPicker({ kind: "protocol-add", protocolIndex: pIndex })}
                  className="mt-3 rounded-lg border border-dashed border-ivory-300 px-3 py-1.5 text-sm text-grass-800/90 hover:border-grass-600 dark:border-grass-700 dark:text-ivory-300 dark:hover:border-ivory-300"
                >
                  + Add exercise
                </button>
              </div>
            ))}
          </div>
        )}

        {addingProtocol ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ivory-300 p-4 dark:border-grass-700">
            <input
              type="text"
              value={newProtocolName}
              onChange={(e) => setNewProtocolName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmAddProtocolName();
                }
              }}
              placeholder="Protocol name"
              aria-label="New protocol name"
              autoFocus
              className="min-w-[10rem] flex-1 rounded-lg border border-ivory-300 px-3 py-2 text-sm dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
            />
            <button
              type="button"
              onClick={confirmAddProtocolName}
              disabled={!newProtocolName.trim()}
              className="rounded-lg bg-grass-900 px-3 py-1.5 text-sm font-medium text-ivory-50 disabled:opacity-50 dark:bg-ivory-200 dark:text-grass-950"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={cancelAddProtocol}
              className="text-sm text-grass-700 hover:underline dark:text-ivory-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAddProtocol}
            className="mt-4 rounded-lg border border-dashed border-ivory-300 px-3 py-1.5 text-sm text-grass-800/90 hover:border-grass-600 dark:border-grass-700 dark:text-ivory-300 dark:hover:border-ivory-300"
          >
            + Add protocol
          </button>
        )}
      </section>

      {actionData && actionData.ok === false && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="mb-1 font-medium">Couldn't publish:</p>
          <ul className="list-disc pl-5">
            {actionData.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <Form
        method="post"
        onSubmit={handlePublishSubmit}
        className="rounded-xl border border-ivory-300 p-4 dark:border-grass-800"
      >
        <input type="hidden" name="doc" value={JSON.stringify(publishDoc)} />
        {remixOf && <input type="hidden" name="remixOf" value={remixOf} />}
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-grass-800 dark:text-ivory-200">
          <Icon name={plan.sourceSlug ? "globe" : "device"} size={14} />
          {plan.sourceSlug ? (
            <>
              Published at{" "}
              <Link to={`/p/${plan.sourceSlug}`} className="underline">
                /p/{plan.sourceSlug}
              </Link>{" "}
              — local edits stay private until you publish again.
            </>
          ) : (
            "Not published — this plan is private to this device."
          )}
        </p>
        <button
          type="submit"
          data-testid="publish-btn"
          className="rounded-full bg-grass-900 px-6 py-3 font-semibold text-ivory-50 hover:bg-grass-700 dark:bg-optic-400 dark:text-grass-950 dark:hover:bg-optic-300"
        >
          Publish & get share link
        </button>
        <p className="mt-2 text-sm text-grass-700 dark:text-ivory-300">
          Published plans are public and can't be edited — publish again for a new version.
        </p>
      </Form>

      {picker && (
        <ExercisePicker
          equipment={doc.meta.equipment}
          currentExerciseId={
            picker.kind === "day-swap" || picker.kind === "protocol-swap" ? picker.exerciseId : undefined
          }
          onSelect={handlePick}
          onCreateCustom={handleCreateCustom}
          onClose={() => setPicker(null)}
        />
      )}
    </main>
  );
}

export default function PlanEdit({ loaderData }: Route.ComponentProps) {
  if (!loaderData) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-grass-900 dark:text-ivory-100">
          This plan isn't on this device
        </h1>
        <p className="mb-6 text-grass-800/80 dark:text-ivory-200/80">
          Plans are stored locally in your browser and don't sync between devices. If you built
          this plan elsewhere, export it there and import the backup file here to bring it back.
        </p>
        <Link
          to="/"
          className="rounded-full bg-grass-900 px-6 py-3 font-semibold text-ivory-50 hover:bg-grass-700 dark:bg-optic-400 dark:text-grass-950 dark:hover:bg-optic-300"
        >
          Back home
        </Link>
      </main>
    );
  }

  return <PlanEditor plan={loaderData} />;
}
