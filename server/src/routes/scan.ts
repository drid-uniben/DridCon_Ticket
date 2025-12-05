import { Router } from "express";
import scanController from "../controllers/scan.controller";
import { authenticateWasteAgentToken, authenticateWasteUserToken } from "../middleware/auth.middleware";

const router = Router();

// Route for agent to generate a transaction (and get a QR code JWT)
router.post("/generate", authenticateWasteAgentToken, scanController.generateTransaction);

// Route for user to claim a transaction by scanning the QR code JWT
router.post("/claim", authenticateWasteUserToken, scanController.claimTransaction);

router.get(
  "/agent-history",
  authenticateWasteAgentToken,
  scanController.getAgentScanHistory
);


// Route for user to get their scan history
router.get("/history", authenticateWasteUserToken, scanController.getScanHistory);

export default router;