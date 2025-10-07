import { PageContainer } from "@/components/PageContainer"

export function Blockchain() {
    return (
        <PageContainer 
            title="Blockchain" 
            description="View and manage blockchain records for product verification"
        >

            <div className="grid gap-6">
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Blockchain Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">99.9%</div>
                            <div className="text-sm text-gray-600">Uptime</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">5,678</div>
                            <div className="text-sm text-gray-600">Total Blocks</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">12.5s</div>
                            <div className="text-sm text-gray-600">Avg Block Time</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Blocks</h2>
                    <div className="space-y-3">
                        {[
                            { height: 5678, hash: '0x1a2b3c...', time: '2 mins ago', txs: 3 },
                            { height: 5677, hash: '0x4d5e6f...', time: '5 mins ago', txs: 2 },
                            { height: 5676, hash: '0x7g8h9i...', time: '8 mins ago', txs: 5 },
                        ].map((block) => (
                            <div key={block.height} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-800">Block #{block.height}</div>
                                    <div className="text-sm text-gray-600">{block.hash}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-800">{block.txs} transactions</div>
                                    <div className="text-xs text-gray-500">{block.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}