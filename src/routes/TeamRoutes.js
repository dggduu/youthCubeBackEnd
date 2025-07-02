import express from 'express';
const router = express.Router();
import { teamController } from "../controllers/teamController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/teams', authenticateToken, teamController.createTeam);
router.get('/api/teams', teamController.getAllTeams);
router.get('/api/teams/:id', teamController.getTeamById);
router.put('/api/teams/:id', authenticateToken, teamController.updateTeam);
router.delete('/api/teams/:id', authenticateToken, teamController.deleteTeam);

export default router;