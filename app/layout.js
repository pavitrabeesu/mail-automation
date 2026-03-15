"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";
import Link from "next/link";
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function RootLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUserName("");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.data();
        setUserName((data && data.name) || u.email || "User");
      } catch {
        setUserName(u.email || "User");
      }
    });
    return () => unsub();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Bulk Email System
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                href="/admin"
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                Admin
              </Link>
              {user ? (
                <>
                  <span className="text-sm text-slate-600">
                    Welcome, {userName}
                  </span>
                  <Link
                    href="/dashboard"
                    className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
