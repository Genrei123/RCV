import { PageContainer } from "@/components/PageContainer"

export function ScanHistory() {
    return (
        <PageContainer 
            title="Scan History" 
            description="View all product scans and verification results"
        >

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Recent Scans</h2>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        {[
                            { id: 'SCAN-001', product: 'Premium Coffee Beans', user: 'Inspector A', result: 'Verified', time: '10 mins ago' },
                            { id: 'SCAN-002', product: 'Organic Green Tea', user: 'Inspector B', result: 'Verified', time: '25 mins ago' },
                            { id: 'SCAN-003', product: 'Unknown Product', user: 'Inspector A', result: 'Failed', time: '1 hour ago' },
                        ].map((scan) => (
                            <div key={scan.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{scan.product}</h3>
                                    <p className="text-sm text-gray-600">Scanned by {scan.user} • {scan.time}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${scan.result === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {scan.result}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}