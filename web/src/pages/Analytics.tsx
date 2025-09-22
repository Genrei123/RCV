export function Analytics() {
    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Analytics</h1>
            <p className="text-gray-600 mb-6 md:mb-8">View system analytics and performance metrics.</p>

            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600">Daily Scans</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-2">342</p>
                        <p className="text-xs text-green-600 mt-1">↗ +8.2%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
                        <p className="text-2xl font-bold text-green-600 mt-2">98.5%</p>
                        <p className="text-xs text-green-600 mt-1">↗ +1.2%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
                        <p className="text-2xl font-bold text-purple-600 mt-2">127</p>
                        <p className="text-xs text-green-600 mt-1">↗ +5.4%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600">Response Time</h3>
                        <p className="text-2xl font-bold text-orange-600 mt-2">1.2s</p>
                        <p className="text-xs text-red-600 mt-1">↘ -0.3s</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Usage Trends</h2>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">📊 Chart visualization would go here</p>
                    </div>
                </div>
            </div>
        </div>
    );
}