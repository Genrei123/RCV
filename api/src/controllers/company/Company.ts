import CustomError from "../../utils/CustomError";
import { Request, Response, NextFunction } from "express";
import { CompanyValidation  } from "../../typeorm/entities/company.entity";
import { uuidv4 } from "zod";
import { CompanyRepo } from "../../typeorm/data-source";

export const getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companies = await CompanyRepo.find();
        res.status(200).json({ companies });
    } catch (error) {
        return new CustomError(500, "Failed to all retrieve companies");
    }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
    if (!CompanyValidation.parse({ id: req.params.id }) ) {
        return new CustomError(400, "Invalid Company ID");
    }
    try {
        // Logic to get a company by ID
        res.status(200).json({ message: `Company with ID ${req.params.id} retrieved successfully` });
    } catch (error) {
        return new CustomError(500, "Failed to retrieve company");
    }
        return CustomError.security(400, 'Invalid user data', );
}

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
    const Company = CompanyValidation.safeParse(req.body);
    if (Company.error) {
        return next(new CustomError(400, "Invalid Company Data or missing parameters", { body: req.body }));
    }
    
    if (await CompanyRepo.findOneBy({ licenseNumber: Company.data.licenseNumber })) {
        return next(new CustomError(400, "Company with license number already exists", { company: Company.data.licenseNumber }));
    }

    CompanyRepo.save(Company.data);
    return res.status(200).json({ message: "Company successfully registered", company: Company.data });
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    if (!CompanyValidation.parse({ _id: req.params.id, ...req.body })) {
        return new CustomError(400, "Invalid Company Data");
    }
    try {
        const company = await CompanyRepo.findOneBy({ _id: req.params.id });
        if (!company) {
            return new CustomError(404, "Company not found");
        }
        CompanyRepo.merge(company, req.body);
        await CompanyRepo.save(company);
        res.status(200).json({ company });
    } catch (error) {
        return new CustomError(500, "Failed to update company");
    }
};

export const partialUpdateCompany = async (req: Request, res: Response, next: NextFunction) => {
    if (!CompanyValidation.parse({ id: req.params.id, ...req.body })) {
        return new CustomError(400, "Invalid Company Data");
    }
    try {
        const company = await CompanyRepo.findOneBy({ _id: req.params.id });
        if (!company) {
            return new CustomError(404, "Company not found");
        }
        CompanyRepo.merge(company, req.body);
        await CompanyRepo.save(company);
        res.status(200).json({ company });
    } catch (error) {
        return new CustomError(500, "Failed to partially update company");
    }
};

export const deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    if (!CompanyValidation.parse({ id: req.params.id })) {
        return new CustomError(400, "Invalid Company ID");
    }
    try {
        const result = await CompanyRepo.delete(req.params.id);
        if (result.affected === 0) {
            return new CustomError(404, "Company not found");
        }
        res.status(200).json({ message: "Company deleted successfully" });
    }
    catch (error) {
        return new CustomError(500, "Failed to delete company");
    }
};

        

