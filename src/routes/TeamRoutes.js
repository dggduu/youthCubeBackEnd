import express from 'express';
const router = express.Router();
import { teamController } from "../controllers/teamController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.post('/api/teams', authenticateToken, teamController.createTeam); // Admin/Manager route
router.get('/api/teams', teamController.getAllTeams);
router.get('/api/teams/:id', teamController.getTeamById);
router.put('/api/teams/:id', authenticateToken, teamController.updateTeam); // Admin/Manager route
router.delete('/api/teams/:id', authenticateToken, teamController.deleteTeam); // Admin/Manager route

export default router;