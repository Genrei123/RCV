import { apiClient } from "./axiosConfig";

interface UserPageApiResponse {

}

export class UserPageService {
    static async getAllUsers() {
        const response = apiClient.get('/user/users');
        return response;

        // TO DO?
    }
}