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
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import * as XLSX from "xlsx";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAge, setCustomerAge] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerStatus, setCustomerStatus] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [filterAgeMin, setFilterAgeMin] = useState("");
  const [filterAgeMax, setFilterAgeMax] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersStatus, setCustomersStatus] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");

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
        getDoc(doc(db, "users", user.uid)).then((snap) => {
          const d = snap.data();
          setUserDisplayName((d && d.name) || user.email || "User");
        }).catch(() => setUserDisplayName(user.email || "User"));
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
        location: customerLocation.trim() || null,
        userId: currentUser.uid
      });

      setCustomerEmail("");
      setCustomerName("");
      setCustomerAge("");
      setCustomerLocation("");
      setCustomerStatus("Customer saved.");
      if (currentUser) {
        setTimeout(() => loadCustomers(currentUser.uid), 2000);
      }
    } catch (error) {
      setCustomerStatus(error.message || "Failed to save customer");
    } finally {
      setCustomerSaving(false);
    }
  }

  function filterCustomers(customerList) {
    let list = customerList;
    if (filterAgeMin !== "" || filterAgeMax !== "") {
      const min = filterAgeMin === "" ? -Infinity : Number(filterAgeMin);
      const max = filterAgeMax === "" ? Infinity : Number(filterAgeMax);
      list = list.filter((c) => {
        const age = c.age;
        if (age == null || age === undefined) return false;
        return age >= min && age <= max;
      });
    }
    if (filterLocation.trim() !== "") {
      const loc = filterLocation.trim().toLowerCase();
      list = list.filter((c) => {
        const cLoc = (c.location || "").toLowerCase();
        return cLoc.includes(loc);
      });
    }
    return list;
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
      const allCustomers = snapshot.docs.map((docItem) => docItem.data());
      const filtered = filterCustomers(allCustomers);
      const recipients = filtered
        .map((c) => c.email)
        .filter((email) => typeof email === "string" && email.length > 0);

      if (!recipients.length) {
        setSendStatus(
          allCustomers.length === 0
            ? "No customers found for this account."
            : "No customers match the current age/location filter."
        );
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

  function normalizeHeader(h) {
    if (typeof h !== "string") return "";
    return h.trim().toLowerCase().replace(/\s+/g, " ");
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!currentUser || !importFile) return;
    setImportStatus("");
    setImporting(true);
    try {
      const data = await importFile.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
      if (!rows.length) {
        setImportStatus("File is empty.");
        setImporting(false);
        return;
      }
      const rawHeaders = rows[0].map((h) => normalizeHeader(h));
      const emailIdx = rawHeaders.findIndex((h) => h === "email");
      const nameIdx = rawHeaders.findIndex((h) => h === "name");
      const ageIdx = rawHeaders.findIndex((h) => h === "age");
      const locationIdx = rawHeaders.findIndex((h) => h === "location");
      if (emailIdx === -1) {
        setImportStatus("Sheet must have an 'email' column.");
        setImporting(false);
        return;
      }
      let added = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const email = (row[emailIdx] != null && String(row[emailIdx]).trim()) || "";
        if (!email) continue;
        await addDoc(collection(db, "customers"), {
          email: email.trim(),
          name: nameIdx >= 0 && row[nameIdx] != null ? String(row[nameIdx]).trim() || null : null,
          age: ageIdx >= 0 && row[ageIdx] !== "" && row[ageIdx] != null ? Number(row[ageIdx]) || null : null,
          location: locationIdx >= 0 && row[locationIdx] != null ? String(row[locationIdx]).trim() || null : null,
          userId: currentUser.uid
        });
        added++;
      }
      setImportStatus(`Imported ${added} customer(s).`);
      setImportFile(null);
      setTimeout(() => loadCustomers(currentUser.uid), 500);
    } catch (err) {
      setImportStatus(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
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
            Welcome, {userDisplayName}. Add customers and send a bulk email to everyone.
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
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Location (optional)
              </label>
              <input
                type="text"
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
                placeholder="e.g. New York"
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
            Optionally filter by age and location, then send to matching customers.
          </p>

          <form onSubmit={handleSendMail} className="mt-4 space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">
                Filter recipients (optional)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-slate-500">
                    Age min
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filterAgeMin}
                    onChange={(e) => setFilterAgeMin(e.target.value)}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">
                    Age max
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filterAgeMax}
                    onChange={(e) => setFilterAgeMax(e.target.value)}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="e.g. NYC"
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
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
        <h2 className="text-lg font-semibold">Import from Excel / CSV</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a file with columns: <strong>email</strong> (required), name, age, location. Use the template if needed.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <a
            href="/customers-template.csv"
            download="customers-template.csv"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
          >
            Download template (CSV)
          </a>
          <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
              {importFile ? importFile.name : "Choose file"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </label>
            <div
              className="rounded-md border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) setImportFile(f);
              }}
            >
              or drag file here
            </div>
            <button
              type="submit"
              disabled={!importFile || importing}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </form>
        </div>
        {importStatus && <p className="mt-2 text-sm text-slate-600">{importStatus}</p>}
      </section>

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
                    {(customer.name || customer.age != null || customer.location) && (
                      <p className="text-xs text-slate-500">
                        {customer.name && <span>{customer.name}</span>}
                        {customer.name && (customer.age != null || customer.location) && <span> · </span>}
                        {customer.age != null && <span>Age {customer.age}</span>}
                        {customer.age != null && customer.location && <span> · </span>}
                        {customer.location && <span>{customer.location}</span>}
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

