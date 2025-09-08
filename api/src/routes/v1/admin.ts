import { Router } from "express";
import { addProductRecord } from "../../controllers/user/Admin";

const AdminRouter = Router();

// Administrative routes lang dapat dito, but I guess if it makes sense pede natin gawing centralized lahat ng actions within the app
// Kasi pwede tayo gumawa ng middleware to check if admin or hindi help mo nalang ako mag decide
AdminRouter.post('/addProductRecord', addProductRecord);

export default AdminRouter;