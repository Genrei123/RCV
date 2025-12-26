import { Request, Response } from 'express';
import { DB, CompanyOwnerRepo, UserRepo } from '../../typeorm/data-source';
import { CompanyOwner, CompanyOwnerValidation } from '../../typeorm/entities/companyOwner.entity';
import { ZodError } from 'zod';

export const registerCompanyOwner = async (req: Request, res: Response) => {
  try {
    const validatedData = CompanyOwnerValidation.parse(req.body);
    const companyOwnerRepository = CompanyOwnerRepo;

    const existingWallet = await companyOwnerRepository.findOne({
      where: { walletAddress: validatedData.walletAddress },
    });

    if (existingWallet) {
      return res.status(400).json({
        message: 'Wallet address already registered',
      });
    }

    const existingEmail = await companyOwnerRepository.findOne({
      where: { email: validatedData.email },
    });

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already registered',
      });
    }

    const newCompanyOwner = companyOwnerRepository.create({
      ...validatedData,
      status: 'Pending',
      approved: false,
    });

    await companyOwnerRepository.save(newCompanyOwner);

    return res.status(201).json({
      message: 'Company registration submitted for approval',
      companyOwner: {
        _id: newCompanyOwner._id,
        companyName: newCompanyOwner.companyName,
        email: newCompanyOwner.email,
        status: newCompanyOwner.status,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.issues,
      });
    }

    console.error('Error registering company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const loginCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        message: 'Valid wallet address required',
      });
    }

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { walletAddress },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    if (companyOwner.status === 'Rejected') {
      return res.status(403).json({
        message: 'Company registration has been rejected',
      });
    }

    if (companyOwner.status === 'Pending') {
      return res.status(403).json({
        message: 'Company registration is pending approval',
        status: 'Pending',
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      companyOwner: {
        _id: companyOwner._id,
        companyName: companyOwner.companyName,
        email: companyOwner.email,
        emailVerified: companyOwner.emailVerified,
        walletAddress: companyOwner.walletAddress,
        latitude: companyOwner.latitude,
        longitude: companyOwner.longitude,
        address: companyOwner.address,
        businessPermitUrl: companyOwner.businessPermitUrl,
        status: companyOwner.status,
        approved: companyOwner.approved,
      },
    });
  } catch (error) {
    console.error('Error during company owner login:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getCompanyOwnerByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { walletAddress },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    return res.status(200).json({
      companyOwner: {
        _id: companyOwner._id,
        companyName: companyOwner.companyName,
        email: companyOwner.email,
        walletAddress: companyOwner.walletAddress,
        latitude: companyOwner.latitude,
        longitude: companyOwner.longitude,
        address: companyOwner.address,
        businessPermitUrl: companyOwner.businessPermitUrl,
        status: companyOwner.status,
        approved: companyOwner.approved,
        createdAt: companyOwner.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getAllCompanyOwners = async (req: Request, res: Response) => {
  try {
    const companyOwnerRepository = CompanyOwnerRepo;
    
    const companyOwners = await companyOwnerRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return res.status(200).json({
      companyOwners,
      count: companyOwners.length,
    });
  } catch (error) {
    console.error('Error fetching company owners:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const approveCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { _id: id },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    companyOwner.status = 'Approved';
    companyOwner.approved = true;

    await companyOwnerRepository.save(companyOwner);

    return res.status(200).json({
      message: 'Company owner approved successfully',
      companyOwner,
    });
  } catch (error) {
    console.error('Error approving company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const rejectCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyOwnerRepository = CompanyOwnerRepo;

    const companyOwner = await companyOwnerRepository.findOne({
      where: { _id: id },
    });

    if (!companyOwner) {
      return res.status(404).json({
        message: 'Company owner not found',
      });
    }

    companyOwner.status = 'Rejected';
    companyOwner.approved = false;

    await companyOwnerRepository.save(companyOwner);

    return res.status(200).json({
      message: 'Company owner rejected',
      companyOwner,
    });
  } catch (error) {
    console.error('Error rejecting company owner:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const getEmployeesByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { companyOwnerId } = req.params;

    const employees = await UserRepo.find({
      where: { companyOwnerId },
      select: [
        '_id',
        'firstName',
        'lastName',
        'fullName',
        'email',
        'phoneNumber',
        'status',
        'approved',
        'role',
        'badgeId',
        'hasWebAccess',
        'hasAppAccess',
        'hasKioskAccess',
        'walletAddress',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });

    return res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateEmployeeAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { hasWebAccess, hasAppAccess, hasKioskAccess, companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify employees in your organization',
      });
    }

    // Prevent modifying super admin or admin access
    if (employee.isSuperAdmin || employee.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify access for administrators',
      });
    }

    // Update access permissions
    employee.hasWebAccess = hasWebAccess ?? employee.hasWebAccess;
    employee.hasAppAccess = hasAppAccess ?? employee.hasAppAccess;
    employee.hasKioskAccess = hasKioskAccess ?? employee.hasKioskAccess;

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee access updated successfully',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        hasWebAccess: employee.hasWebAccess,
        hasAppAccess: employee.hasAppAccess,
        hasKioskAccess: employee.hasKioskAccess,
      },
    });
  } catch (error) {
    console.error('Error updating employee access:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const approveEmployeeByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve employees in your organization',
      });
    }

    // Update employee status
    employee.approved = true;
    employee.status = 'Active';

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee approved successfully',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        status: employee.status,
        approved: employee.approved,
      },
    });
  } catch (error) {
    console.error('Error approving employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const rejectEmployeeByCompanyOwner = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { companyOwnerId } = req.body;

    // Verify the employee belongs to this company owner
    const employee = await UserRepo.findOne({
      where: { _id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.companyOwnerId !== companyOwnerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject employees in your organization',
      });
    }

    // Update employee status
    employee.approved = false;
    employee.status = 'Archived';

    await UserRepo.save(employee);

    return res.status(200).json({
      success: true,
      message: 'Employee rejected',
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        status: employee.status,
        approved: employee.approved,
      },
    });
  } catch (error) {
    console.error('Error rejecting employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
