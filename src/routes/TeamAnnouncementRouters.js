import express from 'express';
const router = express.Router();
import { teamAnnouncementController } from "../controllers/TeamAnnouncementController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/teams/:teamId/announcements', authenticateToken, teamAnnouncementController.createAnnouncement);
router.get('/api/teams/:teamId/announcements', authenticateToken, teamAnnouncementController.getTeamAnnouncements);
router.get('/api/teams/:teamId/announcements/:announcementId', authenticateToken, teamAnnouncementController.getAnnouncementById);
router.put('/api/teams/:teamId/announcements/:announcementId', authenticateToken, teamAnnouncementController.updateAnnouncement);
router.delete('/api/teams/:teamId/announcements/:announcementId', authenticateToken, teamAnnouncementController.deleteAnnouncement);
router.patch('/api/teams/:teamId/announcements/:announcementId/pin', authenticateToken, teamAnnouncementController.togglePinAnnouncement);

export default router;