import { Badge } from "lucide-react"
import { DataTable, type Column } from "@/components/DataTable"
import { PageContainer } from "@/components/PageContainer"
import { useState, useEffect } from "react"
import type { User } from "@/typeorm/entities/user.entity"
import { Button } from "@/components/ui/button"
import { AuthService } from "@/services/authService"

export interface DashboardProps {
    success?: boolean;
    users?: User[];
}

export function Dashboard(props: DashboardProps) {
    const [, setSearch] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const getGreeting = (): string => {
        if (!currentUser) return "Hello 👋";
        const firstName = currentUser.firstName || "User";
        return `Hello ${firstName} 👋`;
    };
    const columns: Column[] = [
        {
            key: "_id",
            label: "User ID"
        },
        {
            key: "firstName",
            label: "First Name"
        },
        {
            key: "lastName",
            label: "Last Name"
        },
        {
            key: "email",
            label: "Email"
        },
        {
            key: "role",
            label: "Role",
            render: (value: number) => {
                const roleMap: { [key: number]: { label: string; variant: "default" | "secondary" | "destructive" } } = {
                    1: { label: "Agent", variant: "default" },
                    2: { label: "Admin", variant: "secondary" },
                    3: { label: "Super Admin", variant: "destructive" }
                };
                const role = roleMap[value] || { label: "Unknown", variant: "default" };
                return <Badge>{role.label}</Badge>;
            }
        },
        {
            key: "createdAt",
            label: "Created At",
            render: (value: string) => {
                return new Date(value).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row: User) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(row)}
                    >
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(row)}
                    >
                        Deny
                    </Button>
                </div>
            )
        }
    ];

    const handleApprove = (user: User) => {
        // Implement approve logic here
    }

    const handleDeny = (user: User) => {
        // Implement deny logic here
    }

    const onSearch = (query: string) => {
        setSearch(query);
    }


    return (
        <PageContainer title={getGreeting()}>
            <DataTable
                title="Users"
                columns={columns}
                data={props.users || []}
                searchPlaceholder="Search users..."
                onSearch={(query) => onSearch(query)}
                onSort={(sortKey) => console.log("Sort by:", sortKey)}
                loading={false}
                emptyStateTitle="No Users Found"
                emptyStateDescription="You may try to input different keywords, check for typos, or adjust your filters."
            />
        </PageContainer>
    );
}