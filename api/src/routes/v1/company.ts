import { Router } from "express";
import * as CompanyController from "../../controllers/company/Company";
import { verifyUser } from "../../middleware/verifyUser";

const CompanyRouter = Router();
CompanyRouter.get('/companies', CompanyController.getAllCompanies);
CompanyRouter.get('/companies/:id', CompanyController.getCompanyById);
CompanyRouter.post('/companies', verifyUser, CompanyController.createCompany);
CompanyRouter.put('/companies/:id', CompanyController.updateCompany);
CompanyRouter.patch('/companies/:id', CompanyController.partialUpdateCompany);
CompanyRouter.delete('/companies/:id', CompanyController.deleteCompany);

export default CompanyRouter;