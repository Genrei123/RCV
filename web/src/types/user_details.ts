export interface Activity {
    id: string;
    action: string;
    date: string;
    time: string;
    type: 'Logged Out' | 'Removed' | 'Archived' | 'Logged In';
    username: string;
}