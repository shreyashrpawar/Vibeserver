"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Server,
  Activity,
  ShieldCheck,
  MoreVertical,
  Trash2,
  Edit2,
  Plus,
  Search,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Registration form state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regMessage, setRegMessage] = useState("");

  // Edit form state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserPassword, setEditingUserPassword] = useState("");

  // Change Password Modal state (Self-Service)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changePasswordMsg, setChangePasswordMsg] = useState("");

  useEffect(() => {
    fetch("/api/me", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
        if (data.role === "admin") {
          fetchUsers();
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMsg("");

    try {
      const res = await fetch("/api/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        setChangePasswordMsg("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setTimeout(() => setIsChangePasswordOpen(false), 1500);
      } else {
        setChangePasswordMsg(data.message || "Failed to change password");
      }
    } catch (err) {
      setChangePasswordMsg("Error changing password");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setRegMessage(data.message || "Registration failed");
      } else {
        setRegMessage("User registered successfully!");
        setRegUsername("");
        setRegEmail("");
        setRegPassword("");
        fetchUsers(); // Refresh list
        setTimeout(() => {
          setIsRegModalOpen(false);
          setRegMessage("");
        }, 1000);
      }
    } catch (err) {
      setRegMessage("Error registering user");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      alert("Error deleting user");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const payload: any = { ...editingUser };
    if (editingUserPassword) {
      payload.password = editingUserPassword;
    }

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.ok) {
        setEditingUser(null);
        setEditingUserPassword("");
        fetchUsers();
      } else {
        alert("Failed to update user");
      }
    } catch (error) {
      alert("Error updating user");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        Loading dashboard resources...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up p-6 md:p-8">
      {/* Header with Breadcrumb-like feel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Welcome back, <span className="text-blue-600 dark:text-blue-400 font-medium">{user?.username}</span>. Here's what's happening with your server.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-white/10"
          >
            Manage Account
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => setIsRegModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              New User
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 backdrop-blur-sm relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
              <Server className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">HEALTHY</span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">System Status</h3>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">Operational</p>
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="w-24 h-24 text-blue-500" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 backdrop-blur-sm relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Users</h3>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{allUsers.length || 1}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 backdrop-blur-sm relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-500 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded">v1.0.0</span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Security Level</h3>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">Standard</p>
        </div>
      </div>

      {/* Admin: User Management */}
      {user?.role === "admin" && (
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-sm">
          <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Team Members</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage access and roles for your infrastructure.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-zinc-50 dark:bg-white/5 text-xs uppercase font-medium text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-gradient-to-tr dark:from-blue-500 dark:to-purple-500 flex items-center justify-center text-indigo-700 dark:text-white font-bold text-xs">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">{u.username}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                        {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                        {u.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allUsers.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No users found.
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Create New User</h3>
              <button onClick={() => setIsRegModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {regMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${regMessage.includes("success") ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {regMessage}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none placeholder-slate-600"
                    placeholder="jdoe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none placeholder-slate-600"
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none placeholder-slate-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsRegModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium">Create User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none [&>option]:bg-slate-900"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none [&>option]:bg-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">New Password <span className="text-slate-500 text-xs">(leave blank to keep)</span></label>
                  <input
                    type="password"
                    value={editingUserPassword}
                    onChange={(e) => setEditingUserPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                    placeholder="New password"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Account Security</h3>
              <button onClick={() => setIsChangePasswordOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {changePasswordMsg && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${changePasswordMsg.includes("success") ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {changePasswordMsg}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500/50 focus:outline-none"
                    required
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium">Update Password</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
