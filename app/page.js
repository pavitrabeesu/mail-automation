import Link from "next/link";

const features = [
  {
    title: "Automate customer emailing",
    body: "Save time by sending one message to all your customers in a few clicks.",
    accent: "indigo"
  },
  {
    title: "Simple customer management",
    body: "Store customer emails plus optional name, age and location in one clean dashboard.",
    accent: "emerald"
  },
  {
    title: "Reliable delivery",
    body: "Emails are sent through your own SMTP so you stay in control of deliverability.",
    accent: "amber"
  },
  {
    title: "Excel integration",
    body: "Upload or drag a spreadsheet—CSV or Excel—and bulk add customers. Use our template and you’re ready to go.",
    accent: "teal"
  },
  {
    title: "Filter for targeted audience",
    body: "Send only to the right people. Filter by age and location, then send your message to that list.",
    accent: "violet"
  }
];

const accentBorder = {
  indigo: "border-l-indigo-500",
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  teal: "border-l-teal-500",
  violet: "border-l-violet-500"
};

export default function HomePage() {
  return (
    <div className="min-h-[80vh]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
            Bulk Email for Business
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Send once.
            <br />
            <span className="text-indigo-300">Reach everyone.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Create an account, add your customer emails, write a subject and message,
            and send to everyone at once. No complicated settings—just the essentials.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-slate-500 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-12 sm:mt-16 lg:mt-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
            {features.map((item) => (
              <div
                key={item.title}
                className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${accentBorder[item.accent]} border-l-4`}
              >
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA strip */}
      <section className="mt-12 sm:mt-16 lg:mt-20">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Ready to reach your customers?
            </h2>
            <p className="mt-3 text-slate-600">
              Join businesses that save time with simple bulk email.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create free account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
