import { PageContainer } from "@/components/PageContainer"

export function SettingsPage() {
    return (
        <PageContainer 
            title="Settings" 
            description="Configure system settings and preferences"
        >

            <div className="grid gap-6">
                <div className="bg-white rounded-lg shadow border border-neutral-200 p-6">
                    <h2 className="text-xl font-semibold text-neutral-800 mb-4">System Configuration</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                            <div>
                                <h3 className="font-medium text-neutral-800">Blockchain Difficulty</h3>
                                <p className="text-sm text-neutral-600">Current mining difficulty level</p>
                            </div>
                            <select className="border border-neutral-300 rounded-lg px-3 py-2">
                                <option>4 (Current)</option>
                                <option>3</option>
                                <option>5</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                            <div>
                                <h3 className="font-medium text-neutral-800">Auto-verification</h3>
                                <p className="text-sm text-neutral-600">Automatically verify scanned products</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <h3 className="font-medium text-neutral-800">API Rate Limiting</h3>
                                <p className="text-sm text-neutral-600">Requests per minute limit</p>
                            </div>
                            <input type="number" className="border border-neutral-300 rounded-lg px-3 py-2 w-20" defaultValue="100" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-neutral-200 p-6">
                    <h2 className="text-xl font-semibold text-neutral-800 mb-4">Security Settings</h2>
                    <div className="space-y-4">
                        <button className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Reset API Keys
                        </button>
                        <button className="w-full md:w-auto bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors ml-0 md:ml-3">
                            Backup Database
                        </button>
                        <button className="w-full md:w-auto bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors ml-0 md:ml-3">
                            Clear Cache
                        </button>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}