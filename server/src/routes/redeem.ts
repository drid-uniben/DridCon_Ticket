import { Router } from "express";
import redeemController from "../controllers/redeem.controller";
import { authenticateWasteUserToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticateWasteUserToken, redeemController.redeemPoints);

// Route for user to get their redemption history
router.get("/history", authenticateWasteUserToken, redeemController.getRedemptionHistory);

export default router;