import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/physics/ui";
import { FeedbackSection } from "@/components/FeedbackSection";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About KINETIQ" }] }),
  component: AboutPage,
});

const layers = [
  {
    name: "React + TypeScript",
    body: "Sidebar navigation, the Simulation Lab, graphs and guided experiments. It only sends commands and draws snapshots.",
  },
  {
    name: "WebAssembly bridge",
    body: "An Emscripten module (Embind) exposes the WebAPI facade. State crosses the boundary as one JSON snapshot.",
  },
  {
    name: "C++ physics engine",
    body: "PhysicsEngine drives a World that owns bodies, forces and collisions. All physics runs here.",
  },
];

const oop = [
  [
    "Abstraction",
    "Shape, Force and PhysicsObject are abstract base classes with pure virtual methods.",
  ],
  [
    "Inheritance",
    "Circle, Rectangle and Triangle extend Shape; DynamicObject and StaticObject extend PhysicsObject.",
  ],
  [
    "Polymorphism",
    "World applies every Force and updates every PhysicsObject through base-class pointers.",
  ],
  [
    "Encapsulation",
    "Bodies keep state protected and expose it through accessors; exceptions guard invalid input.",
  ],
  [
    "Composition",
    "A PhysicsObject has a Shape; a World owns its objects, forces and collision manager.",
  ],
  ["Templates", "ObjectManager<T> and clampValue<T> are reusable generic utilities."],
  ["Operator overloading", "Vector2D supports +, −, ×, ÷, ==, != and += for natural vector maths."],
];

const shortcuts = [
  ["Space", "Play or pause"],
  ["N", "Advance one time step"],
  ["R", "Reset to the start of the run"],
];

function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">About KINETIQ</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
          KINETIQ is a 2D physics simulation and learning platform built as an object-oriented
          programming course project. A C++ engine compiled to WebAssembly does the physics; a React
          interface makes it explorable.
        </p>
      </header>

      <section aria-labelledby="arch" className="space-y-3">
        <h2 id="arch" className="text-[18px] font-semibold tracking-tight">
          Architecture
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {layers.map((layer, i) => (
            <div key={layer.name} className="glass rounded-lg p-4">
              <p className="text-[12px] text-muted-foreground">Layer {i + 1}</p>
              <h3 className="mt-0.5 text-[15px] font-semibold">{layer.name}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {layer.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Object-oriented design" subtitle="Concepts used in the C++ engine today">
          <dl className="divide-y divide-border">
            {oop.map(([term, text]) => (
              <div key={term} className="grid gap-1 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
                <dt className="text-[13.5px] font-medium">{term}</dt>
                <dd className="text-[13.5px] leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Lab shortcuts" subtitle="Active on the Simulation Lab page">
          <dl className="space-y-2.5">
            {shortcuts.map(([key, text]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <dd className="text-[13.5px] text-muted-foreground">{text}</dd>
                <dt>
                  <kbd className="tech rounded border border-border bg-secondary px-2 py-0.5 text-[12px] font-medium">
                    {key}
                  </kbd>
                </dt>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
<FeedbackSection />
    </main>
  );
}
