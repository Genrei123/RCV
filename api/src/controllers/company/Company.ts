import CustomError from "../../utils/CustomError";
import { Request, Response, NextFunction } from "express";
import { CompanyValidation } from "../../typeorm/entities/company.entity";
import { uuidv4 } from "zod";
import { CompanyRepo } from "../../typeorm/data-source";
import {
  parsePageParams,
  buildPaginationMeta,
  buildLinks,
} from "../../utils/pagination";
import { AuditLogService } from "../../services/auditLogService";
import { redisService } from "../../services/redisService";

export const getAllCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    try {
      const cachedData = await redisService.getCachedCompanies(page, limit, search);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }
    } catch (redisError) {
      console.warn("Redis cache failed, using database:", redisError instanceof Error ? redisError.message : 'Unknown error');
    }    let companies: any[] = [];
    let total = 0;

    if (search) {
      const qb = CompanyRepo.createQueryBuilder("company")
        .where("LOWER(company.name) LIKE LOWER(:q)", {
          q: `%${search}%`,
        })
        .orWhere("LOWER(company.address) LIKE LOWER(:q)", {
          q: `%${search}%`,
        })
        .orWhere("LOWER(company.licenseNumber) LIKE LOWER(:q)", {
          q: `%${search}%`,
        })
        .orderBy("company.name", "ASC")
        .skip(skip)
        .take(limit);
      [companies, total] = await qb.getManyAndCount();
    } else {
      [companies, total] = await CompanyRepo.findAndCount({
        skip,
        take: limit,
        order: { name: "ASC" },
      });
    }

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    const responseData = { success: true, data: companies, pagination: meta, links };

    // Cache the result for 5 minutes (change nalang if needed)
    try {
      await redisService.setCachedCompanies(page, limit, responseData, search, 300);
    } catch (redisError) {
      console.warn("Failed to cache companies:", redisError instanceof Error ? redisError.message : 'Unknown error');
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return next(new CustomError(500, "Failed to retrieve companies"));
  }
};

export const getCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!CompanyValidation.parse({ id: req.params.id })) {
    return new CustomError(400, "Invalid Company ID");
  }
  try {
    // Logic to get a company by ID
    res
      .status(200)
      .json({
        message: `Company with ID ${req.params.id} retrieved successfully`,
      });
  } catch (error) {
    return new CustomError(500, "Failed to retrieve company");
  }
  return CustomError.security(400, "Invalid user data");
};

export const createCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get authenticated user from request
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    const Company = CompanyValidation.safeParse(req.body);
    if (Company.error) {
      return next(
        new CustomError(400, "Invalid Company Data or missing parameters", {
          body: req.body,
          errors: Company.error.issues,
        })
      );
    }

    if (
      await CompanyRepo.findOneBy({ licenseNumber: Company.data.licenseNumber })
    ) {
      return next(
        new CustomError(400, "Company with license number already exists", {
          company: Company.data.licenseNumber,
        })
      );
    }

    const savedCompany = await CompanyRepo.save(Company.data);
    
    // Clear companies cache when new company is created
    try {
      await redisService.invalidateCompaniesCache();
    } catch (redisError) {
      console.warn("Failed to clear companies cache:", redisError instanceof Error ? redisError.message : 'Unknown error');
    }
    
    // Log company creation
    await AuditLogService.createLog({
      action: `Created company: ${savedCompany.name} (License: ${savedCompany.licenseNumber})`,
      actionType: 'CREATE_PRODUCT', // Reusing CREATE_PRODUCT as there's no CREATE_COMPANY type yet
      userId: currentUser._id,
      platform: 'WEB',
      metadata: {
        companyId: savedCompany._id,
        companyName: savedCompany.name,
        licenseNumber: savedCompany.licenseNumber,
        address: savedCompany.address,
      },
      req,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Company successfully registered",
        company: savedCompany,
      });
  } catch (error) {
    console.error('Error creating company:', error);
    return next(new CustomError(500, "Failed to create company"));
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const partialUpdateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const deleteCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!CompanyValidation.parse({ id: req.params.id })) {
    return new CustomError(400, "Invalid Company ID");
  }
  try {
    const result = await CompanyRepo.delete(req.params.id);
    if (result.affected === 0) {
      return new CustomError(404, "Company not found");
    }
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    return new CustomError(500, "Failed to delete company");
  }
};
