export function Products() {
    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Products</h1>
            <p className="text-gray-600 mb-6 md:mb-8">Manage and view all registered products in the system.</p>

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <h2 className="text-xl font-semibold text-gray-800">Product Database</h2>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Add New Product
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid gap-4">
                        {[
                            { id: 'PROD-001', name: 'Premium Coffee Beans', type: 'Food', status: 'Active' },
                            { id: 'PROD-002', name: 'Organic Green Tea', type: 'Beverage', status: 'Active' },
                            { id: 'PROD-003', name: 'Vitamin D Supplements', type: 'Health', status: 'Pending' },
                        ].map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                                    <p className="text-sm text-gray-600">ID: {product.id} | Type: {product.type}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {product.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}