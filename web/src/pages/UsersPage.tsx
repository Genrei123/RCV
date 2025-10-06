import { PageContainer } from "@/components/PageContainer"

interface UserPageProps {
    
    
}

export function UsersPage(props: UserPageProps) {
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

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                </div>

                <div className="p-6">
                    <div className="grid gap-4">
                        {[
                            { name: 'John Admin', email: 'admin@rcv.com', role: 'Administrator', status: 'Active' },
                            { name: 'Maria Inspector', email: 'maria@rcv.com', role: 'Inspector', status: 'Active' },
                            { name: 'Carlos User', email: 'carlos@rcv.com', role: 'User', status: 'Inactive' },
                        ].map((user, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                                        <p className="text-sm text-gray-600">{user.email} • {user.role}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {user.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}