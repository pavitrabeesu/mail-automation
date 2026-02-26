export default function HomePage() {
    const sections = [
      {
        title: "Automate customer emailing",
        body: "Save time by sending one message to all your customers in a few clicks."
      },
      {
        title: "Simple customer management",
        body: "Store customer emails (plus optional name and age) in one clean dashboard."
      },
      {
        title: "Reliable delivery",
        body: "Emails are sent through Resend, a modern email delivery platform for businesses."
      },
      {
        title: "Secure and cloud hosted",
        body: "Authentication and data storage are handled by Firebase Auth and Firestore."
      }
    ];
  
    return (
      <div className="space-y-10">
        <section className="mt-4 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">
            Simple Business Bulk Email Tool
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Create an account, add your customer emails, write a subject and message,
            and send to everyone at once. No complicated settings, just the essentials.
          </p>
        </section>
  
        <section className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{section.body}</p>
            </div>
          ))}
        </section>
      </div>
    );
  }
  