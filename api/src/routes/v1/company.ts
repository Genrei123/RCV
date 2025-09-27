import { Router } from "express";
import * as CompanyController from "../../controllers/company/Company";

const CompanyRouter = Router();
CompanyRouter.get('/', CompanyController.getAllCompanies);
CompanyRouter.get('/:id', CompanyController.getCompanyById);
CompanyRouter.post('/', CompanyController.createCompany);
CompanyRouter.put('/:id', CompanyController.updateCompany);
CompanyRouter.patch('/:id', CompanyController.partialUpdateCompany);
CompanyRouter.delete('/:id', CompanyController.deleteCompany);

export default CompanyRouter;