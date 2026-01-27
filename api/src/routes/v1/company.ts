import { Router } from "express";
import * as CompanyController from "../../controllers/company/Company";

const CompanyRouter = Router();
CompanyRouter.get('/companies', CompanyController.getAllCompanies);
CompanyRouter.get('/companies/:id', CompanyController.getCompanyById);
CompanyRouter.post('/companies', CompanyController.createCompany);
CompanyRouter.put('/companies/:id', CompanyController.updateCompany);
CompanyRouter.patch('/companies/:id', CompanyController.partialUpdateCompany);
CompanyRouter.delete('/companies/:id', CompanyController.deleteCompany);
CompanyRouter.post('/companies/:id/archive', CompanyController.archiveCompany);
CompanyRouter.post('/companies/:id/unarchive', CompanyController.unarchiveCompany);

export default CompanyRouter;