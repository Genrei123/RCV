import type { Company } from "@/typeorm/entities/company.entity";
import { apiClient } from "./axiosConfig";

export interface CompanyApiResponse {
  companies?: Company[];
  data?: Company[];
  pagination?: any;
  links?: any;
}

export interface CreateCompanyRequest {
  name: string;
  address: string;
  licenseNumber: string;
}

export interface CreateCompanyResponse {
  message: string;
  company: Company;
}

export class CompanyService {
  static async getAllCompanies() {
    try {
      const response = await apiClient.get<CompanyApiResponse>(
        "/company/companies"
      );
      const payload = response.data;
      // normalize to { companies: Company[] }
      const companies = payload.companies || payload.data || [];
      return {
        companies,
        pagination: payload.pagination,
        links: payload.links,
      };
    } catch (error) {
      console.error("Error fetching companies:", error);
      throw error;
    }
  }

  // New: fetch a specific page of companies from the server
  static async getCompaniesPage(page = 1, limit = 10, search?: string) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search && search.trim().length > 0) {
        params.append("search", search.trim());
      }
      const response = await apiClient.get<CompanyApiResponse>(
        `/company/companies?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching companies page:", error);
      throw error;
    }
  }

  static async createCompany(companyData: CreateCompanyRequest) {
    try {
      const response = await apiClient.post<CreateCompanyResponse>(
        "/company/companies",
        companyData
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating company:", error);
      throw error;
    }
  }

  static async getCompanyById(id: string) {
    try {
      const response = await apiClient.get<{ company: Company }>(
        `/company/companies/${id}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching company:", error);
      throw error;
    }
  }

  static async updateCompany(id: string, companyData: Partial<Company>) {
    try {
      const response = await apiClient.put<{ company: Company }>(
        `/company/companies/${id}`,
        companyData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating company:", error);
      throw error;
    }
  }

  static async deleteCompany(id: string) {
    try {
      const response = await apiClient.delete<{ message: string }>(
        `/company/companies/${id}`
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting company:", error);
      throw error;
    }
  }
}
