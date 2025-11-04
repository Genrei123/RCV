"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Admin_1 = require("../../controllers/user/Admin");
const verifyUser_1 = require("../../middleware/verifyUser");
const AdminRouter = (0, express_1.Router)();
// Administrative routes lang dapat dito, but I guess if it makes sense pede natin gawing centralized lahat ng actions within the app
// Kasi pwede tayo gumawa ng middleware to check if admin or hindi help mo nalang ako mag decide
AdminRouter.post('/addProductRecord', verifyUser_1.verifyUser, Admin_1.addProductRecord);
AdminRouter.get('/getFullBlockchain', verifyUser_1.verifyUser, Admin_1.getFullBlockchain);
exports.default = AdminRouter;
//# sourceMappingURL=admin.js.map