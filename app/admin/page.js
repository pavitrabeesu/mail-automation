"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoadError("");
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const customersSnap = await getDocs(collection(db, "customers"));

        const customerCountByUid = {};
        customersSnap.docs.forEach((doc) => {
          const data = doc.data();
          const uid = data.userId;
          if (uid) customerCountByUid[uid] = (customerCountByUid[uid] || 0) + 1;
        });

        const list = usersSnap.docs.map((doc) => {
          const data = doc.data();
          const uid = data.uid || doc.id;
          return {
            uid,
            email: data.email || "",
            customerCount: customerCountByUid[uid] || 0
          };
        });

        setBusinesses(list);
      } catch (err) {
        setLoadError(err.message || "Failed to load data. Check Firestore rules allow read on users and customers.");
      }
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="text-sm text-slate-600">Checking login...</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Registered businesses and how many customers each has added.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          Dashboard
        </Link>
      </div>

      {loadError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700">
                Business email
              </th>
              <th className="px-4 py-3 font-medium text-slate-700">
                Customer count
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.length === 0 && !loadError && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                  No registered businesses yet.
                </td>
              </tr>
            )}
            {businesses.map((b) => (
              <tr key={b.uid}>
                <td className="px-4 py-3">{b.email || "—"}</td>
                <td className="px-4 py-3">{b.customerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
