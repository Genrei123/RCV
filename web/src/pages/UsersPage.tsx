import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";

type User = {
  id: number;
  name: string;
  email: string;
  status: "Pending" | "Admin" | "Agent";
  reason?: string; // kapag declined
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: "Juan Dela Cruz", email: "juan@example.com", status: "Pending" },
    { id: 2, name: "Maria Santos", email: "maria@example.com", status: "Admin" },
    { id: 3, name: "Pedro Reyes", email: "pedro@example.com", status: "Agent" },
  ]);

  const handleAccept = (id: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: "Agent" } : u
      )
    );
  };

  const handleDecline = (id: number, reason: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: "Pending", reason } : u
      )
    );
  };

  return (
    <PageContainer
      title="Users"
      description="Manage system users and their permissions"
      headerAction={
        <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          Add New User
        </button>
      }
    >
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Management</h2>

        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">{user.name}</td>
                <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                <td className="border border-gray-300 px-4 py-2">{user.status}</td>
                <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                  {user.status === "Pending" ? (
                    <>
                      <button
                        onClick={() => handleAccept(user.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(user.id, "Incomplete requirements")}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
