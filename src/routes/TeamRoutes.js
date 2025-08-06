import express from 'express';
const router = express.Router();
import { teamController } from "../controllers/teamController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/teams', authenticateToken, teamController.createTeam);
router.get('/api/teams', teamController.getAllTeams);
router.get('/api/teams/:id', teamController.getTeamById);
router.put('/api/teams/:id', authenticateToken, teamController.updateTeam);
router.delete('/api/teams/:id', authenticateToken, teamController.deleteTeam);

router.post('/api/teams/:id/subteam', authenticateToken, teamController.createSubTeam);
router.delete('/api/teams/:id/subteam/:subTeamId', authenticateToken, teamController.deleteSubTeam);

export default router;