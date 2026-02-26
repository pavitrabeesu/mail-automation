"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAge, setCustomerAge] = useState("");
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerStatus, setCustomerStatus] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersStatus, setCustomersStatus] = useState("");

  async function loadCustomers(userId) {
    if (!userId) return;
    setCustomersLoading(true);
    setCustomersStatus("");

    try {
      const q = query(
        collection(db, "customers"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }));
      setCustomers(items);

      if (!items.length) {
        setCustomersStatus("No customers saved yet.");
      }
    } catch (error) {
      setCustomersStatus(error.message || "Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCurrentUser(null);
        setAuthLoading(false);
        router.push("/login");
      } else {
        setCurrentUser(user);
        setAuthLoading(false);
        loadCustomers(user.uid);
      }
    });

    return () => unsub();
  }, [router]);

  async function handleAddCustomer(event) {
    event.preventDefault();
    if (!currentUser) return;

    setCustomerStatus("");
    setCustomerSaving(true);

    try {
      await addDoc(collection(db, "customers"), {
        email: customerEmail,
        name: customerName || null,
        age: customerAge ? Number(customerAge) : null,
        userId: currentUser.uid
      });

      setCustomerEmail("");
      setCustomerName("");
      setCustomerAge("");
      setCustomerStatus("Customer saved.");
    } catch (error) {
      setCustomerStatus(error.message || "Failed to save customer");
    } finally {
      setCustomerSaving(false);
    }
  }

  async function handleSendMail(event) {
    event.preventDefault();
    if (!currentUser) return;

    setSendStatus("");
    setSending(true);

    try {
      const q = query(
        collection(db, "customers"),
        where("userId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const customers = snapshot.docs.map((docItem) => docItem.data());
      const recipients = customers
        .map((c) => c.email)
        .filter((email) => typeof email === "string" && email.length > 0);

      if (!recipients.length) {
        setSendStatus("No customers found for this account.");
        setSending(false);
        return;
      }

      await Promise.all(
        recipients.map((email) =>
          fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              to: email,
              subject,
              body
            })
          })
        )
      );

      await addDoc(collection(db, "messages"), {
        subject,
        body,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      setSendStatus(
        `Email sent to ${recipients.length} customer${
          recipients.length === 1 ? "" : "s"
        }.`
      );
      setSubject("");
      setBody("");
    } catch (error) {
      setSendStatus(error.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteCustomer(id) {
    if (!currentUser || !id) return;

    try {
      await deleteDoc(doc(db, "customers", id));
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      setCustomersStatus(error.message || "Failed to delete customer");
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (authLoading) {
    return (
      <div className="text-sm text-slate-600">
        Checking your session...
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add customers and send a bulk email to everyone.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold">Add customer</h2>
          <p className="mt-1 text-sm text-slate-600">
            Store customer email and optional details.
          </p>

          <form onSubmit={handleAddCustomer} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Name (optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Age (optional)
              </label>
              <input
                type="number"
                min="0"
                value={customerAge}
                onChange={(e) => setCustomerAge(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {customerStatus && (
              <p className="text-sm text-slate-600">
                {customerStatus}
              </p>
            )}

            <button
              type="submit"
              disabled={customerSaving}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {customerSaving ? "Saving..." : "Save customer"}
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold">Send mail</h2>
          <p className="mt-1 text-sm text-slate-600">
            Write a subject and message and send to all your customers.
          </p>

          <form onSubmit={handleSendMail} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                required
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {sendStatus && (
              <p className="text-sm text-slate-600">
                {sendStatus}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? "Sending..." : "Send mail"}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your customers</h2>
            <p className="mt-1 text-sm text-slate-600">
              View all saved customer emails and remove any you no longer need.
            </p>
          </div>
          <button
            type="button"
            onClick={() => currentUser && loadCustomers(currentUser.uid)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4">
          {customersLoading && (
            <p className="text-sm text-slate-600">Loading customers...</p>
          )}

          {!customersLoading && customersStatus && (
            <p className="text-sm text-slate-600">{customersStatus}</p>
          )}

          {!customersLoading && customers.length > 0 && (
            <ul className="divide-y divide-slate-200 text-sm">
              {customers.map((customer) => (
                <li
                  key={customer.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium">{customer.email}</p>
                    {(customer.name || customer.age) && (
                      <p className="text-xs text-slate-500">
                        {customer.name && <span>{customer.name}</span>}
                        {customer.name && customer.age && <span> · </span>}
                        {customer.age && <span>Age {customer.age}</span>}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

