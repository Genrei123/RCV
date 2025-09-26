export function Dashboard() {
    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
            <p className="text-gray-600 mb-6 md:mb-8">Welcome to the RCV Product Verification System.</p>

            <div className="grid gap-6">
                <div className="bg-gray-50 p-4 md:p-6 rounded-lg border-l-4 border-blue-500">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-3">System Overview</h2>
                    <p className="text-gray-600">Monitor your product verification system performance and metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Total Products</h3>
                            <span className="text-2xl">📦</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">1,234</p>
                        <p className="text-sm text-gray-500 mt-2">+12% from last month</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Blockchain Blocks</h3>
                            <span className="text-2xl">🔗</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">5,678</p>
                        <p className="text-sm text-gray-500 mt-2">+8% from last month</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Total Scans</h3>
                            <span className="text-2xl">📱</span>
                        </div>
                        <p className="text-3xl font-bold text-purple-600">9,876</p>
                        <p className="text-sm text-gray-500 mt-2">+25% from last month</p>
                    </div>
                </div>
            </div>
        </div>
    );
}