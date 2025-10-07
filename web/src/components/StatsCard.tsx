import { Card, CardContent } from "@/components/ui/card"
import type { ReactNode } from "react"

interface StatCardProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    bgColor?: string;
}

export function StatsCard({ icon, label, value, bgColor = "bg-green-50" }: StatCardProps) {
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${bgColor}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                            {label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}