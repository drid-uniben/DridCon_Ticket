import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ForbiddenError, BadRequestError } from '../utils/customErrors';
import { getScanHistoryDataForActor } from '../services/scanHistory.service';
import { UserRole } from '../model/user.model';

class ScanLogController {
  getActorScanHistoryForAdmin = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can view scan history.');
      }

      const { agentId } = req.params as { agentId?: string };
      if (!agentId) {
        throw new BadRequestError('agentId is required.');
      }

      const limitRaw = (req.query.limit as string | undefined) ?? '200';
      const limit = Math.max(1, Math.min(1000, Number(limitRaw) || 200));

      const data = await getScanHistoryDataForActor(agentId, { limit });

      res.status(200).json({
        success: true,
        data,
      });
    }
  );
}

export default new ScanLogController();
